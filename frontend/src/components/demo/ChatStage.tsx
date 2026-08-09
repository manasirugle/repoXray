"use client";

import { TOOL_STEPS } from "./data";

interface ChatStageProps {
  inputText: string;
  sendPressed: boolean;
  showUserBubble: boolean;
  showThinking: boolean;
  visibleSteps: number;
}

export default function ChatStage({
  inputText,
  sendPressed,
  showUserBubble,
  showThinking,
  visibleSteps,
}: ChatStageProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Chat log */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-auto min-h-[220px]">
        {/* User bubble */}
        {showUserBubble && (
          <div
            className="self-end max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-[#1a1a1a] text-white text-sm font-mono break-all shadow-sm"
            style={{ animation: "fadeUp 0.3s ease forwards" }}
          >
            https://github.com/PrernaKale02/HireReady
          </div>
        )}

        {/* Agent thinking bubble */}
        {showThinking && (
          <div
            className="self-start max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 bg-[#f1f5f9] text-sm text-[#737373] flex items-center gap-2 shadow-sm"
            style={{ animation: "fadeUp 0.3s ease forwards" }}
          >
            <span>Analyzing repository</span>
            <span className="flex items-center gap-1 ml-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#737373] inline-block"
                  style={{
                    animation: "bounce3 1.4s infinite ease-in-out",
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </span>
          </div>
        )}

        {/* Tool steps */}
        {visibleSteps > 0 && (
          <div
            className="self-start max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 bg-[#f1f5f9] text-sm flex flex-col gap-2 shadow-sm"
            style={{ animation: "fadeUp 0.3s ease forwards" }}
          >
            {TOOL_STEPS.slice(0, visibleSteps).map((step, i) => (
              <div
                key={step}
                className="flex items-center gap-2 text-gray-700"
                style={{
                  animation: "fadeUp 0.3s ease forwards",
                  animationDelay: `${i * 0.05}s`,
                  opacity: 0,
                  animationFillMode: "forwards",
                }}
              >
                <span className="text-[#059669] font-bold text-base leading-none">✓</span>
                <span className="text-[13px]">{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="px-4 py-3 border-t border-[#e5e5e5] shrink-0">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-[#e5e5e5] px-3 py-2.5 shadow-sm">
          <span
            className={`flex-1 text-sm truncate transition-colors ${
              inputText ? "text-gray-800 font-mono" : "text-[#a3a3a3]"
            }`}
          >
            {inputText || "Paste a GitHub repo link..."}
          </span>
          <button
            aria-label="Send"
            className="flex items-center justify-center w-7 h-7 rounded-lg demo-btn-primary text-xs shrink-0 transition-transform font-bold"
            style={{ transform: sendPressed ? "scale(0.85)" : "scale(1)" }}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
