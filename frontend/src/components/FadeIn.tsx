"use client";

import React from "react";
import { useInView } from "@/hooks/useInView";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  stagger?: boolean;
  style?: React.CSSProperties;
}

const FadeIn: React.FC<FadeInProps> = ({
  children,
  className = "",
  threshold,
  rootMargin,
  once = true,
  stagger = false,
  style,
}) => {
  const { ref, inView } = useInView({ threshold, rootMargin, once });
  const wrapperClass = [
    className,
    stagger ? "fade-in-group" : "fade-in",
    inView ? "fade-in-visible" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={wrapperClass} style={style}>
      {children}
    </div>
  );
};

export default FadeIn;
