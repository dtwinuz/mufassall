import { useEffect, useState } from "react";

/** `prefers-reduced-motion`, live. False on the server so the first render matches. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Ease-out tween on requestAnimationFrame. Returns a stop function. */
export function tween(from: number, to: number, ms: number, onUpdate: (v: number) => void): () => void {
  if (ms <= 0 || from === to || typeof requestAnimationFrame === "undefined") {
    onUpdate(to);
    return () => {};
  }
  let raf = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    onUpdate(from + (to - from) * (1 - (1 - t) ** 3));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
