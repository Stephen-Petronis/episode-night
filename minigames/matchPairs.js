// Match Pairs — flip two cards at a time and find all the matches.
// params: { pairs: 3 }   (up to 8)

const FACES = ["🐟", "⭐", "🍕", "🚀", "🐸", "🌈", "🦉", "🍓"];

export default {
  name: "Match the Pairs",

  start(container, { params = {}, onWin }) {
    const pairs = Math.min(params.pairs ?? 3, FACES.length);
    const faces = shuffle(FACES.slice()).slice(0, pairs);
    const deck = shuffle([...faces, ...faces]);
    let open = [];
    let found = 0;
    let busy = false;
    const timers = [];

    const cols = deck.length <= 6 ? 3 : 4;
    const rows = Math.ceil(deck.length / cols);
    container.innerHTML = `
      <div class="mg mg-pairs">
        <div class="mg-hud"><span class="mg-title">Find the matches!</span>
          <span class="mg-count"><b>0</b> / ${pairs}</span></div>
        <div class="pairs-area">
          <div class="pairs-grid" style="--cols:${cols};--rows:${rows}"></div>
        </div>
      </div>`;
    const grid = container.querySelector(".pairs-grid");
    const countEl = container.querySelector(".mg-count b");

    deck.forEach(face => {
      const card = document.createElement("button");
      card.className = "pcard";
      card.setAttribute("aria-label", "Hidden card");
      card.innerHTML = `<span class="pcard-in"><span class="pcard-back"></span><span class="pcard-face">${face}</span></span>`;
      card.addEventListener("pointerdown", e => { e.preventDefault(); flip(card, face); });
      grid.appendChild(card);
    });

    function flip(card, face) {
      if (busy || card.classList.contains("up")) return;
      card.classList.add("up");
      card.setAttribute("aria-label", face);
      open.push({ card, face });
      if (open.length < 2) return;

      const [x, y] = open;
      open = [];
      if (x.face === y.face) {
        x.card.classList.add("matched");
        y.card.classList.add("matched");
        found++;
        countEl.textContent = found;
        if (found === pairs) timers.push(setTimeout(onWin, 600));
      } else {
        busy = true;
        timers.push(setTimeout(() => {
          for (const c of [x.card, y.card]) {
            c.classList.remove("up");
            c.setAttribute("aria-label", "Hidden card");
          }
          busy = false;
        }, 750));
      }
    }

    return () => timers.forEach(clearTimeout);
  },
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
