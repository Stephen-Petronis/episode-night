// UI — the menu, the on-screen buttons while playing, and pop-up panels.

const ICON = {
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" fill="currentColor"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10zm2.5 0h5V8a2.5 2.5 0 0 0-5 0z" fill="currentColor"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>`,
  skip: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5v11l8-5.5zm8 0v11l8-5.5z" fill="currentColor"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor"/></svg>`,
};

const $ = sel => document.querySelector(sel);

export class UI {
  constructor({ config, progress, dev }) {
    this.config = config;
    this.progress = progress;
    this.dev = dev;
    this.engine = null;     // set by main.js
    this.player = null;     // set by main.js

    this.menu = $("#menu");
    this.playerScreen = $("#player");
    this.list = $("#episode-list");
    this.stage = $("#stage");
    this.gameLayer = $("#game-layer");
    this.tapCatcher = $("#tap-catcher");
    this.hud = $("#hud");
    this.track = $("#step-track");
    this.skipBtn = $("#skip-btn");
    this.bigPlay = $("#big-play");
    this.overlay = $("#overlay");
    this.toastEl = $("#toast");
    this.mode = "menu";

    $("#game-title").textContent = config.title;
    document.title = config.title;
    $("#home-btn").innerHTML = ICON.home;
    this.bigPlay.innerHTML = ICON.play;
    this.skipBtn.innerHTML = `<span>Skip</span>${ICON.skip}`;

    this._wire();
  }

  attach(engine, player) {
    this.engine = engine;
    this.player = player;
    player.onStateChange = playing => this._onPlayState(playing);
    player.onBlocked = () => this._onPlayState(false);
    player.onError = src => this.showError(
      `Couldn't load ${src.split("/").pop()}. Check the file name in config.js and that the file is in the videos folder.`);
  }

