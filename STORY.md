# story.json format

The Studio writes this file, so you rarely need to touch it. For reference:

```json
{
  "version": 1,
  "episodes": [
    {
      "id": "ep1",                       // used for saved progress; keep it stable
      "title": "Bear vs Seagull",
      "thumb": "videos/bvs_thumb.jpg",   // menu thumbnail (4:5)
      "steps": [ ...scenes... ],         // the main path, top to bottom
      "branches": {
        "bearWins": {
          "ending": "Bear Saves the Bar", // optional: makes this branch an ending
          "steps": [ ...scenes... ]
        }
      }
    }
  ]
}
```

## Scenes

Every scene can have a `note` (shown in the Studio only).

**Clip**
```json
{ "type": "video", "src": "bvs_1.mp4" }
```

**Clip + button** (loops until tapped; with `timeLimit`, missing it is an outcome)
```json
{ "type": "video", "src": "bvs_4.mp4", "loop": true,
  "button": { "label": "PUNCH!", "appearAt": 1, "flashEvery": 2, "timeLimit": 6 },
  "onTap": "branchName", "onMiss": "birdLeaves" }
```

**Clip + see-through game** (an HTML game over the playing clip)
```json
{ "type": "video", "src": "ep2_middle.mp4", "loop": true,
  "overlay": "tap-targets.html", "params": { "count": 4, "time": 10 },
  "onWin": "...", "onLose": "...", "onMiss": "..." }
```
`onMiss` here means the clip ended (only possible when it doesn't loop).

**Minigame**
```json
{ "type": "game", "html": "bear-vs-seagull.html", "title": "Bear vs Seagull",
  "onWin": "bearWins", "onLose": "birdWins" }
{ "type": "game", "game": "popBalloons", "params": { "count": 10 } }
```

## Outcomes and branches

`onTap`, `onMiss`, `onWin`, `onLose` name a branch. That branch's scenes play
next. An outcome with no branch continues down the current path. When a path
runs out of scenes the episode ends; if that path is a branch with `ending`,
the end screen names the ending and the menu counts it.

## Writing HTML games

Full-screen minigames and see-through overlay games both report results with:

```js
parent.postMessage({ type: "minigame-complete", result: "win" }, "*");  // or "lose"
```

Overlay games must keep a transparent background and receive the clip's clock
every frame as `{ type: "video-time", t, duration, loops, paused }`. Start
from `minigames/html/overlay-template.html`.
