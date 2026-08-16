"use client";
 
import { useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { DemoState } from "./useDemoLoop";
import { TabId } from "./data";
import ChatStage from "./ChatStage";
import DashboardView from "./DashboardView";
 
interface ChatWidgetProps {
  onClose: () => void;
  stateRef: React.MutableRefObject<DemoState>;
  externalState: DemoState;
  onStateChange: (patch: Partial<DemoState>) => void;
  demo?: boolean;
}
 
export default function ChatWidget({
  onClose,
  stateRef,
  externalState,
  onStateChange,
  demo = false,
}: ChatWidgetProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const s = externalState;
  const isDashboard = s.stage === "dashboard" || s.stage === "cycling";
  const isExpanding = s.stage === "expanding";
  // Demo mode (inline, contained) uses smaller widths than the real floating widget
  const normalWidth = demo ? (isDashboard ? 480 : 320) : isDashboard ? 640 : 380;
 
  const header = (
    <div className="flex items-center gap-3 px-4 pt-3 pb-0 shrink-0 border-b border-black/5 pb-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-violet)] text-white text-sm font-bold shrink-0 shadow-sm">
        Ω
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-tight">RepoXray Assistant</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] inline-block" />
          <span className="text-xs text-[#737373]">Online</span>
        </div>
      </div>
 
      {/* Maximize / Minimize toggle button — real widget only */}
      {!demo && (
        <button
          onClick={() => setIsMaximized((prev) => !prev)}
          aria-label={isMaximized ? "Minimize widget" : "Maximize widget"}
          title={isMaximized ? "Minimize" : "Maximize"}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#737373] hover:text-gray-900 hover:bg-black/5 transition-colors"
        >
          {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      )}
 
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close widget"
        title="Close"
        className="w-7 h-7 flex items-center justify-center rounded-full text-[#737373] hover:text-gray-900 hover:bg-black/5 transition-colors"
      >
        <X size={17} />
      </button>
    </div>
  );
 
  const body = (
    <>
      {/* Chat stage (visible when not in dashboard) */}
      {!isDashboard && (
        <ChatStage
          inputText={s.inputText}
          sendPressed={s.stage === "sending"}
          showUserBubble={s.showUserBubble}
          showThinking={s.showThinking}
          visibleSteps={s.visibleSteps}
        />
      )}
 
      {/* Dashboard (visible when in dashboard/cycling) */}
      {isDashboard && (
        <DashboardView
          activeTab={s.activeTab}
          tabCycleIndex={s.tabCycleIndex}
          onTabClick={(id: TabId) => onStateChange({ activeTab: id })}
        />
      )}
    </>
  );
 
  // Demo variant: smaller, contained, sits in normal document flow (no fixed positioning)
  if (demo) {
    return (
      <div
        className="z-[998] flex flex-col bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#e5e5e5] overflow-hidden text-gray-800 transition-all duration-300"
        style={{
          position: "relative",
          width: `min(${normalWidth}px, calc(100vw - 40px))`,
          height: "auto",
          maxHeight: "70vh",
          minHeight: "240px",
          zIndex: 998,
          color: "#1f2937",
          animation: "fadeIn 0.35s ease forwards",
          backgroundColor: "rgba(255,255,255,0.97)",
          pointerEvents: "auto",
        }}
      >
        {header}
        {body}
      </div>
    );
  }
 
  // Real widget: fixed floating position, bottom-left, maximizable
  return (
    <div
      className="fixed z-[9998] flex flex-col bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#e5e5e5] overflow-hidden text-gray-800 transition-all duration-300"
      style={{
        position: "fixed",
        top: isMaximized ? "24px" : "auto",
        left: "24px",
        right: isMaximized ? "24px" : "auto",
        bottom: isMaximized ? "24px" : "96px",
        width: isMaximized
          ? "calc(100vw - 48px)"
          : `min(${normalWidth}px, calc(100vw - 40px))`,
        height: isMaximized ? "calc(100vh - 48px)" : "auto",
        maxHeight: isMaximized ? "100vh" : "80vh",
        minHeight: isMaximized ? "80vh" : "340px",
        zIndex: isMaximized ? 99999 : 9998,
        color: "#1f2937",
        animation: "fadeIn 0.35s ease forwards",
        backgroundColor: "rgba(255,255,255,0.97)",
      }}
    >
      {header}
      {body}
    </div>
  );
}
 