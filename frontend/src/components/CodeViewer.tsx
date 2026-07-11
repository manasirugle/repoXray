"use client";

import React, { useState } from "react";
import { X, FileText, Code, Check, Copy } from "lucide-react";
import Markdown from "./Markdown";

interface CodeViewerProps {
  filePath: string;
  language: string;
  summary: string;
  keyComponents: string[];
  rawContent: string;
  onClose: () => void;
}

export default function CodeViewer({
  filePath,
  language,
  summary,
  keyComponents,
  rawContent,
  onClose
}: CodeViewerProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "code">("summary");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sliding Sheet */}
      <div className="relative w-full max-w-3xl h-full bg-[#0c0e12] border-l border-glass shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-glass flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading truncate max-w-lg" title={filePath}>
                {filePath.split("/").pop()}
              </h2>
              <p className="text-xs text-secondary truncate max-w-lg" title={filePath}>
                {filePath} • <span className="text-cyan-400 font-semibold">{language}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-glass flex items-center justify-center text-secondary hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 py-3 border-b border-glass bg-white/[0.01] flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("summary")}
              className={`tab-btn ${activeTab === "summary" ? "tab-btn-active" : ""}`}
            >
              <FileText size={16} />
              <span>AI File Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`tab-btn ${activeTab === "code" ? "tab-btn-active" : ""}`}
            >
              <Code size={16} />
              <span>Source Code</span>
            </button>
          </div>

          {activeTab === "code" && rawContent && (
            <button
              onClick={handleCopy}
              className="tab-btn px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy Raw Code"}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar">
          {activeTab === "summary" ? (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Block */}
              <div className="glass-panel p-5 bg-white/[0.02]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-3">File Abstract</h3>
                <p className="text-secondary text-[14px] leading-relaxed">
                  {summary || "AI Summary not generated for this file."}
                </p>
              </div>

              {/* Key Components */}
              {keyComponents && keyComponents.length > 0 && (
                <div className="glass-panel p-5 bg-white/[0.02]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Key Design Components</h3>
                  <ul className="space-y-2">
                    {keyComponents.map((comp, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-secondary text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col animate-fade-in">
              {rawContent ? (
                <pre className="flex-1 bg-[#080a0f] border border-glass rounded-lg p-5 font-mono text-[13px] text-gray-300 overflow-auto scrollbar select-text leading-relaxed">
                  <code>{rawContent}</code>
                </pre>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-glass rounded-lg bg-[#080a0f]">
                  <Code size={36} className="text-secondary mb-3 opacity-30" />
                  <p className="text-secondary text-sm">This file is skipped or empty (e.g. binary asset or too large).</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
