"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number; // ms
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Counts from 0 to `value` over `duration` ms using requestAnimationFrame.
 * Eases out with a cubic curve so it decelerates naturally.
 */
export function AnimatedNumber({ value, duration = 800, className, style }: Props) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    if (from === to) return;

    // Cancel any in-progress animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-quart
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
