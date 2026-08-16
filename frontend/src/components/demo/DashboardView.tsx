"use client";

import { useState, useEffect } from "react";
import { TabId, TABS, CYCLING_TABS, REPO_FILES, REPO_ISSUES, REPO_NAME, REPO_OWNER_PATH } from "./data";

interface DashboardViewProps {
  activeTab: TabId;
  tabCycleIndex: number;
  onTabClick: (id: TabId) => void;
}

// ── Tab content panels ─────────────────────────────────────────────────────

function ArchitecturePanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 400);
    const timer2 = setTimeout(() => setStep(2), 1200);
    const timer3 = setTimeout(() => setStep(3), 2000);
    const timer4 = setTimeout(() => setStep(4), 2800);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); };
  }, []);

  return (
    <div className="p-4 space-y-3" key="architecture">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide badge bg-blue-500/10 text-blue-600 border border-blue-500/25 px-2 py-1 rounded-md w-fit">
        <span>✦</span>
        <span>Master Architect Overview</span>
      </div>
      
      {step >= 1 && (
        <p className="text-sm font-semibold text-gray-800 animate-fade-in">Global Project Overview: HireReady</p>
      )}
      {step >= 1 && (
        <p className="text-xs text-[#737373] leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Firebase-backed auth, a Map-Reduce ingestion pipeline, and pgvector retrieval for resume matching.
        </p>
      )}
      <div className="space-y-1.5 mt-2">
        {[
          { path: "auth/", desc: "Firebase JWT verification", minStep: 2 },
          { path: "services/", desc: "Map-Reduce pipeline", minStep: 3 },
          { path: "rag/", desc: "pgvector similarity search", minStep: 4 },
        ].map(({ path, desc, minStep }) => (
          step >= minStep ? (
            <div key={path} className="text-xs font-mono animate-fade-in">
              <span className="font-semibold text-blue-600 dark:text-sky-400">{path}</span>
              <span className="text-[#737373] italic"> {desc}</span>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}

function SecurityPanel() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const total = REPO_ISSUES;
    const duration = 1500;
    const intervalTime = duration / total;
    let current = 0;
    const interval = setInterval(() => {
      if (current < total) {
        current++;
        setCount(current);
      } else {
        clearInterval(interval);
      }
    }, intervalTime);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-3" key="security">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide badge bg-red-500/10 text-red-600 border border-red-500/25 px-2 py-1 rounded-md w-fit">
        <span>◈</span>
        <span>Security Audit</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {count >= 2 && <span className="px-2 py-1 rounded-md bg-red-100 text-red-600 text-xs font-semibold animate-fade-in">CRITICAL ×2</span>}
        {count >= 10 && <span className="px-2 py-1 rounded-md bg-orange-100 text-orange-600 text-xs font-semibold animate-fade-in">HIGH ×8</span>}
        {count >= 24 && <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-600 text-xs font-semibold animate-fade-in">MEDIUM ×14</span>}
      </div>
      {count === REPO_ISSUES && (
        <p className="text-xs text-[#737373] leading-relaxed animate-fade-in">
          {count} issues found across {REPO_FILES} files. Most critical: exposed API keys in environment config and unvalidated file upload endpoints.
        </p>
      )}
    </div>
  );
}

function FilesPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s < 5 ? s + 1 : s));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const items = [
    { indent: 0, icon: "▶", label: "src/", bold: true },
    { indent: 1, icon: "▶", label: "auth/", bold: true },
    { indent: 2, icon: "–", label: "middleware.ts" },
    { indent: 1, icon: "▶", label: "rag/", bold: true },
    { indent: 2, icon: "–", label: "embeddings.ts" },
  ];

  return (
    <div className="p-4 space-y-2" key="files">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide badge bg-blue-500/10 text-blue-600 border border-blue-500/25 px-2 py-1 rounded-md w-fit">
        <span>≡</span>
        <span>File Explorer</span>
      </div>
      <div className="font-mono text-xs text-gray-700 space-y-1">
        {items.map(({ indent, icon, label, bold }, i) => (
          i < step ? (
            <div
              key={i}
              className="flex items-center gap-1 animate-fade-in"
              style={{ paddingLeft: `${indent * 14}px` }}
            >
              <span className="text-blue-500 font-bold">{icon}</span>
              <span className={bold ? "font-semibold text-gray-800" : ""}>{label}</span>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}

function ChatPanel() {
  const [text, setText] = useState("");
  const fullText = "In auth/middleware.ts — 24h TTL, refresh isn't rate-limited.";
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 600); // User message appears
    const timer2 = setTimeout(() => setStep(2), 1200); // AI starts typing
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  useEffect(() => {
    if (step === 2) {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= fullText.length) {
          setText(fullText.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [step]);

  return (
    <div className="p-4 space-y-3" key="chat">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide badge bg-cyan-500/10 text-cyan-600 border border-cyan-500/25 px-2 py-1 rounded-md w-fit">
        <span>↺</span>
        <span>AI Chat Console</span>
      </div>
      <div className="flex flex-col gap-2">
        {step >= 1 && (
          <div className="self-end max-w-[85%] bg-[#1D4ED8] text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm leading-relaxed shadow-sm animate-fade-in">
            Where is session expiry handled?
          </div>
        )}
        {step >= 2 && (
          <div className="self-start max-w-[85%] bg-[#e8f4ed] text-[#1a3d2b] text-xs px-3 py-2 rounded-2xl rounded-bl-sm leading-relaxed shadow-sm border border-gray-200">
            {text}
            {text.length < fullText.length && <span className="inline-block w-1 h-3 bg-gray-400 ml-0.5 animate-pulse" />}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffPanel() {
  return (
    <div className="p-4 space-y-2" key="diff">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide badge bg-blue-500/10 text-blue-600 border border-blue-500/25 px-2 py-1 rounded-md w-fit">
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
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 badge bg-blue-500/10 text-blue-600 border-blue-500/25 rounded-md text-[10px] font-semibold mb-1.5">
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
              <p className="text-lg font-bold text-blue-600 leading-none">{REPO_ISSUES}</p>
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
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 ease-in-out border ${
                    isActive
                      ? "bg-[var(--accent-violet)] text-white border-[var(--accent-violet)] shadow-[0_4px_12px_rgba(59,130,246,0.12)]"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
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
          style={{ animation: "crossFadeIn 0.45s ease-in-out forwards" }}
        >
          {PANEL_MAP[activeTab]}
        </div>

        {/* Dot pagination */}
        <div className="flex items-center justify-center gap-1.5 pb-3 shrink-0">
          {TABS.map((tab, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ease-in-out ${
                i === tabCycleIndex && CYCLING_TABS.includes(tab.id) 
                  ? "w-4 bg-[var(--accent-violet)]" 
                  : "w-1.5 bg-[#e5e5e5]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
