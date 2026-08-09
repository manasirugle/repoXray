"use client";
import React from "react";

type IconProps = { className?: string; size?: number };

const NextIcon: React.FC<IconProps> = ({ className = "", size = 28 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 2L6 19h12L12 2Z" fill="currentColor" />
    <path d="M10.5 11.5L9 16h6l-1.5-4.5L12 14.5L10.5 11.5Z" fill="currentColor" opacity="0.6" />
  </svg>
);

const FastAPIIcon: React.FC<IconProps> = ({ className = "", size = 28 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M13 3 7 13h5l-1 8 6-10h-5l1-8Z" fill="currentColor" />
  </svg>
);

const PostgresIcon: React.FC<IconProps> = ({ className = "", size = 28 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 2C8 2 5 5 5 9c0 4 7 11 7 11s7-7 7-11c0-4-3-7-7-7Z" fill="currentColor" />
    <path d="M8 11c0-2 1-3 4-3s4 1 4 3-1 3-4 3-4-1-4-3Z" fill="currentColor" opacity="0.75" />
  </svg>
);

const PgVectorIcon: React.FC<IconProps> = ({ className = "", size = 28 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="8.5" cy="12" r="1.25" fill="currentColor" />
    <circle cx="15.5" cy="12" r="1.25" fill="currentColor" />
    <path d="M8 8h8M8 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GeminiIcon: React.FC<IconProps> = ({ className = "", size = 28 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 1v4m0 14v4m11-11h-4M7 12H3m13.5-6.5L12 7l-4.5-4.5M7.5 16.5 12 19.5l4.5-3m0-9L12 5l-4.5 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FirebaseIcon: React.FC<IconProps> = ({ className = "", size = 28 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 2 6 18h4l1 4 6-14h-5l-2 4 3 5H6.5L12 2Z" fill="currentColor" />
  </svg>
);

const techItems = [
  { id: "next", label: "Next.js", Icon: NextIcon },
  { id: "fastapi", label: "FastAPI", Icon: FastAPIIcon },
  { id: "postgres", label: "PostgreSQL", Icon: PostgresIcon },
  { id: "pgvector", label: "pgvector", Icon: PgVectorIcon },
  { id: "gemini", label: "Gemini", Icon: GeminiIcon },
  { id: "firebase", label: "Firebase", Icon: FirebaseIcon },
];

export {
  NextIcon,
  FastAPIIcon,
  PostgresIcon,
  PgVectorIcon,
  GeminiIcon,
  FirebaseIcon,
};

const TechMarquee: React.FC = () => (
  <div className="tech-marquee-wrapper" role="presentation" aria-hidden>
    <div className="tech-marquee-mask">
      <div className="tech-marquee-track">
        {techItems.concat(techItems).map(({ id, label, Icon }, idx) => (
          <div className="tech-marquee-item" key={`${id}-${idx}`}>
            <Icon className="tech-marquee-icon" size={28} />
            <span className="tech-marquee-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TechMarquee;
