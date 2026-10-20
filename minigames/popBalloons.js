// Pop Balloons — tap the balloons as they float up. Pop them all to win.
// params: { count: 6, speed: 1 }

const COLORS = ["#ff5c7a", "#ffb020", "#3ec7ff", "#7be36b", "#b98cff", "#ff8a3d"];

export default {
  name: "Pop the Balloons",

  start(container, { params = {}, onWin }) {
    const total = params.count ?? 6;
    const speed = params.speed ?? 1;
    let popped = 0;
    let running = true;

    container.innerHTML = `
      <div class="mg mg-balloons">
        <div class="mg-hud"><span class="mg-title">Pop the balloons!</span>
          <span class="mg-count"><b>0</b> / ${total}</span></div>
        <div class="mg-sky"></div>
      </div>`;
    const sky = container.querySelector(".mg-sky");
    const countEl = container.querySelector(".mg-count b");

    const balloons = [];
    const spawn = (i, startBelow = true) => {
      const el = document.createElement("button");
      el.className = "balloon";
      el.setAttribute("aria-label", "Balloon");
      el.style.setProperty("--c", COLORS[i % COLORS.length]);
      sky.appendChild(el);
      const b = {
        el,
        x: 8 + Math.random() * 84,                       // % across
        y: startBelow ? 100 + Math.random() * 60 : Math.random() * 90,
        v: (6 + Math.random() * 5) * speed,              // % of height per second
        wobble: Math.random() * Math.PI * 2,
        alive: true,
      };
      el.addEventListener("pointerdown", e => { e.preventDefault(); pop(b); });
      balloons.push(b);
    };

    const pop = b => {
      if (!b.alive || !running) return;
      b.alive = false;
      b.el.classList.add("popped");
      setTimeout(() => b.el.remove(), 300);
      popped++;
      countEl.textContent = popped;
      if (popped >= total) {
        running = false;
        setTimeout(onWin, 450);
      }
    };

    // Keep a few on screen at once, never more than are left to pop.
    for (let i = 0; i < total; i++) spawn(i, i >= 3);

    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const b of balloons) {
        if (!b.alive) continue;
        b.y -= b.v * dt;
        b.wobble += dt * 2;
        if (b.y < -20) { b.y = 105 + Math.random() * 20; b.x = 8 + Math.random() * 84; }
        b.el.style.transform =
          `translate(${b.x}cqw, ${b.y}cqh) translate(-50%, 0) rotate(${Math.sin(b.wobble) * 6}deg)`;
      }
      if (running) raf = requestAnimationFrame(tick);
    });

    // Cleanup: called when the game ends or the player leaves.
    return () => { running = false; cancelAnimationFrame(raf); };
  },
};
