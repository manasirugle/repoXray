"use client";

import { useEffect, useRef, useCallback } from "react";
import { CYCLING_TABS, TabId } from "./data";

export type DemoStage =
  | "launcher"
  | "opening"
  | "chat"
  | "pasting"
  | "sending"
  | "thinking"
  | "steps"
  | "expanding"
  | "dashboard"
  | "cycling"
  | "closing";

export interface DemoState {
  stage: DemoStage;
  inputText: string;
  showUserBubble: boolean;
  showThinking: boolean;
  visibleSteps: number;
  activeTab: TabId;
  dashboardVisible: boolean;
  tabCycleIndex: number;
}

export const INITIAL_STATE: DemoState = {
  stage: "launcher",
  inputText: "",
  showUserBubble: false,
  showThinking: false,
  visibleSteps: 0,
  activeTab: "architecture",
  dashboardVisible: false,
  tabCycleIndex: 0,
};

// Timing constants (ms) — match prompt spec exactly
const T = {
  LAUNCHER_TO_OPEN: 1400,
  OPEN_TO_PASTE: 450,
  PASTE_TO_SEND: 350,
  SEND_PRESS: 150,
  BUBBLE_TO_THINKING: 300,
  THINKING_TO_STEPS: 700,
  STEP_STAGGER: 300,
  STEPS_HOLD: 500,
  STEPS_TO_EXPAND: 350,
  TAB_HOLD: 2000,
  DASHBOARD_HOLD: 1600,
  CLOSE_TO_LAUNCHER: 400,
  LOOP_PAUSE: 1600,
};

const REPO_URL_STR = "https://github.com/PrernaKale02/HireReady";
const CHUNKS = 6;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useDemoLoop(
  onStateChange: (patch: Partial<DemoState>) => void,
  getIsOpen: () => boolean
) {
  const runningRef = useRef(false);
  const cancelRef = useRef(false);

  // Stabilize callbacks in refs to prevent timer restart loops on state re-renders
  const onStateChangeRef = useRef(onStateChange);
  const getIsOpenRef = useRef(getIsOpen);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    getIsOpenRef.current = getIsOpen;
  });

  const check = () => {
    if (cancelRef.current) throw new Error("CANCELLED");
  };

  const runCycle = async () => {
    try {
      const setState = (patch: Partial<DemoState>) => onStateChangeRef.current(patch);

      // 1. Launcher stage
      if (!getIsOpenRef.current()) {
        setState({ stage: "launcher" });
        await sleep(T.LAUNCHER_TO_OPEN);
        check();
      }

      // 2. Open widget
      setState({
        stage: "opening",
        inputText: "",
        showUserBubble: false,
        showThinking: false,
        visibleSteps: 0,
        activeTab: "architecture",
        dashboardVisible: false,
        tabCycleIndex: 0,
      });
      await sleep(T.OPEN_TO_PASTE);
      check();

      // 3. Paste URL in chunks
      setState({ stage: "pasting" });
      const chunkSize = Math.ceil(REPO_URL_STR.length / CHUNKS);
      for (let i = 1; i <= CHUNKS; i++) {
        const text = REPO_URL_STR.slice(0, i * chunkSize);
        setState({ inputText: text });
        await sleep(T.PASTE_TO_SEND / CHUNKS);
        check();
      }
      setState({ inputText: REPO_URL_STR });
      await sleep(80);
      check();

      // 4. Send press
      setState({ stage: "sending" });
      await sleep(T.SEND_PRESS);
      check();

      // 5. User bubble appears
      setState({ showUserBubble: true, inputText: "" });
      await sleep(T.BUBBLE_TO_THINKING);
      check();

      // 6. Thinking bubble
      setState({ showThinking: true, stage: "thinking" });
      await sleep(T.THINKING_TO_STEPS);
      check();

      // 7. Steps stagger
      setState({ stage: "steps", showThinking: false });
      for (let i = 1; i <= 3; i++) {
        setState({ visibleSteps: i });
        await sleep(T.STEP_STAGGER);
        check();
      }
      await sleep(T.STEPS_HOLD);
      check();

      // 8. Expand to dashboard
      setState({ stage: "expanding" });
      await sleep(T.STEPS_TO_EXPAND);
      check();
      setState({ stage: "dashboard", dashboardVisible: true });

      // 9. Cycle through 3 tabs
      setState({ stage: "cycling" });
      for (let i = 0; i < CYCLING_TABS.length; i++) {
        setState({ activeTab: CYCLING_TABS[i], tabCycleIndex: i });
        await sleep(T.TAB_HOLD);
        check();
      }

      // 10. Hold, then close
      await sleep(T.DASHBOARD_HOLD);
      check();
      setState({ stage: "closing" });
      await sleep(T.CLOSE_TO_LAUNCHER);
      check();

      // 11. Reset to launcher
      setState({ ...INITIAL_STATE, stage: "launcher" });
      await sleep(T.LOOP_PAUSE);
      check();
    } catch {
      runningRef.current = false;
    }
  };

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    cancelRef.current = false;

    const loop = async () => {
      while (runningRef.current && !cancelRef.current) {
        await runCycle();
      }
    };
    loop();
  }, []);

  const stop = useCallback(() => {
    cancelRef.current = true;
    runningRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      runningRef.current = false;
    };
  }, []);

  return { start, stop };
}
