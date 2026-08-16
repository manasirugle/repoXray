// Static mock data for the Chat Launcher Demo widget

export type TabId = "architecture" | "security" | "files" | "chat" | "diff";

export interface Tab {
  id: TabId;
  icon: string;
  label: string;
}

export const TABS: Tab[] = [
  { id: "architecture", icon: "✦", label: "Architecture Overview" },
  { id: "security", icon: "◈", label: "Security Audit" },
  { id: "files", icon: "≡", label: "File Explorer" },
  { id: "chat", icon: "↺", label: "AI Chat Console" },
  { id: "diff", icon: "⇄", label: "Architecture Diff" },
];

// Only the shipped tabs auto-cycle in the demo
export const CYCLING_TABS: TabId[] = ["architecture", "security", "files", "chat"];

export type TabContent =
  | { type: "architecture" }
  | { type: "security" }
  | { type: "files" }
  | { type: "chat" }
  | { type: "diff" };

export const REPO_URL = "https://github.com/PrernaKale02/HireReady";
export const REPO_NAME = "HireReady";
export const REPO_OWNER_PATH = "github.com/PrernaKale02/HireReady";
export const REPO_FILES = 21;
export const REPO_ISSUES = 37;

export const TOOL_STEPS = [
  "Cloning repository",
  "Running static analyzers",
  "Building vector embeddings",
];
