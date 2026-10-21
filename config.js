// =============================================================
//  config.js — game-wide settings.
//
//  The story itself (episodes, scenes, branches, endings) lives in
//  story.json. Edit it with the Studio (studio.html) rather than by hand.
//  STORY.md explains the format if you ever do want to hand-edit.
// =============================================================

export const CONFIG = {
  title: "Episode Night",          // shown on the main menu

  // The story file the game loads at startup.
  storyFile: "story.json",

  // Where the MP4s live. Keep "videos/" while they're in the repo/app.
  // Later, point this at a CDN (e.g. "https://media.example.com/show/").
  videoBase: "videos/",

  // Where standalone HTML minigames and overlay games live.
  htmlGameBase: "minigames/html/",

  // On an episode the player has ALREADY beaten, show "Skip" buttons
  // for videos and minigames. First playthroughs never get skip buttons.
  allowSkipWhenRewatching: true,

  // How long the "You did it!" screen waits before auto-continuing (ms).
  // 0 = always wait for a tap (safest for sound on iPhone, see README).
  winScreenAutoContinueMs: 0,

  // Filled in from story.json when the game starts.
  episodes: [],
};