  _wire() {
    $("#home-btn").addEventListener("click", () => this._confirmHome());
    this.skipBtn.addEventListener("click", () => this.engine.skip());
    this.bigPlay.addEventListener("click", () => this.player.resume());
    this.tapCatcher.addEventListener("click", () => {
      if (this.player.paused) this.player.resume();
      else this.player.pause();
    });
    $("#reset-btn").addEventListener("click", async () => {
      const ok = await this.modal({
        title: "Start over?",
        body: "This locks every episode again except the first one.",
        buttons: [{ label: "Cancel", value: false }, { label: "Reset", value: true, primary: true, danger: true }],
      });
      if (ok) { await this.progress.reset(); this.renderMenu(); this.toast("Progress reset"); }
    });
    const unlockAll = $("#unlock-all-btn");
    unlockAll.hidden = !this.dev;
    unlockAll.addEventListener("click", async () => {
      for (const ep of this.config.episodes) this.progress.beaten.add(ep.id);
      await this.progress.save();
      this.renderMenu();
    });

    // Pause when the app goes to the background (phone locked, app switched).
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "video") this.player.pause();
    });
  }

  // ---------- Menu ----------

  showMenu() {
    this.mode = "menu";
    this._closeModal();
    this.playerScreen.hidden = true;
    this.menu.hidden = false;
    this.renderMenu();
  }

  renderMenu() {
    const { episodes } = this.config;
    const currentId = this.progress.currentId;
    this.list.innerHTML = "";

    episodes.forEach((ep, i) => {
      const beaten = this.progress.isBeaten(ep.id);
      const unlocked = this.progress.isUnlocked(ep.id);
      const isCurrent = ep.id === currentId;
      const state = beaten ? "beaten" : unlocked ? "current" : "locked";
      const videos = ep.steps.filter(s => s.type === "video").length;
      const games = ep.steps.length - videos;

      const card = document.createElement("button");
      card.className = `ep-card is-${state}`;
      card.style.setProperty("--hue", (i * 47 + 210) % 360);
      card.setAttribute("aria-label",
        `Episode ${i + 1}, ${ep.title}, ${beaten ? "watched" : unlocked ? "up next" : "locked"}`);
      card.innerHTML = `
        <span class="ep-thumb">
          ${ep.thumb ? `<img src="${ep.thumb}" alt="" loading="lazy">` : ""}
          <span class="ep-num">${i + 1}</span>
          ${state === "locked" ? `<span class="ep-lock">${ICON.lock}</span>` : ""}
          ${state === "current" ? `<span class="ep-play">${ICON.play}</span>` : ""}
        </span>
        <span class="ep-meta">
          <span class="ep-label">Episode ${i + 1}</span>
          <span class="ep-title">${escapeHtml(ep.title)}</span>
          <span class="ep-status">${
            beaten ? `${ICON.check}<span>Watched · tap to watch again</span>`
            : isCurrent ? `<span class="chip">Up next</span>`
            : `<span>Finish Episode ${i} to unlock</span>`
          }</span>
          <span class="ep-steps">${videos} ${videos === 1 ? "video" : "videos"} · ${games} ${games === 1 ? "game" : "games"}</span>
        </span>`;
      card.querySelector("img")?.addEventListener("error", e => e.target.remove());

      card.addEventListener("click", () => {
        if (!unlocked) {
          card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
          this.toast(`Finish Episode ${i} first`);
          return;
        }
        this.engine.start(ep, { dev: this.dev });   // must run inside this tap
      });
      this.list.appendChild(card);
    });
  }

  // ---------- Playing ----------

  showPlayer(ep) {
    this.menu.hidden = true;
    this.playerScreen.hidden = false;
    this.gameLayer.hidden = true;
    this.toastEl.classList.remove("show");
    this._closeModal();
  }

  setStep(ep, index, canSkip) {
    const step = ep.steps[index];
    this.mode = step.type === "video" ? "video" : "game";
    this.playerScreen.dataset.mode = this.mode;
    this.tapCatcher.hidden = this.mode !== "video";
    this.bigPlay.hidden = true;
    this.skipBtn.hidden = !canSkip;
    this._canSkip = canSkip;

    this.track.innerHTML = ep.steps.map((s, i) => {
      const st = i < index ? "done" : i === index ? "now" : "todo";
      return s.type === "game"
        ? `<span class="trk trk-game ${st}">${ICON.star}</span>`
        : `<span class="trk trk-video ${st}"></span>`;
    }).join("");
    this.track.setAttribute("aria-label", `Part ${index + 1} of ${ep.steps.length}`);

    this._showHud(this.mode === "video" ? 2500 : 0);
  }

  _onPlayState(playing) {
    if (this.mode !== "video") return;
    this.bigPlay.hidden = playing;
    this._showHud(playing ? 2000 : 0);
  }

  // Show the top bar; during a playing video it fades out again.
  _showHud(hideAfterMs) {
    clearTimeout(this._hudTimer);
    this.hud.classList.remove("faded");
    if (hideAfterMs) {
      this._hudTimer = setTimeout(() => {
        if (this.mode === "video" && !this.player.paused) this.hud.classList.add("faded");
      }, hideAfterMs);
    }
  }

  async _confirmHome() {
    const wasPlaying = this.mode === "video" && !this.player.paused;
    if (wasPlaying) this.player.pause();
    const leave = await this.modal({
      title: "Go back to the episodes?",
      body: "You'll start this episode from the beginning next time.",
      buttons: [{ label: "Keep playing", value: false }, { label: "Back to episodes", value: true, primary: true }],
    });
    if (leave) this.engine.exit();
    else if (wasPlaying) this.player.resume();
  }

  // "You did it!" after a minigame. Resolves when the player taps on.
  celebrate() {
    const ms = this.config.winScreenAutoContinueMs;
    return this.modal({
      kind: "win",
      art: `<div class="burst">${ICON.star}</div>`,
      title: "You did it!",
      buttons: [{ label: `Keep watching`, icon: ICON.play, value: true, primary: true }],
      autoMs: ms > 0 ? ms : 0,
    });
  }

  episodeComplete(ep, unlockedNext) {
    const n = this.config.episodes.indexOf(ep) + 1;
    return this.modal({
      kind: "win",
      art: `<div class="burst">${ICON.star}</div>`,
      eyebrow: `Episode ${n}`,
      title: "Episode complete!",
      body: unlockedNext
        ? `Episode ${n + 1}, “${escapeHtml(unlockedNext.title)},” is unlocked.`
        : "",
      buttons: [{ label: "Back to episodes", value: true, primary: true }],
    });
  }

  async showError(message) {
    if (this.mode === "video") this.player.pause();
    const choice = await this.modal({
      title: "Something's missing",
      body: escapeHtml(message),
      buttons: [{ label: "Back to episodes", value: "home" }, { label: "Skip this part", value: "skip", primary: true }],
    });
    if (choice === "skip") this.engine.skip();
    else this.engine.exit();
  }

  // ---------- Pop-up panel ----------

  modal({ kind = "", art = "", eyebrow = "", title, body = "", buttons, autoMs = 0 }) {
    this._closeModal();
    return new Promise(resolve => {
      this.overlay.className = `overlay ${kind ? "overlay-" + kind : ""}`;
      this.overlay.innerHTML = `
        <div class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
          ${art}
          ${eyebrow ? `<p class="panel-eyebrow">${eyebrow}</p>` : ""}
          <h2 id="panel-title">${title}</h2>
          ${body ? `<p class="panel-body">${body}</p>` : ""}
          <div class="panel-actions"></div>
        </div>`;
      const actions = this.overlay.querySelector(".panel-actions");
      const done = value => { this._modalResolve = null; this._closeModal(); resolve(value); };
      this._modalResolve = () => resolve(undefined);
      for (const b of buttons) {
        const btn = document.createElement("button");
        btn.className = `btn ${b.primary ? "btn-primary" : "btn-quiet"} ${b.danger ? "btn-danger" : ""}`;
        btn.innerHTML = `${b.icon || ""}<span>${b.label}</span>`;
        btn.addEventListener("click", () => done(b.value));
        actions.appendChild(btn);
      }
      this.overlay.hidden = false;
      actions.querySelector(".btn-primary")?.focus({ preventScroll: true });
      if (autoMs) this._modalTimer = setTimeout(() => done(buttons[0].value), autoMs);
    });
  }

  _closeModal() {
    clearTimeout(this._modalTimer);
    this.overlay.hidden = true;
    this.overlay.innerHTML = "";
    const r = this._modalResolve;
    this._modalResolve = null;
    // A modal replaced by another one (e.g. leaving mid-celebration) settles quietly.
    if (r) r();
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), 2000);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
