# Episode Night (working title)

Videos play back to back, then a minigame, then more videos, then back to the
episode menu. Episodes unlock one at a time; beaten episodes can be rewatched.

Built for one-handed portrait play. Videos are 4:5 and play in a framed
"screen" with a top bar that stays put and play/pause controls under the
thumb, so the videos feel like part of the game. Minigames take over the
whole area under the top bar.

Plain HTML/JS, no build step. Runs on GitHub Pages now, and can be wrapped
with Capacitor for the App Store later.

## Run it

ES modules need a web server (opening the file directly won't work):

```
cd episode-game
python3 -m http.server 8000
```

Open http://localhost:8000. On your iPhone, use your computer's local IP
(same Wi-Fi), or push to GitHub Pages.

Add `#dev` to the URL for test mode: skip buttons everywhere and an
"Unlock all" button on the menu. `window.game` in the console gives you the
engine, progress and player.

## Files

| File | What it's for |
|---|---|
| `config.js` | **Episodes, step order, titles, settings. Start here.** |
| `minigames/` | One file per minigame, registered in `minigames/index.js` |
| `videos/` | MP4s and thumbnails (`_unlock.mp4` is required, keep it) |
| `js/player.js` | Two-`<video>` player: preloading, gapless swaps, iPhone sound unlock |
| `js/engine.js` | Walks an episode's steps in order |
| `js/progress.js` | Saves which episodes are beaten |
| `js/ui.js` | Menu, top bar, pop-up panels |
| `tools/encode.sh` | Converts your real videos to iPhone-friendly MP4s |
| `tools/make-placeholders.sh` | Regenerates the test clips |

## Adding your videos

**Shape: 4:5 portrait.** Film vertical on the phone (9:16 is fine) and keep
the action in the middle; the encode script trims the top and bottom to 4:5.
Keep text and faces away from the edges.

1. Encode each clip: `./tools/encode.sh raw/intro.mov videos/ep1_intro.mp4`
   (720×900 by default; `WIDTH=1080` for 1080×1350)
2. Clips that always play back to back can be joined into one file so there's
   zero gap: `./tools/encode.sh --join videos/ep1_intro.mp4 raw/a.mov raw/b.mov`
   (every input needs an audio track).
3. Thumbnail: `ffmpeg -ss 2 -i videos/ep1_intro.mp4 -frames:v 1 -vf scale=256:320 videos/ep1_thumb.jpg`
4. List the files in `config.js`.

Sizes to expect at 720×900, CRF 23: roughly 5–15 MB per minute. Flat cartoon
art compresses better; try `CRF=26`.

## Branching and endings

Episode 1 shows the pattern. Steps can send the story down a named branch:

- `onMiss` / `onTap` on a video with a button (e.g. PUNCH! with `timeLimit`)
- `onWin` / `onLose` on a minigame

Branches live in the episode's `branches`. Give one `ending: "Name"` and it
counts as an ending; the menu shows "1 of 3 endings found". Any ending
completes the episode and unlocks the next one.

## Adding a minigame

**Standalone HTML games (easiest):** put the file in `minigames/html/` and
add `{ type: "game", html: "my-game.html" }` to an episode. When the player
wins, the game sends one message:

```js
window.parent.postMessage({ type: "minigame-complete", result: "win" }, "*");
```

On a loss it sends nothing and offers "try again" itself. Episode 1's
`bear-vs-seagull.html` works this way.

**Built-in JS games:**

Design for one thumb: keep the things you tap in the bottom two-thirds.

Copy `minigames/popBalloons.js`, change it, and add it to `minigames/index.js`.
The contract:

```js
export default {
  name: "My Game",
  start(container, { params, onWin }) {
    // build inside `container`, call onWin() when beaten
    return () => { /* stop timers, loops, sounds */ };
  },
};
```

Then use it in an episode: `{ type: "game", game: "myGame", params: { level: 2 } }`.
The same minigame can appear in several episodes with different `params`.

## iPhone notes (why the code is shaped this way)

- **Sound needs a tap.** Tapping an episode card plays the first clip and
  "unlocks" both video elements in that same tap. The "Keep watching" button
  after each minigame is another tap, which keeps iOS happy. If iOS still
  blocks playback (it can after the app was backgrounded), a big play button
  appears.
- **Gapless playback.** While one clip plays, the next loads in a hidden
  second `<video>`. During a minigame, the clip after it is loading.
- **Memory.** The finished clip's source is released when it's swapped out
  and while a minigame is running.
- **Backgrounding.** Video pauses when the app goes to the background.
- **Progress storage.** Uses localStorage in the browser. Once wrapped with
  Capacitor, install `@capacitor/preferences` and it switches over on its own
  (iOS can clear web storage when the phone is low on space).

## Hosting the videos

- **Now:** in the repo on GitHub Pages. Fine for testing; Pages has a ~1 GB
  site limit and 100 MB per file.
- **Later:** set `videoBase` in `config.js` to a CDN folder (Cloudflare R2,
  Bunny). Nothing else changes.
- **App Store:** bundle episode 1 in the app; stream or download the rest.

## Wrapping for iPhone (later)

Move the game files (everything except `tools/` and this README) into a
`www/` folder first, so Capacitor doesn't copy `node_modules` into the app.

```
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/preferences
npx cap init "Episode Night" com.yourname.episodenight --web-dir www
npx cap add ios
npx cap open ios
```

In Xcode, lock orientation to portrait. Also download
the Baloo 2 font into the project instead of loading it from Google Fonts, so
it works offline (it falls back to the iPhone's rounded system font anyway).
