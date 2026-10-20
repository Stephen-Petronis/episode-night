import { CONFIG } from "../config.js";
import { MINIGAMES } from "../minigames/index.js";
import { Progress } from "./progress.js";
import { VideoPlayer } from "./player.js";
import { Engine } from "./engine.js";
import { UI } from "./ui.js";

// Dev mode (add #dev to the URL): skip buttons everywhere + "Unlock all".
const dev = location.hash === "#dev" || new URLSearchParams(location.search).has("dev");

const progress = new Progress(CONFIG.episodes);
await progress.load();

const ui = new UI({ config: CONFIG, progress, dev });
const player = new VideoPlayer(document.querySelector("#stage"), {
  base: CONFIG.videoBase,
  unlockSrc: CONFIG.videoBase + "_unlock.mp4",
});
const engine = new Engine({ config: CONFIG, player, progress, games: MINIGAMES, ui });
ui.attach(engine, player);
ui.showMenu();

// Handy in the browser console while testing.
window.game = { engine, progress, player, config: CONFIG };
