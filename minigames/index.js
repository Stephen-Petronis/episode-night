// Every minigame is registered here by the name used in config.js.
//
// A minigame is an object with:
//   name:  shown in the "Skip" button and error messages
//   start(container, { params, onWin })
//          Build your game inside `container`. Call onWin() when the
//          player beats it. Return a cleanup function that stops timers,
//          animation loops and sounds (called when the game ends OR the
//          player leaves to the menu).
//
// To add one: copy popBalloons.js, change it, import it below.
//
// Or build the minigame as its own standalone .html file, put it in
// minigames/html/, and use { type: "game", html: "my-game.html" } in
// config.js. See htmlGame.js for the one line it needs to send on a win.

import popBalloons from "./popBalloons.js";
import matchPairs from "./matchPairs.js";
import htmlGame from "./htmlGame.js";

export const MINIGAMES = {
  popBalloons,
  matchPairs,
  html: htmlGame,   // used by steps like { type: "game", html: "file.html" }
};
