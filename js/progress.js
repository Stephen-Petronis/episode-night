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
  constructor(episodes) {
    this.episodes = episodes;
    this.beaten = new Set();
  }

  async load() {
    try {
      const data = JSON.parse((await readRaw()) || "{}");
      this.beaten = new Set(data.beaten || []);
    } catch {
      this.beaten = new Set();
    }
  }

  async save() {
    await writeRaw(JSON.stringify({ beaten: [...this.beaten] }));
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

  async markBeaten(id) {
    const wasNew = !this.beaten.has(id);
    this.beaten.add(id);
    await this.save();
    return wasNew;
  }

  async reset() {
    this.beaten.clear();
    await this.save();
  }
}
