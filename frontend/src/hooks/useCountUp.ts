import { useEffect, useState } from "react";

export type CountUpEasing = "easeOutCubic" | "easeInOut";

/** Counts to a data-backed value with selectable easing. */
export function useCountUp(value: number, active: boolean, duration: number, decimals = 0, delay = 0, easing: CountUpEasing = "easeOutCubic") {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || duration <= 0) {
      setCurrent(value);
      return;
    }

    let frame = 0;
    let startTime: number | undefined;
    const tick = (now: number) => {
      startTime ??= now + delay;
      const progress = Math.min(1, Math.max(0, (now - startTime) / duration));
      const eased = easing === "easeInOut"
        ? progress * progress * (3 - 2 * progress)
        : 1 - Math.pow(1 - progress, 3);
      setCurrent(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setCurrent(value);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, delay, duration, easing, value]);

  return Number((active ? current : 0).toFixed(decimals));
}
