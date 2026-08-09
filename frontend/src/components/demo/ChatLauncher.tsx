"use client";

interface ChatLauncherProps {
  visible: boolean;
  onClick: () => void;
}

export default function ChatLauncher({ visible, onClick }: ChatLauncherProps) {
  return (
    <div
      className="fixed z-[9999] flex items-center justify-center"
      style={{
        position: "fixed",
        // positioned a bit above the 'N' icon on the left side
        bottom: "84px",
        left: "24px",
        zIndex: 9999,
        transition: "opacity 0.4s ease, transform 0.4s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.7)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Ping ring */}
      <span
        className="absolute inline-flex h-full w-full rounded-full demo-btn-primary opacity-40"
        style={{ animation: "none" }}
      />
      {/* Button */}
      <button
        onClick={onClick}
        aria-label="Open RepoXray Assistant"
        title="Click for demo"
        className="group relative flex items-center justify-center w-14 h-14 rounded-full demo-btn-primary shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        {/* Tooltip on hover */}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden rounded-xl bg-slate-950 px-3 py-1 text-xs text-white opacity-0 transition-all duration-200 group-hover:block group-hover:opacity-100">
          Click for demo
        </span>
        {/* Omega logo glyph */}
        <span className="text-2xl font-bold leading-none select-none">Ω</span>
      </button>
    </div>
  );
}
