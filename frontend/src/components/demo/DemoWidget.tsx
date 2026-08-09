"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatLauncher from "./ChatLauncher";
import ChatWidget from "./ChatWidget";
import { DemoState, INITIAL_STATE, useDemoLoop } from "./useDemoLoop";
import { TabId } from "./data";

export default function DemoWidget() {
  const [demoState, setDemoState] = useState<DemoState>(INITIAL_STATE);
  const stateRef = useRef<DemoState>(INITIAL_STATE);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Keep stateRef up to date for async loop checks
  useEffect(() => {
    stateRef.current = demoState;
  }, [demoState]);

  const handleStateChange = useCallback((patch: Partial<DemoState>) => {
    setDemoState((prev) => {
      const next = { ...prev, ...patch };
      stateRef.current = next;
      return next;
    });
  }, []);

  const getIsOpen = useCallback(() => isManualOpen, [isManualOpen]);
  const getIsInterrupted = useCallback(() => isManualOpen, [isManualOpen]);

  const { start, stop } = useDemoLoop(handleStateChange, getIsOpen, getIsInterrupted);

  // Start loop on mount
  useEffect(() => {
    start();
    return () => {
      stop();
    };
  }, [start, stop]);

  // Handle manual click on launcher
  const handleOpenWidget = () => {
    setIsManualOpen(true);
    handleStateChange({
      stage: "opening",
      inputText: "",
      showUserBubble: false,
      showThinking: false,
      visibleSteps: 0,
      activeTab: "architecture",
      dashboardVisible: false,
      tabCycleIndex: 0,
    });
  };

  // Handle manual click on close button
  const handleCloseWidget = () => {
    setIsManualOpen(false);
    handleStateChange({
      ...INITIAL_STATE,
      stage: "launcher",
    });
    // Restart loop after a short pause
    stop();
    setTimeout(() => {
      start();
    }, 1600);
  };

  const stage = demoState.stage;
  const isWidgetVisible =
    isManualOpen ||
    (stage !== "launcher" && stage !== "closing");
  
  const isLauncherVisible = !isWidgetVisible || stage === "launcher" || stage === "closing";

  return (
    <>
      <ChatLauncher visible={isLauncherVisible} onClick={handleOpenWidget} />
      {isWidgetVisible && (
        <div>
          {isManualOpen ? (
            /* Show the demo inline near the left launcher icon when opened manually */
            <div className="fixed left-6 z-[998]" style={{ bottom: "164px", pointerEvents: "auto" }}>
              <ChatWidget
                onClose={handleCloseWidget}
                stateRef={stateRef}
                externalState={demoState}
                onStateChange={handleStateChange}
                demo
              />
            </div>
          ) : (
            /* Place a small, non-blocking demo in the bottom-right on md+ screens */
            <div className="fixed bottom-6 right-16 z-[998] hidden md:block" style={{ pointerEvents: "none" }}>
              <div style={{ pointerEvents: "auto" }}>
                <ChatWidget
                  onClose={handleCloseWidget}
                  stateRef={stateRef}
                  externalState={demoState}
                  onStateChange={handleStateChange}
                  demo
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
