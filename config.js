// =============================================================
//  config.js — everything you'd normally tweak lives here.
//  To add an episode: add an object to `episodes`. To change the
//  order of videos and games: reorder its `steps`.
// =============================================================

export const CONFIG = {
  title: "Episode Night",          // shown on the main menu

  // Where the MP4s live. Keep "videos/" while they're in the repo/app.
  // Later, point this at a CDN (e.g. "https://media.example.com/show/").
  videoBase: "videos/",

  // On an episode the player has ALREADY beaten, show "Skip" buttons
  // for videos and minigames. First playthroughs never get skip buttons.
  allowSkipWhenRewatching: true,

  // How long the "You did it!" screen waits before auto-continuing (ms).
  // 0 = always wait for a tap (safest for sound on iPhone, see README).
  winScreenAutoContinueMs: 0,

  // -----------------------------------------------------------
  //  Episodes play in this order. Each one unlocks after the
  //  previous one is beaten. `thumb` is optional.
  //
  //  Step types:
  //    { type: "video", src: "file.mp4" }
  //    { type: "game",  game: "popBalloons", params: { ... } }
  //    { type: "game",  html: "my-game.html" }   (file in minigames/html/)
  //    { type: "video", src: "file.mp4", loop: true, button: { label: "PUNCH!",
  //        appearAt: 1, flashEvery: 2 } }
  //        → clip repeats until the button is tapped, then the episode moves on
  // -----------------------------------------------------------
  episodes: [
    {
      id: "ep1",
      title: "Bear vs Seagull",
      thumb: "videos/bvs_thumb.jpg",
      steps: [
        { type: "video", src: "bvs_1.mp4" },   // Bear and Fox at the bar; the door bangs open
        { type: "video", src: "bvs_2.mp4" },   // the Seagull starts yelling
        { type: "video", src: "bvs_3.mp4" },   // Bear and Fox laugh at him
        // The Seagull close-up loops (he keeps squawking) until you hit PUNCH.
        { type: "video", src: "bvs_4.mp4", loop: true,
          button: { label: "PUNCH!", appearAt: 1, flashEvery: 2 } },
        { type: "game",  html: "bear-vs-seagull.html", title: "Bear vs Seagull" },
      ],
    },
    // Episodes 2 and 3 are still placeholders. Swap in real videos and games.
    {
      id: "ep2",
      title: "Lost and Found",
      thumb: "videos/ep2_thumb.jpg",
      steps: [
        { type: "video", src: "ep2_intro.mp4" },
        { type: "game",  game: "matchPairs", params: { pairs: 3 } },
        { type: "video", src: "ep2_middle.mp4" },
        { type: "game",  game: "popBalloons", params: { count: 10, speed: 1.4 } },
        { type: "video", src: "ep2_ending.mp4" },
      ],
    },
    {
      id: "ep3",
      title: "Night Lights",
      thumb: "videos/ep3_thumb.jpg",
      steps: [
        { type: "video", src: "ep3_intro.mp4" },
        { type: "game",  game: "matchPairs", params: { pairs: 4 } },
        { type: "video", src: "ep3_ending.mp4" },
      ],
    },
  ],
};
