// VideoPlayer — plays MP4s back to back with as little gap as possible.
//
// How it works:
//  * Two <video> elements are stacked on top of each other. While one
//    plays, the other quietly loads the NEXT clip. When the current clip
//    ends we just flip which one is visible, so there's no loading pause.
//  * iPhone only allows video WITH SOUND to start from a tap. The first
//    tap on "Play" calls unlock(), which starts both elements once inside
//    that tap. After that, iOS lets them play on their own.
//  * If iOS still refuses (it sometimes does after the app was in the
//    background), onBlocked() fires and the UI shows a big "tap to play"
//    button. Tapping it calls resume().

export class VideoPlayer {
  constructor(stage, { base = "", unlockSrc } = {}) {
    this.base = base;
    this.unlockSrc = unlockSrc;
    this.a = this._make(stage);
    this.b = this._make(stage);
    this.active = this.a;
    this.standby = this.b;
    this._pending = null;   // { resolve } for the clip that's playing now

    // Hooks the UI fills in.
    this.onBlocked = () => {};
    this.onError = () => {};
    this.onStateChange = () => {};
    this.onTime = () => {};
  }

  _make(stage) {
    const v = document.createElement("video");
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("disablepictureinpicture", "");
    v.setAttribute("x-webkit-airplay", "deny");
    v.preload = "auto";
    v.controls = false;
    v.className = "clip";

    v.addEventListener("ended", () => {
      if (v === this.active) this._finish("ended");
    });
    v.addEventListener("error", () => {
      if (v === this.active && this._pending) this.onError(v.dataset.src || "");
    });
    v.addEventListener("timeupdate", () => {
      if (v === this.active && this._pending) this.onTime(v.currentTime, v.duration);
    });
    v.addEventListener("play", () => v === this.active && this.onStateChange(true));
    v.addEventListener("pause", () => v === this.active && this.onStateChange(false));

    stage.appendChild(v);
    return v;
  }

  // `query` lets the Studio force fresh copies after a clip file is replaced.
  url(src) { return /^(https?:|blob:|data:)/.test(src) ? src : this.base + src + (this.query || ""); }

  // Call from inside a tap handler, before anything async happens.
  unlock() {
    for (const v of [this.a, this.b]) {
      if (v.dataset.src) continue;          // already has a real clip
      if (!this.unlockSrc) continue;
      v.src = this.unlockSrc;
      v.play().then(() => v.pause()).catch(() => {});
    }
  }

  // Plays a clip. Resolves "ended", "skipped", "action" or "stopped".
  // { loop: true } repeats the clip until done("action") or skip() is called.
  play(src, { loop = false } = {}) {
    this._finish("stopped");                // settle anything still waiting
    const url = this.url(src);

    if (this.standby.dataset.src === url) {
      [this.active, this.standby] = [this.standby, this.active];
    } else if (this.active.dataset.src !== url) {
      this._load(this.active, url);
    }

    // Show the active clip, put the other one away.
    this.active.classList.add("show");
    this.standby.classList.remove("show");
    this.standby.pause();
    if (this.standby.dataset.src !== this._preloaded) this._clear(this.standby);

    this.active.loop = loop;
    const done = new Promise(resolve => { this._pending = { resolve }; });
    this._tryPlay();
    return done;
  }

  _tryPlay() {
    const p = this.active.play();
    if (p && p.catch) {
      p.catch(err => {
        if (err && err.name === "NotAllowedError") this.onBlocked();
        // AbortError just means a newer play()/load() replaced this one.
      });
    }
  }

  // Start loading a clip in the hidden element so it's ready instantly.
  preload(src) {
    const url = this.url(src);
    this._preloaded = url;
    if (this.active.dataset.src === url) return;
    if (this.standby.dataset.src === url) return;
    this._load(this.standby, url);
  }

  resume() { if (this._pending) this._tryPlay(); }
  pause() { this.active.pause(); }
  get paused() { return this.active.paused; }
  get isPlaying() { return !!this._pending; }

  skip() { this._finish("skipped"); }

  // End the current clip because the player did something (e.g. hit PUNCH).
  done(result = "action") { this._finish(result); }

  // Free the visible clip's memory (used while a minigame is on screen).
  // The preloaded next clip is kept.
  unloadActive() {
    this._finish("stopped");
    this.active.classList.remove("show");
    this._clear(this.active);
  }

  // Stop everything and free both clips.
  stop() {
    this._finish("stopped");
    this._preloaded = null;
    for (const v of [this.a, this.b]) { v.classList.remove("show"); this._clear(v); }
  }

  _load(v, url) {
    v.loop = false;
    v.dataset.src = url;
    v.src = url;
    v.load();
  }

  _clear(v) {
    v.pause();
    delete v.dataset.src;
    v.removeAttribute("src");
    v.load();                               // releases the decoder + buffer
  }

  _finish(result) {
    const p = this._pending;
    this._pending = null;
    if (p) { this.active.pause(); this.active.loop = false; p.resolve(result); }
  }
}
