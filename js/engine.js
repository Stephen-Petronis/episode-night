// Engine — walks through an episode's steps in order:
//   video → video → minigame → video → ... → back to the menu.
//
// Branching: a step can send the story down a named branch based on what
// happened, and the branch's steps play next:
//   { type: "video", ..., button: {...}, onMiss: "birdLeaves" }   // button not tapped in time
//   { type: "game",  ..., onWin: "bearWins", onLose: "birdWins" }  // minigame result
//   { type: "video", ..., overlay: "game.html", onWin, onLose, onMiss }  // see-through game over the clip
// Branches live in the episode's `branches`; one with `ending` set is an ending.
//
// It doesn't touch the DOM directly; it tells the UI what to show.

export class Engine {
  constructor({ config, player, progress, games, ui }) {
    Object.assign(this, { config, player, progress, games, ui });
    this.run = null;           // the episode currently playing
  }

  // Call from inside the tap on an episode card (sound unlock needs the tap).
  // `from: { lane, index }` starts mid-story ("main" or a branch name) — used
  // by the Studio's "Play from here".
  start(episode, { dev = false, from = null } = {}) {
    this.player.unlock();
    const rewatch = this.progress.isBeaten(episode.id);
    const canSkip = dev || (rewatch && this.config.allowSkipWhenRewatching);
    const lane = from?.lane || "main";
    const at = from?.index || 0;
    const laneSteps = lane === "main" ? episode.steps : (episode.branches?.[lane]?.steps || []);
    const br = lane === "main" ? null : episode.branches?.[lane];
    const run = {
      episode, canSkip, cancelled: false, step: -1,
      steps: laneSteps.slice(at),  // the path actually taken; grows when a branch is picked
      // where each step came from, so the Studio can highlight the scene playing
      origins: laneSteps.slice(at).map((_, k) => ({ lane, index: at + k })),
      ending: br?.ending ? { id: lane, title: br.ending } : null,
    };
    this.run = run;
    this.ui.showPlayer(episode);
    return this._play(run);
  }

  // Switch to a branch: everything after step i is replaced by the branch's steps.
  _branch(run, i, name) {
    const br = run.episode.branches?.[name];
    if (!br) { console.warn(`No branch called "${name}" in ${run.episode.id}`); return; }
    run.steps = run.steps.slice(0, i + 1).concat(br.steps || []);
    run.origins = run.origins.slice(0, i + 1).concat((br.steps || []).map((_, k) => ({ lane: name, index: k })));
    if (br.ending) run.ending = { id: name, title: br.ending };
  }

  async _play(run) {
    for (let i = 0; i < run.steps.length; i++) {
      if (run.cancelled) return;
      run.step = i;
      const steps = run.steps;
      const step = steps[i];
      this.ui.setStep(run.episode, steps, i, run.canSkip);
      this.onStep?.(run.episode, run.origins[i]);

      if (step.type === "video") {
        // play() first (must stay synchronous on the very first step so the
        // tap still counts), then start loading the following clip.
        const done = this.player.play(step.src, { loop: !!step.loop });
        if (steps[i + 1]?.type === "video") this.player.preload(steps[i + 1].src);
        if (step.button) {
          this.ui.showActionButton(step.button, {
            onTap: () => this.player.done("action"),
            onTimeout: () => this.player.done("miss"),
          });
        }
        // See-through game layered over the playing clip.
        if (step.overlay) {
          this.ui.showOverlayGame(step, {
            onWin: () => this.player.done("win"),
            onLose: () => this.player.done("lose"),
          });
        }
        const result = await done;
        this.ui.hideActionButton();
        this.ui.hideOverlayGame();
        if (run.cancelled) return;
        const missed = result === "miss" || (result === "ended" && step.overlay);
        if (missed && step.onMiss) this._branch(run, i, step.onMiss);
        else if (result === "action" && step.onTap) this._branch(run, i, step.onTap);
        else if (result === "win" && step.onWin) this._branch(run, i, step.onWin);
        else if (result === "lose" && step.onLose) this._branch(run, i, step.onLose);
      } else if (step.type === "game") {
        this.player.unloadActive();
        // Preload whichever video is most likely next (the win path).
        const winSteps = step.onWin ? run.episode.branches?.[step.onWin]?.steps : steps.slice(i + 1);
        const nextVideo = (winSteps || []).find(s => s.type === "video");
        if (nextVideo) this.player.preload(nextVideo.src);

        const result = await this._runGame(run, step);
        if (run.cancelled) return;
        const won = result === "won" || result === "skipped";
        if (won && step.onWin) this._branch(run, i, step.onWin);
        if (result === "lost" && step.onLose) this._branch(run, i, step.onLose);
        // Built-in games get a "You did it!" panel (also gives iOS a fresh tap
        // for the next video). HTML games show their own end screen.
        if (result === "won" && !step.html && i < run.steps.length - 1) await this.ui.celebrate();
      }
    }

    if (run.cancelled) return;
    this.player.stop();
    const { firstTime } = await this.progress.markBeaten(run.episode.id, run.ending?.id);
    const eps = this.config.episodes;
    const next = eps[eps.indexOf(run.episode) + 1];
    await this.ui.episodeComplete(run.episode, {
      unlockedNext: firstTime && next ? next : null,
      ending: run.ending,
    });
    if (this.run === run) this.run = null;
    this.ui.showMenu();
  }

  _runGame(run, step) {
    return new Promise(resolve => {
      const game = step.html ? this.games.html : this.games[step.game];
      const params = step.html ? { src: step.html, title: step.title, ...step.params } : (step.params || {});
      const layer = this.ui.gameLayer;
      let cleanup = null;
      layer.hidden = false;
      layer.innerHTML = "";

      const finish = result => {
        if (run.finishGame !== finish) return;   // already finished
        run.finishGame = null;
        try { cleanup?.(); } catch (e) { console.error(e); }
        layer.innerHTML = "";
        layer.hidden = true;
        resolve(result);
      };
      run.finishGame = finish;

      if (!game) {
        this.ui.showError(`There's no minigame called "${step.game}". Check minigames/index.js.`);
        return;                                  // player can Skip or go Home
      }
      cleanup = game.start(layer, {
        params,
        onWin: () => finish("won"),
        onLose: () => finish("lost"),
      });
    });
  }

  // "Skip" button: jump past the current video or minigame.
  skip() {
    const run = this.run;
    if (!run) return;
    if (run.finishGame) run.finishGame("skipped");
    else this.player.skip();
  }

  // "Home" button: abandon the episode (progress isn't changed).
  exit() {
    const run = this.run;
    if (!run) return;
    run.cancelled = true;
    if (run.finishGame) run.finishGame("stopped");
    this.player.stop();
    this.run = null;
    this.ui.showMenu();
  }
}
