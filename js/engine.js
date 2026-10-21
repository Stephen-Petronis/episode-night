// Engine — walks through an episode's steps in order:
//   video → video → minigame → video → ... → back to the menu.
// It doesn't touch the DOM directly; it tells the UI what to show.

export class Engine {
  constructor({ config, player, progress, games, ui }) {
    Object.assign(this, { config, player, progress, games, ui });
    this.run = null;           // the episode currently playing
  }

  // Call from inside the tap on an episode card (sound unlock needs the tap).
  start(episode, { dev = false } = {}) {
    this.player.unlock();
    const rewatch = this.progress.isBeaten(episode.id);
    const canSkip = dev || (rewatch && this.config.allowSkipWhenRewatching);
    const run = { episode, canSkip, cancelled: false, step: -1 };
    this.run = run;
    this.ui.showPlayer(episode);
    return this._play(run);
  }

  async _play(run) {
    const { steps } = run.episode;

    for (let i = 0; i < steps.length; i++) {
      if (run.cancelled) return;
      run.step = i;
      const step = steps[i];
      this.ui.setStep(run.episode, i, run.canSkip);

      if (step.type === "video") {
        // play() first (must stay synchronous on the very first step so the
        // tap still counts), then start loading the following clip.
        const done = this.player.play(step.src, { loop: !!step.loop });
        if (steps[i + 1]?.type === "video") this.player.preload(steps[i + 1].src);
        if (step.button) this.ui.showActionButton(step.button, () => this.player.done("action"));
        await done;
        this.ui.hideActionButton();
      } else if (step.type === "game") {
        this.player.unloadActive();
        const nextVideo = steps.slice(i + 1).find(s => s.type === "video");
        if (nextVideo) this.player.preload(nextVideo.src);   // ready for after the game

        const result = await this._runGame(run, step);
        if (run.cancelled) return;
        // The "Keep watching" tap gives iOS a fresh gesture for the next video.
        if (result === "won" && i < steps.length - 1) await this.ui.celebrate();
      }
    }

    if (run.cancelled) return;
    this.player.stop();
    const firstTime = await this.progress.markBeaten(run.episode.id);
    const eps = this.config.episodes;
    const next = eps[eps.indexOf(run.episode) + 1];
    await this.ui.episodeComplete(run.episode, firstTime && next ? next : null);
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
