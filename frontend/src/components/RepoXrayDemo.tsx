"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface DemoConfig {
  scene1: {
    title: string;
    authBadge: string;
    repoUrl: string;
    buttonInitial: string;
    buttonPressed: string;
    footnote: string;
  };
  scene2: {
    title: string;
    repoName: string;
    steps: string[];
    totalFiles: number;
  };
  scene3: {
    title: string;
    heading: string;
    comment: string;
    treeLines: { prefix: string; path: string; desc: string }[];
    vulnerabilities: { severity: "High" | "Medium" | "Low"; text: string }[];
    securityComplete: string;
    hintText: string;
  };
  scene4: {
    title: string;
    userQuestion: string;
    botAnswer: string;
    sourceRef: string;
  };
}

export const DEMO: DemoConfig = {
  scene1: {
    title: "connect_repo",
    authBadge: "✓ Signed in with Google",
    repoUrl: "github.com/acme/payments-api",
    buttonInitial: "Analyze repository",
    buttonPressed: "Starting analysis...",
    footnote: "Supports public & private GitHub repositories",
  },
  scene2: {
    title: "analyzing...",
    repoName: "acme/payments-api",
    steps: [
      "Cloning repository",
      "Map: summarizing each file",
      "Reduce: merging into one report",
      "Indexing code for search",
    ],
    totalFiles: 142,
  },
  scene3: {
    title: "report.md",
    heading: "## Architecture Overview",
    comment: "// AI-generated deep analysis",
    treeLines: [
      { prefix: "├──", path: "auth/", desc: "Firebase JWT verification" },
      { prefix: "├──", path: "services/", desc: "Map-Reduce pipeline" },
      { prefix: "├──", path: "rag/", desc: "pgvector similarity search" },
      { prefix: "└──", path: "reports/", desc: "PDF export engine" },
    ],
    vulnerabilities: [
      { severity: "High", text: "Hardcoded API key in config.py" },
      { severity: "Medium", text: "No rate limit on /login (auth/routes.py)" },
      { severity: "Low", text: "requests 2.19 is outdated (requirements.txt)" },
    ],
    securityComplete: "✓ Security audit complete",
    hintText: "View full report and suggested fixes →",
  },
  scene4: {
    title: "ask_your_code",
    userQuestion: "Where is the JWT verified?",
    botAnswer: "Every request passes through verify_token() before it reaches a route.",
    sourceRef: "auth/middleware.py:42",
  },
};

export interface SceneMeta {
  id: string;
  title: string;
  label: string;
  durationMs: number;
}

export const SCENES: SceneMeta[] = [
  { id: "connect", title: DEMO.scene1.title, label: "Connect", durationMs: 5000 },
  { id: "analyzing", title: DEMO.scene2.title, label: "Analyze", durationMs: 6000 },
  { id: "report", title: DEMO.scene3.title, label: "Report", durationMs: 8000 },
  { id: "chat", title: DEMO.scene4.title, label: "Ask AI", durationMs: 8000 },
];

