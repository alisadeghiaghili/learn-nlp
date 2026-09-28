/** Lightweight confetti + fanfare for level completion. */

const COLORS = ["#F0B429", "#2A9D8F", "#5B8DEF", "#9B7EDE", "#E23D51", "#E6E9E4"];

export function launchConfetti(count = 48): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.createElement("div");
  root.className = "confetti-root";
  document.body.appendChild(root);
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    bit.style.left = `${Math.random() * 100}vw`;
    bit.style.background = COLORS[i % COLORS.length] ?? "#F0B429";
    bit.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
    bit.style.animationDelay = `${Math.random() * 0.4}s`;
    bit.style.width = `${5 + Math.random() * 7}px`;
    bit.style.height = `${5 + Math.random() * 7}px`;
    root.appendChild(bit);
  }
  window.setTimeout(() => root.remove(), 4200);
}

export function playFanfare(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.09;
      osc.start(t0);
      osc.stop(t0 + 0.14);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    // audio is optional
  }
}
