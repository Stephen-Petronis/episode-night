// Runs a standalone HTML minigame (its own .html file) inside the episode.
//
// Use it in config.js with:
//   { type: "game", html: "bear-vs-seagull.html" }
// The file lives in minigames/html/.
//
// The game tells us it was beaten by doing either of these on a win:
//   window.parent.postMessage({ type: "minigame-complete", result: "win" }, "*")
//   window.dispatchEvent(new CustomEvent("minigame-complete", { detail: { result: "win" } }))
// To branch the story on a loss, send result: "lose" the same way. A game
// that never sends "lose" just handles "try again" itself.

export default {
  name: "HTML minigame",

  start(container, { params = {}, onWin, onLose }) {
    const src = "minigames/html/" + params.src;
    const frame = document.createElement("iframe");
    frame.className = "html-game";
    frame.src = src;
    frame.title = params.title || "Minigame";
    frame.setAttribute("allow", "autoplay");
    container.appendChild(frame);

    let over = false;
    const win = () => { if (!over) { over = true; onWin(); } };
    const lose = () => { if (!over) { over = true; onLose?.(); } };

    const onMessage = e => {
      if (e.source !== frame.contentWindow) return;
      const d = e.data;
      if (d && d.type === "minigame-complete") {
        if (d.result === "win") win();
        else if (d.result === "lose") lose();
      }
    };
    window.addEventListener("message", onMessage);

    // Same-origin files can also be heard through their own window event.
    frame.addEventListener("load", () => {
      try {
        frame.contentWindow.addEventListener("minigame-complete", e => {
          if (e.detail?.result === "lose") lose();
          else win();
        });
        frame.contentWindow.focus();      // so keyboard controls work on desktop
      } catch { /* different origin: postMessage still works */ }
    });

    return () => {
      window.removeEventListener("message", onMessage);
      frame.src = "about:blank";          // stops its animation loop and frees memory
      frame.remove();
    };
  },
};
