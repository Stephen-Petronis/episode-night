// Saves which episodes have been beaten.
//
// In the browser this uses localStorage. Once the game is wrapped with
// Capacitor and the @capacitor/preferences plugin is installed, it
// switches to native storage automatically — iOS can wipe a web view's
// localStorage when the phone is low on space, and losing unlocks
// would be a very sad day.

const KEY = "episodeGame.progress.v1";

const nativePrefs = () => window.Capacitor?.Plugins?.Preferences;

async function readRaw() {
  const prefs = nativePrefs();
  if (prefs) return (await prefs.get({ key: KEY })).value;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

async function writeRaw(value) {
  const prefs = nativePrefs();
  if (prefs) return prefs.set({ key: KEY, value });
  try { localStorage.setItem(KEY, value); } catch { /* storage blocked: progress lasts until reload */ }
}

export class Progress {
  // { memory: true } keeps progress in memory only (Studio playtests).
  constructor(episodes, { memory = false } = {}) {
    this.episodes = episodes;
    this.memory = memory;
    this.beaten = new Set();
    this.endings = {};          // { ep1: ["bearWins", "birdLeaves"], ... }
  }

  async load() {
    if (this.memory) return;
    try {
      const data = JSON.parse((await readRaw()) || "{}");
      this.beaten = new Set(data.beaten || []);
      this.endings = data.endings || {};
    } catch {
      this.beaten = new Set();
      this.endings = {};
    }
  }

  async save() {
    if (this.memory) return;
    await writeRaw(JSON.stringify({ beaten: [...this.beaten], endings: this.endings }));
  }

  isBeaten(id) { return this.beaten.has(id); }

  // An episode is open if it's the first one, or the one before it is beaten.
  isUnlocked(id) {
    const i = this.episodes.findIndex(e => e.id === id);
    return i === 0 || (i > 0 && this.beaten.has(this.episodes[i - 1].id));
  }

  // The episode the player should play next (first unbeaten, unlocked one).
  get currentId() {
    const next = this.episodes.find(e => !this.beaten.has(e.id));
    return next ? next.id : null;
  }

  // Finishing an episode by ANY ending counts as beating it.
  // Returns { firstTime, newEnding }.
  async markBeaten(id, endingId) {
    const firstTime = !this.beaten.has(id);
    this.beaten.add(id);
    let newEnding = false;
    if (endingId) {
      const list = this.endings[id] || (this.endings[id] = []);
      if (!list.includes(endingId)) { list.push(endingId); newEnding = true; }
    }
    await this.save();
    return { firstTime, newEnding };
  }

  endingsFound(id) { return this.endings[id] || []; }

  async reset() {
    this.beaten.clear();
    this.endings = {};
    await this.save();
  }
}
