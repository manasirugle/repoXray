"use client";

import { TabId, TABS, CYCLING_TABS, REPO_FILES, REPO_ISSUES, REPO_NAME, REPO_OWNER_PATH } from "./data";

interface DashboardViewProps {
  activeTab: TabId;
  tabCycleIndex: number;
  onTabClick: (id: TabId) => void;
}

// ── Tab content panels ─────────────────────────────────────────────────────

function ArchitecturePanel() {
  return (
    <div className="p-4 space-y-3" key="architecture">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide demo-badge-accent px-2 py-1 rounded-md w-fit">
        <span>✦</span>
        <span>Master Architect Overview</span>
      </div>
      <p className="text-sm font-semibold text-gray-800">Global Project Overview: HireReady</p>
      <p className="text-xs text-[#737373] leading-relaxed">
        Firebase-backed auth, a Map-Reduce ingestion pipeline, and pgvector retrieval for resume matching.
      </p>
      <div className="space-y-1.5 mt-2">
        {[
          { path: "auth/", desc: "Firebase JWT verification" },
          { path: "services/", desc: "Map-Reduce pipeline" },
          { path: "rag/", desc: "pgvector similarity search" },
        ].map(({ path, desc }) => (
          <div key={path} className="text-xs font-mono">
            <span className="font-semibold text-blue-600 dark:text-sky-400">{path}</span>
            <span className="text-[#737373] italic"> {desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityPanel() {
  return (
    <div className="p-4 space-y-3" key="security">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide demo-badge-accent px-2 py-1 rounded-md w-fit">
        <span>◈</span>
        <span>Security Audit</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="px-2 py-1 rounded-md bg-red-100 text-red-600 text-xs font-semibold">CRITICAL ×2</span>
        <span className="px-2 py-1 rounded-md bg-gradient-to-r from-orange-300 via-orange-400 to-orange-600 text-white text-xs font-semibold">HIGH ×8</span>
        <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-600 text-xs font-semibold">MEDIUM ×14</span>
      </div>
      <p className="text-xs text-[#737373] leading-relaxed">
        37 issues found across 21 files. Most critical: exposed API keys in environment config and unvalidated file upload endpoints.
      </p>
    </div>
  );
}

function FilesPanel() {
  return (
    <div className="p-4 space-y-2" key="files">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide demo-badge-accent px-2 py-1 rounded-md w-fit">
        <span>≡</span>
        <span>File Explorer</span>
      </div>
      <div className="font-mono text-xs text-gray-700 space-y-1">
        {[
          { indent: 0, icon: "▶", label: "src/", bold: true },
          { indent: 1, icon: "▶", label: "auth/", bold: true },
          { indent: 2, icon: "–", label: "middleware.ts" },
          { indent: 1, icon: "▶", label: "rag/", bold: true },
          { indent: 2, icon: "–", label: "embeddings.ts" },
        ].map(({ indent, icon, label, bold }, i) => (
          <div
            key={i}
            className="flex items-center gap-1"
            style={{ paddingLeft: `${indent * 14}px` }}
          >
            <span className="text-blue-500 font-bold">{icon}</span>
            <span className={bold ? "font-semibold text-gray-800" : ""}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="p-4 space-y-3" key="chat">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide demo-badge-accent px-2 py-1 rounded-md w-fit">
        <span>↺</span>
        <span>AI Chat Console</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="self-end max-w-[85%] bg-[#1a1a1a] text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm leading-relaxed shadow-sm">
          Where is session expiry handled?
        </div>
        <div className="self-start max-w-[85%] bg-[#e8f4ed] text-[#1a3d2b] text-xs px-3 py-2 rounded-2xl rounded-bl-sm leading-relaxed shadow-sm">
          In auth/middleware.ts — 24h TTL, refresh isn't rate-limited.
        </div>
      </div>
    </div>
  );
}

function DiffPanel() {
  return (
    <div className="p-4 space-y-2" key="diff">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide demo-badge-accent px-2 py-1 rounded-md w-fit">
        <span>⇄</span>
        <span>Architecture Diff</span>
      </div>
      <div className="font-mono text-xs space-y-1">
        <div className="text-[#059669] bg-green-50 px-2 py-0.5 rounded">+ rate-limiter/ middleware added</div>
        <div className="text-[#059669] bg-green-50 px-2 py-0.5 rounded">+ auth/refresh.ts — token rotation</div>
        <div className="text-[#dc2626] bg-red-50 px-2 py-0.5 rounded">- legacy/session.js removed</div>
        <div className="text-[#dc2626] bg-red-50 px-2 py-0.5 rounded">- config/secrets.js (exposed keys)</div>
      </div>
    </div>
  );
}

const PANEL_MAP: Record<TabId, React.ReactNode> = {
  architecture: <ArchitecturePanel />,
  security: <SecurityPanel />,
  files: <FilesPanel />,
  chat: <ChatPanel />,
  diff: <DiffPanel />,
};

export default function DashboardView({ activeTab, tabCycleIndex, onTabClick }: DashboardViewProps) {
  return (
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ animation: "fadeIn 0.4s ease forwards" }}>
      {/* Sidebar */}
      <div className="w-[120px] shrink-0 border-r border-[#e5e5e5] flex flex-col p-3 gap-2 bg-[#faf7f0]">
        <p className="text-[9px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1">Repository History</p>
        <div className="flex items-center justify-between bg-white border border-[#e5e5e5] rounded-lg px-2.5 py-2 shadow-sm">
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-tight">HireReady</p>
            <p className="text-[10px] text-[#a3a3a3]">21/21 files</p>
          </div>
          <span className="text-[#059669] text-sm font-bold">✓</span>
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Stats header */}
        <div className="px-4 pt-3 pb-2 border-b border-[#e5e5e5] flex items-start justify-between gap-2 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 demo-badge-accent rounded-md text-[10px] font-semibold mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block animate-pulse" />
              ACTIVE REPOSITORY
            </div>
            <p className="text-sm font-bold text-gray-800 leading-tight">{REPO_NAME}</p>
            <p className="text-[10px] text-[#a3a3a3]">{REPO_OWNER_PATH}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-right pt-1">
            <div>
              <p className="text-lg font-bold text-gray-800 leading-none">{REPO_FILES}</p>
              <p className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-wide">Code Files</p>
            </div>
            <div>
              <p className="text-lg font-bold text-pink-600 dark:text-emerald-400 leading-none">{REPO_ISSUES}</p>
              <p className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-wide">Issues Found</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-3 pt-2 pb-1 border-b border-[#e5e5e5] shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabClick(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "demo-btn-primary shadow-sm font-semibold"
                      : "text-[#737373] hover:bg-[#f6f1e7] hover:text-gray-700"
                  }`}
                >
                  <span className="text-[10px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div
          key={activeTab}
          className="flex-1 overflow-auto bg-white m-3 rounded-xl border border-[#e5e5e5] shadow-sm"
          style={{ animation: "crossFadeIn 0.25s ease forwards" }}
        >
          {PANEL_MAP[activeTab]}
        </div>

        {/* Dot pagination */}
        <div className="flex items-center justify-center gap-1.5 pb-3 shrink-0">
          {CYCLING_TABS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === tabCycleIndex ? "w-4 demo-btn-primary" : "w-1.5 bg-[#e5e5e5]"
              }`}
            />
          ))}
          {/* Extra dots for tabs 4 & 5 (always inactive in auto-cycle) */}
          {[0, 1].map((i) => (
            <span key={`extra-${i}`} className="w-1.5 h-1.5 rounded-full bg-[#e5e5e5]" />
          ))}
        </div>
      </div>
    </div>
  );
}
