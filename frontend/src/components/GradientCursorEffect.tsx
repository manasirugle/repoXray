"use client";

import { useEffect, useRef } from "react";

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;

export default function GradientCursorEffect() {
  const frameRef = useRef<number | null>(null);
  const targetX = useRef(20);
  const targetY = useRef(20);
  const currentX = useRef(20);
  const currentY = useRef(20);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Disable on touch devices
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!pointerQuery.matches) return;

    // Disable cursor animation for users who prefer reduced motion
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotionQuery.matches) return;

    const root = document.documentElement;

    const setGradientPosition = (x: number, y: number) => {
      root.style.setProperty("--bg-accent-x", `${x.toFixed(2)}%`);
      root.style.setProperty("--bg-accent-y", `${y.toFixed(2)}%`);
      root.style.setProperty("--bg-secondary-x", `${(100 - x * 0.6).toFixed(2)}%`);
      root.style.setProperty("--bg-secondary-y", `${(100 - y * 0.6).toFixed(2)}%`);
    };

    const isTablet = window.matchMedia("(hover: hover) and (pointer: fine) and (max-width: 1024px)").matches;
    const maxOffsetX = isTablet ? 84 : 90;
    const maxOffsetY = isTablet ? 80 : 85;
    const minOffset = isTablet ? 8 : 5;
    const lerpAmount = isTablet ? 0.03 : 0.05;

    const handlePointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * maxOffsetX + minOffset;
      const y = (event.clientY / window.innerHeight) * maxOffsetY + minOffset;
      targetX.current = x;
      targetY.current = y;
    };

    const animate = () => {
      // Smooth interpolation with a softer drift on tablet
      currentX.current = lerp(currentX.current, targetX.current, lerpAmount);
      currentY.current = lerp(currentY.current, targetY.current, lerpAmount);
      setGradientPosition(currentX.current, currentY.current);
      frameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return null;
}
