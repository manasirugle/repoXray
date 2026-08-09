"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NextIcon,
  FastAPIIcon,
  PostgresIcon,
  PgVectorIcon,
  GeminiIcon,
  FirebaseIcon,
} from "@/components/TechMarquee";

const slides = [
  {
    title: "AI Architecture Analysis",
    label: "ARCHITECTURE",
    description: "Visualize service relationships, security posture, and model flow across your AI infrastructure.",
    logo: GeminiIcon,
    accentClass: "theme-fuchsia",
    variant: "architecture",
  },
  {
    title: "Vulnerability Detection",
    label: "SECURITY",
    description: "Identify hidden code risks, misconfigurations, and exposed endpoints before they reach production.",
    logo: FastAPIIcon,
    accentClass: "theme-cyan",
    variant: "security",
  },
  {
    title: "RAG Chat Console",
    label: "CHAT",
    description: "Interact with your knowledge base using secure retrieval-augmented responses and traceable query context.",
    logo: PgVectorIcon,
    accentClass: "theme-emerald",
    variant: "chat",
  },
  {
    title: "Real-time Pipeline",
    label: "PIPELINE",
    description: "Monitor ingestion, transformation, and delivery pipelines with live metrics and fast routing controls.",
    logo: PostgresIcon,
    accentClass: "theme-indigo",
    variant: "pipeline",
  },
  {
    title: "PDF Report Export",
    label: "REPORTING",
    description: "One-click comprehensive PDF reports with architecture overviews, security audits, and file-level analysis.",
    logo: NextIcon,
    accentClass: "theme-blue",
    variant: "report",
  },
  {
    title: "Multi-Tenant Isolation",
    label: "TENANCY",
    description: "Keep customer data separated, enforce policy scopes, and audit access across shared environments.",
    logo: FirebaseIcon,
    accentClass: "theme-yellow",
    variant: "tenant",
  },
];

const modulo = (value: number, length: number) => {
  const result = value % length;
  return result < 0 ? result + length : result;
};

const getRelativeIndex = (index: number, activeIndex: number, count: number) => {
  let diff = index - activeIndex;
  if (diff > count / 2) diff -= count;
  if (diff <= -count / 2) diff += count;
  return diff;
};

const CoverflowCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeout = useRef<NodeJS.Timeout | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const handleInteraction = (index: number) => {
    setActiveIndex(index);
    setIsPaused(true);
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    pauseTimeout.current = setTimeout(() => setIsPaused(false), 3800);
  };

  const nextSlide = () => {
    setActiveIndex((current) => modulo(current + 1, slides.length));
  };

  const prevSlide = () => {
    setActiveIndex((current) => modulo(current - 1, slides.length));
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 3400);
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    return () => {
      if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartX.current = event.clientX;
    setIsPaused(true);
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;
    const delta = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (delta > 48) {
      prevSlide();
    } else if (delta < -48) {
      nextSlide();
    }
    pauseTimeout.current = setTimeout(() => setIsPaused(false), 3800);
  };

  const slideItems = useMemo(
    () =>
      slides.map((slide, index) => {
        const distance = getRelativeIndex(index, activeIndex, slides.length);
        const absDistance = Math.abs(distance);
        const isVisible = absDistance <= 3;

        let transform = "translateX(-50%) translateY(-50%)";
        let opacity = 0;
        let zIndex = 1;
        let boxShadow = "0 24px 60px rgba(15, 23, 42, 0.12)";
        let pointerEvents: "auto" | "none" = "none";

        if (distance === 0) {
          transform += " translateZ(0px) scale(1) rotateY(0deg)";
          opacity = 1;
          zIndex = 50;
          boxShadow = "0 30px 90px rgba(15, 23, 42, 0.22)";
          pointerEvents = "auto";
        } else if (distance === -1) {
          transform += " translateX(-120px) translateZ(-90px) scale(0.86) rotateY(25deg)";
          opacity = 0.84;
          zIndex = 40;
          boxShadow = "0 22px 70px rgba(15, 23, 42, 0.16)";
          pointerEvents = "auto";
        } else if (distance === 1) {
          transform += " translateX(120px) translateZ(-90px) scale(0.86) rotateY(-25deg)";
          opacity = 0.84;
          zIndex = 40;
          boxShadow = "0 22px 70px rgba(15, 23, 42, 0.16)";
          pointerEvents = "auto";
        } else if (distance === -2) {
          transform += " translateX(-220px) translateZ(-160px) scale(0.72) rotateY(32deg)";
          opacity = 0.68;
          zIndex = 30;
          boxShadow = "0 18px 58px rgba(15, 23, 42, 0.13)";
        } else if (distance === 2) {
          transform += " translateX(220px) translateZ(-160px) scale(0.72) rotateY(-32deg)";
          opacity = 0.68;
          zIndex = 30;
          boxShadow = "0 18px 58px rgba(15, 23, 42, 0.13)";
        } else if (distance === -3) {
          transform += " translateX(-320px) translateZ(-240px) scale(0.58) rotateY(36deg)";
          opacity = 0.52;
          zIndex = 20;
        } else if (distance === 3) {
          transform += " translateX(320px) translateZ(-240px) scale(0.58) rotateY(-36deg)";
          opacity = 0.52;
          zIndex = 20;
        }

        return {
          ...slide,
          index,
          style: {
            transform,
            opacity,
            zIndex,
            boxShadow,
            pointerEvents,
            visibility: isVisible ? "visible" : "hidden",
          } as React.CSSProperties,
          isCenter: distance === 0,
        };
      }),
    [activeIndex]
  );

  return (
    <section id="coverflow" className="lp-coverflow-section" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => { if (pauseTimeout.current) clearTimeout(pauseTimeout.current); pauseTimeout.current = setTimeout(() => setIsPaused(false), 3800); }}>
      <div className="lp-section-inner">
        <div className="lp-section-header">
          <h2 className="lp-section-title">Everything You Need to Review Code</h2>
          <p className="lp-section-desc">Enterprise-grade AI analysis meets elegant developer experience.</p>
        </div>

        <div className="lp-coverflow-container">
          <div className="lp-coverflow-track">
            {slideItems.map((slide) => (
              <button
                key={slide.index}
                type="button"
                aria-label={`Show screenshot preview for ${slide.title}`}
                className={`coverflow-slide ${slide.isCenter ? "is-center" : ""}`}
                style={slide.style}
                onClick={() => handleInteraction(slide.index)}
              >
                <div className="coverflow-card">
                  <div className={`coverflow-preview coverflow-preview-${slide.variant}`}>
                    <div className={`coverflow-logo-badge ${slide.accentClass}`}>
                      <slide.logo size={20} />
                    </div>
                    <div className="coverflow-screen-mock">
                      <div className="coverflow-screen-header">
                        <span />
                        <span className="coverflow-screen-title-bar" />
                      </div>
                      <div className="coverflow-screen-highlight" />
                      <div className="coverflow-screen-lines">
                        <span className="coverflow-screen-line" />
                        <span className="coverflow-screen-line short" />
                        <span className="coverflow-screen-line" />
                      </div>
                    </div>
                  </div>
                  <div className="coverflow-card-body">
                    <span className="coverflow-card-category">{slide.label}</span>
                    <h3>{slide.title}</h3>
                    <p>{slide.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoverflowCarousel;
