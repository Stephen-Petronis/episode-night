import { CONFIG } from "../config.js";
import { MINIGAMES } from "../minigames/index.js";
import { Progress } from "./progress.js";
import { VideoPlayer } from "./player.js";
import { Engine } from "./engine.js";
import { UI } from "./ui.js";

// Dev mode (add #dev to the URL): skip buttons everywhere + "Unlock all".
// Studio mode (#studio): the game runs inside the Studio's playtest panel.
const studio = location.hash === "#studio";
const dev = studio || location.hash === "#dev" || new URLSearchParams(location.search).has("dev");

async function loadStory() {
  try {
    const res = await fetch(CONFIG.storyFile, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.error(`Couldn't load ${CONFIG.storyFile}`, e);
    return { episodes: [] };
  }
}

const story = await loadStory();
CONFIG.episodes = story.episodes || [];

const progress = new Progress(CONFIG.episodes, { memory: studio });
await progress.load();

const ui = new UI({ config: CONFIG, progress, dev });
const player = new VideoPlayer(document.querySelector("#stage"), {
  base: CONFIG.videoBase,
  unlockSrc: CONFIG.videoBase + "_unlock.mp4",
});
const engine = new Engine({ config: CONFIG, player, progress, games: MINIGAMES, ui });
ui.attach(engine, player);
ui.showMenu();

// ---------- Studio link ----------
// The Studio sends the story it's editing (saved or not) and asks to play
// from a scene; the game reports which scene is on screen.
if (studio) {
  const studioWin = window.parent;
  const useStory = (s, bust) => {
    CONFIG.episodes = s.episodes || [];
    progress.episodes = CONFIG.episodes;
    player.query = bust ? `?v=${bust}` : "";
  };
  engine.onStep = (ep, origin) => studioWin.postMessage({ type: "studio:step", episodeId: ep.id, ...origin }, "*");
  window.addEventListener("message", e => {
    if (e.source !== studioWin) return;
    const d = e.data || {};
    if (d.type === "studio:story") {
      useStory(d.story, d.bust);
      if (!engine.run) ui.showMenu();
    }
    if (d.type === "studio:play") {
      useStory(d.story, d.bust);
      engine.exit();
      const ep = CONFIG.episodes.find(x => x.id === d.episodeId);
      if (ep) engine.start(ep, { dev: true, from: d.from });
    }
    if (d.type === "studio:menu") { engine.exit(); ui.showMenu(); }
  });
  studioWin.postMessage({ type: "studio:ready" }, "*");
}

// Handy in the browser console while testing.
window.game = { engine, progress, player, config: CONFIG };