export default function RepoXrayDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  // Whether clock should be running
  const isPaused = prefersReducedMotion || isManuallyPaused || isHovered || isFocused;

  // Main ticker driven by single setInterval (~50ms)
  useEffect(() => {
    if (isPaused) return;

    const TICK = 50;
    const interval = setInterval(() => {
      setSceneIndex((currentScene) => {
        const curDuration = SCENES[currentScene].durationMs;
        setElapsedMs((prevElapsed) => {
          const nextElapsed = prevElapsed + TICK;
          if (nextElapsed >= curDuration) {
            const nextScene = (currentScene + 1) % SCENES.length;
            setTimeout(() => setSceneIndex(nextScene), 0);
            return 0;
          }
          return nextElapsed;
        });
        return currentScene;
      });
    }, TICK);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleSelectScene = useCallback((idx: number) => {
    setSceneIndex(idx);
    setElapsedMs(0);
  }, []);

  const toggleManualPause = useCallback(() => {
    setIsManuallyPaused((prev) => !prev);
  }, []);

  const currentSceneMeta = SCENES[sceneIndex];
  const curDuration = currentSceneMeta.durationMs;
  // If reduced motion is active, show fully drawn state
  const activeElapsed = prefersReducedMotion ? curDuration : elapsedMs;

  /* ================= CALCULATIONS FOR SCENE 1 (5000ms) ================= */
  // 0 - 600ms: auth badge enters
  // 800 - 3200ms (2400ms): URL is typed out with focus state on input
  // 3500 - 5000ms: button shows pressed state and text changes to "Starting analysis..."
  const s1AuthVisible = prefersReducedMotion ? true : activeElapsed >= 200;
  const s1TypingStart = 800;
  const s1TypingDuration = 2400;
  const s1IsInputFocused = prefersReducedMotion
    ? false
    : activeElapsed >= s1TypingStart && activeElapsed < s1TypingStart + s1TypingDuration + 300;
  const s1TypingProgress = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (activeElapsed - s1TypingStart) / s1TypingDuration));
  const s1CharCount = Math.floor(s1TypingProgress * DEMO.scene1.repoUrl.length);
  const s1TypedText = DEMO.scene1.repoUrl.slice(0, s1CharCount);
  const s1IsButtonPressed = prefersReducedMotion ? true : activeElapsed >= 3600;
  const s1CaretVisible = prefersReducedMotion
    ? false
    : s1IsInputFocused && Math.floor(activeElapsed / 450) % 2 === 0;

  /* ================= CALCULATIONS FOR SCENE 2: ANALYZING (6000ms) ================= */
  // Precise pipeline progression:
  // Step 0: "Cloning repository"
  //   - Active: 0 - 600ms
  //   - Done: >= 600ms
  // Step 1: "Map: summarizing each file"
  //   - Active: 600ms - 3600ms
  //   - Counter runs during Map: from 0/142 at 600ms to 142/142 at 3600ms
  //   - Done: >= 3600ms (counter is now 142/142)
  // Step 2: "Reduce: merging into one report"
  //   - Active: 3600ms - 4800ms
  //   - Done: >= 4800ms
  // Step 3: "Indexing code for search"
  //   - Active: 4800ms - 5800ms
  //   - Done: >= 5800ms (end of scene)
  // Only ONE step active at a time!
  // Progress bar tracks unified pipeline progress: 0% to 100% across 0..5800ms
  const s2Progress = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, activeElapsed / 5800));

  let s2FilesCount = 0;
  if (prefersReducedMotion || activeElapsed >= 3600) {
    s2FilesCount = DEMO.scene2.totalFiles;
  } else if (activeElapsed > 600) {
    const mapRatio = (activeElapsed - 600) / (3600 - 600);
    s2FilesCount = Math.floor(mapRatio * DEMO.scene2.totalFiles);
  }

  // Exactly one active step, done steps strictly match requirements
  const s2StepDone = prefersReducedMotion
    ? [true, true, true, true]
    : [
        activeElapsed >= 600,
        activeElapsed >= 3600,
        activeElapsed >= 4800,
        activeElapsed >= 5800,
      ];

  const s2StepActive = prefersReducedMotion
    ? [false, false, false, false]
    : [
        activeElapsed < 600,
        activeElapsed >= 600 && activeElapsed < 3600,
        activeElapsed >= 3600 && activeElapsed < 4800,
        activeElapsed >= 4800 && activeElapsed < 5800,
      ];

  /* ================= CALCULATIONS FOR SCENE 3: REPORT.MD (8000ms) ================= */
  // 0 - 600ms: Header ("## Architecture Overview" and comment) appears
  // 600ms - 2200ms: Tree lines appear (400ms each)
  // 2400ms - 3200ms: Vuln 1 ("High: Hardcoded API key in config.py") appears (~5.6s on screen)
  // 3600ms - 4400ms: Vuln 2 ("Medium: No rate limit on /login (auth/routes.py)") appears (~4.4s on screen)
  // 4800ms - 5600ms: Vuln 3 ("Low: requests 2.19 is outdated (requirements.txt)") appears (~3.2s on screen)
  // 6000ms: "✓ Security audit complete" appears
  // 6600ms - 8000ms: quiet text hint "View full report and suggested fixes →" fades in
  const s3TreeCount = prefersReducedMotion
    ? 4
    : Math.min(4, Math.max(0, Math.floor((activeElapsed - 600) / 400)));
  const s3Vuln1Visible = prefersReducedMotion ? true : activeElapsed >= 2400;
  const s3Vuln2Visible = prefersReducedMotion ? true : activeElapsed >= 3600;
  const s3Vuln3Visible = prefersReducedMotion ? true : activeElapsed >= 4800;
  const s3AuditCompleteVisible = prefersReducedMotion ? true : activeElapsed >= 6000;
  const s3HintVisible = prefersReducedMotion ? true : activeElapsed >= 6600;

  /* ================= CALCULATIONS FOR SCENE 4: ASK_YOUR_CODE (8000ms) ================= */
  // 200ms - 1800ms: user chat bubble types "Where is the JWT verified?"
  // 1900ms - 3100ms: 3-dot thinking animation plays
  // 3200ms - 5200ms: bot answer types out "Every request passes through verify_token() before it reaches a route."
  // 5300ms: source reference "auth/middleware.py:42" appears
  // 5300ms - 8000ms: answer + source held clearly on screen for 2.7s (meets >= 2s requirement)
  const s4QStart = 200;
  const s4QDur = 1600;
  const s4QRatio = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (activeElapsed - s4QStart) / s4QDur));
  const s4QText = DEMO.scene4.userQuestion.slice(
    0,
    Math.floor(s4QRatio * DEMO.scene4.userQuestion.length)
  );

  const s4ThinkingVisible = prefersReducedMotion
    ? false
    : activeElapsed >= 1900 && activeElapsed < 3200;

  const s4AnsStart = 3200;
  const s4AnsDur = 2000;
  const s4AnsRatio = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (activeElapsed - s4AnsStart) / s4AnsDur));
  const s4AnsText =
    activeElapsed >= s4AnsStart || prefersReducedMotion
      ? DEMO.scene4.botAnswer.slice(0, Math.floor(s4AnsRatio * DEMO.scene4.botAnswer.length))
      : "";

  const s4SourceVisible = prefersReducedMotion ? true : activeElapsed >= 5300;

  return (
    <div
      className="lp-hero-visual"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        // If focus moved outside the demo card container, clear isFocused
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      role="region"
      aria-label="RepoXray interactive product preview demo showing repository connection, analysis pipeline, architecture report, and AI code queries"
    >
      <div className="lp-code-card rx-demo-card">
        {/* macOS-style Header */}
        <div className="lp-code-header rx-demo-header">
          <div className="lp-code-dots">
            <span className="lp-dot lp-dot-red" />
            <span className="lp-dot lp-dot-yellow" />
            <span className="lp-dot lp-dot-green" />
          </div>

          <span className="lp-code-title rx-demo-filename">
            {currentSceneMeta.title}
          </span>

          <div className="rx-demo-header-right">
            <button
              type="button"
              className="rx-playback-toggle"
              onClick={toggleManualPause}
              aria-label={isManuallyPaused ? "Play demo" : "Pause demo"}
              aria-pressed={isManuallyPaused}
              title={isManuallyPaused ? "Play demo" : "Pause demo"}
            >
              {isManuallyPaused ? (
                /* Play Icon */
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                  aria-hidden="true"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              ) : (
                /* Pause Icon */
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                  aria-hidden="true"
                >
                  <rect x="5" y="4" width="4" height="16" rx="1" />
                  <rect x="15" y="4" width="4" height="16" rx="1" />
                </svg>
              )}
            </button>
            <div className="rx-demo-header-badge" aria-hidden="true">
              Sample run
            </div>
          </div>
        </div>

        {/* Fixed Height Card Body with unified top-padding */}
        <div className="lp-code-body rx-demo-body" tabIndex={0} aria-live="polite">
          {/* SCENE 1: CONNECT REPO */}
          {sceneIndex === 0 && (
            <div className="rx-scene rx-scene-1">
              <div
                className={`rx-auth-badge ${s1AuthVisible ? "rx-entry-animate" : "rx-hidden"}`}
              >
                <span className="rx-auth-dot" />
                <span>{DEMO.scene1.authBadge}</span>
              </div>

              <div className="rx-input-group">
                <label className="rx-input-label">Repository URL</label>
                <div className={`rx-input-box ${s1IsInputFocused ? "rx-input-box-focused" : ""}`}>
                  <span className="rx-input-prefix">https://</span>
                  <span className="rx-input-typed">
                    {s1TypedText}
                    {s1CaretVisible && <span className="rx-cursor">|</span>}
                  </span>
                </div>
              </div>

              <div className="rx-actions">
                <button
                  type="button"
                  tabIndex={-1}
                  className={`rx-demo-btn ${s1IsButtonPressed ? "rx-btn-pressed" : ""}`}
                >
                  {s1IsButtonPressed && <span className="rx-btn-spinner" />}
                  <span>
                    {s1IsButtonPressed
                      ? DEMO.scene1.buttonPressed
                      : DEMO.scene1.buttonInitial}
                  </span>
                </button>
              </div>

              <div className="rx-scene-footnote">
                <span>{DEMO.scene1.footnote}</span>
              </div>
            </div>
          )}

          {/* SCENE 2: ANALYZING */}
          {sceneIndex === 1 && (
            <div className="rx-scene rx-scene-2">
              <div className="rx-scene2-header">
                <div className="rx-repo-tag">
                  <span className="rx-repo-icon" aria-hidden="true">⚡</span>
                  <span className="rx-repo-name">{DEMO.scene2.repoName}</span>
                </div>
                <div className="rx-file-counter">
                  <span className="rx-counter-num">{s2FilesCount}</span>
                  <span className="rx-counter-total"> / {DEMO.scene2.totalFiles} files analyzed</span>
                </div>
              </div>

              {/* Progress bar tracking overall analysis progress */}
              <div className="rx-progress-track" aria-hidden="true">
                <div
                  className="rx-progress-fill"
                  style={{ width: `${s2Progress * 100}%` }}
                />
              </div>

              {/* Pipeline Steps: always readable contrast, checkmark when done, pulse when active */}
              <div className="rx-steps-list">
                {DEMO.scene2.steps.map((step, idx) => {
                  const isDone = s2StepDone[idx];
                  const isActive = s2StepActive[idx];
                  const stateClass = isDone
                    ? "rx-step-done"
                    : isActive
                    ? "rx-step-active"
                    : "rx-step-pending";

                  return (
                    <div
                      key={step}
                      className={`rx-step-item ${stateClass}`}
                    >
                      <div className="rx-step-status">
                        {isDone ? (
                          <span className="rx-step-check">✓</span>
                        ) : isActive ? (
                          <span className="rx-step-spinner" />
                        ) : (
                          <span className="rx-step-circle" />
                        )}
                      </div>
                      <span className="rx-step-label">{step}</span>
                      {isActive && <span className="rx-step-pulse" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCENE 3: REPORT.MD */}
          {sceneIndex === 2 && (
            <div className="rx-scene rx-scene-3">
              <div className="rx-report-head">
                <code>
                  <span className="lp-code-kw">##</span>{" "}
                  <span className="lp-code-str">{DEMO.scene3.heading.replace("## ", "")}</span>
                </code>
                <code>
                  <span className="lp-code-comment">{DEMO.scene3.comment}</span>
                </code>
              </div>

              {/* Monospace Architecture Tree */}
              <div className="rx-report-tree">
                {DEMO.scene3.treeLines.map((line, idx) => {
                  const isVisible = idx < s3TreeCount;
                  if (!isVisible) return null;
                  return (
                    <div
                      key={line.path}
                      className="rx-tree-row rx-entry-animate"
                    >
                      <span className="lp-code-kw rx-tree-prefix">{line.prefix}</span>{" "}
                      <span className="lp-code-fn">{line.path}</span>{" "}
                      <span className="lp-code-comment">{line.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Vulnerabilities & Audit complete */}
              <div className="rx-report-vulns">
                {s3Vuln1Visible && (
                  <div className="rx-vuln-row rx-entry-animate">
                    <span className="rx-vuln-badge rx-vuln-high">High</span>
                    <span className="rx-vuln-text">{DEMO.scene3.vulnerabilities[0].text}</span>
                  </div>
                )}
                {s3Vuln2Visible && (
                  <div className="rx-vuln-row rx-entry-animate">
                    <span className="rx-vuln-badge rx-vuln-med">Medium</span>
                    <span className="rx-vuln-text">{DEMO.scene3.vulnerabilities[1].text}</span>
                  </div>
                )}
                {s3Vuln3Visible && (
                  <div className="rx-vuln-row rx-entry-animate">
                    <span className="rx-vuln-badge rx-vuln-low">Low</span>
                    <span className="rx-vuln-text">{DEMO.scene3.vulnerabilities[2].text}</span>
                  </div>
                )}

                {s3AuditCompleteVisible && (
                  <div className="rx-report-complete rx-entry-animate">
                    <span className="lp-code-success">{DEMO.scene3.securityComplete}</span>
                  </div>
                )}

                {s3HintVisible && (
                  <div className="rx-report-hint rx-entry-animate">
                    <span>{DEMO.scene3.hintText}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCENE 4: ASK_YOUR_CODE */}
          {sceneIndex === 3 && (
            <div className="rx-scene rx-scene-4">
              <div className="rx-chat-messages">
                {/* User Message */}
                <div className="rx-chat-bubble rx-chat-user">
                  <div className="rx-chat-avatar">U</div>
                  <div className="rx-chat-content">
                    <p className="rx-chat-text">
                      {s4QText}
                      {s4QText.length < DEMO.scene4.userQuestion.length && (
                        <span className="rx-cursor">|</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Thinking Indicator */}
                {s4ThinkingVisible && (
                  <div className="rx-chat-bubble rx-chat-bot rx-chat-thinking rx-entry-animate">
                    <div className="rx-chat-avatar rx-avatar-bot">AI</div>
                    <div className="rx-chat-content">
                      <div className="rx-typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bot Answer */}
                {s4AnsText.length > 0 && (
                  <div className="rx-chat-bubble rx-chat-bot rx-entry-animate">
                    <div className="rx-chat-avatar rx-avatar-bot">AI</div>
                    <div className="rx-chat-content">
                      <p className="rx-chat-text">
                        {s4AnsText}
                        {s4AnsText.length < DEMO.scene4.botAnswer.length && (
                          <span className="rx-cursor">|</span>
                        )}
                      </p>

                      {s4SourceVisible && (
                        <div className="rx-chat-source rx-entry-animate">
                          <span className="rx-source-icon">📎</span>
                          <span className="rx-source-tag">{DEMO.scene4.sourceRef}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Stepper Navigation (at least 24px tall click target, 12px min labels) */}
        <div
          className="rx-demo-nav"
          role="tablist"
          aria-label="Demo scenes"
        >
          {SCENES.map((scene, idx) => {
            const isCurrent = idx === sceneIndex;
            const isCompleted = idx < sceneIndex;
            const progressPct = isCompleted
              ? 100
              : isCurrent
              ? Math.min(100, (activeElapsed / scene.durationMs) * 100)
              : 0;

            return (
              <button
                key={scene.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Jump to scene ${idx + 1}: ${scene.label} (${scene.title})`}
                className={`rx-nav-step ${isCurrent ? "rx-nav-step-active" : ""}`}
                onClick={() => handleSelectScene(idx)}
              >
                <div className="rx-nav-label-row">
                  <span className="rx-nav-idx">0{idx + 1}</span>
                  <span className="rx-nav-title">{scene.label}</span>
                </div>
                <div className="rx-nav-bar-bg">
                  <div
                    className="rx-nav-bar-fill"
                    style={{
                      width: `${progressPct}%`,
                      transition:
                        prefersReducedMotion || isCurrent ? "none" : "width 0.2s ease",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
