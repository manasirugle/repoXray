"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { AlertTriangle, GitCompareArrows, LoaderCircle, Network, RefreshCw } from "lucide-react";
import type { User } from "firebase/auth";
import { getIdToken } from "../config/firebase";
import Markdown from "./Markdown";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://coderecall.onrender.com";

function diffSelectionKey(repoUrl: string, user: User | null) {
  return `repoxray-architecture-diff-selection:${user?.uid || "guest"}:${repoUrl}`;
}
const MAX_VISIBLE_NODES = 180;

interface CommitRef {
  name: string;
  type: "branch" | "tag";
}

interface CommitVersion {
  commit_id: string;
  short_id: string;
  message: string;
  author: string;
  committed_at: string;
  refs: CommitRef[];
}

interface GraphEvidence {
  file_path: string;
  line?: number;
  excerpt?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  file_path: string;
  status?: "added" | "removed" | "modified" | "unchanged";
  evidence: GraphEvidence[];
  changes?: { change: string; relationship: GraphEdge }[];
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  status?: "added" | "removed" | "modified" | "unchanged";
  evidence: GraphEvidence[];
}

interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  analysis: {
    files_analyzed: number;
    files_skipped_oversized: number;
    truncated: boolean;
    warnings: string[];
  };
}

interface DiffResult {
  base_graph: ArchitectureGraph;
  target_graph: ArchitectureGraph;
  added_components: GraphNode[];
  removed_components: GraphNode[];
  modified_components: GraphNode[];
  added_relationships: GraphEdge[];
  removed_relationships: GraphEdge[];
  summary: {
    added_components: number;
    removed_components: number;
    modified_components: number;
    added_relationships: number;
    removed_relationships: number;
  };
  warnings: string[];
  explanation: { status: "available" | "unavailable"; text: string; error?: string };
}

interface ComponentNodeData extends Record<string, unknown> {
  label: string;
  filePath: string;
  kind: string;
  status: string;
}

type ComponentFlowNode = Node<ComponentNodeData, "component">;

const STATUS_STYLE: Record<string, { border: string; background: string; text: string }> = {
  added: { border: "#16a34a", background: "#f0fdf4", text: "#166534" },
  removed: { border: "#dc2626", background: "#fef2f2", text: "#991b1b" },
  modified: { border: "#d97706", background: "#fffbeb", text: "#92400e" },
  unchanged: { border: "#94a3b8", background: "#f8fafc", text: "#334155" },
};

function ComponentNodeView({ data }: NodeProps<ComponentFlowNode>) {
  const colors = STATUS_STYLE[data.status] || STATUS_STYLE.unchanged;
  return (
    <div
      className="w-[210px] rounded border bg-white px-3 py-2 shadow-sm"
      style={{ borderColor: colors.border, backgroundColor: colors.background }}
      title={data.filePath}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2" />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold" style={{ color: colors.text }}>{data.label}</span>
        <span className="shrink-0 text-[9px] uppercase" style={{ color: colors.text }}>{data.status}</span>
      </div>
      <div className="mt-1 truncate font-mono text-[9px] text-slate-500">{data.filePath}</div>
      <div className="mt-1 text-[9px] uppercase text-slate-500">{data.kind}</div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2" />
    </div>
  );
}

const nodeTypes = { component: ComponentNodeView };

function graphToFlow(graph: ArchitectureGraph): { nodes: ComponentFlowNode[]; edges: Edge[]; hiddenCount: number } {
  const ordered = [...graph.nodes].sort((first, second) => {
    const firstChanged = first.status && first.status !== "unchanged" ? 0 : 1;
    const secondChanged = second.status && second.status !== "unchanged" ? 0 : 1;
    return firstChanged - secondChanged || first.file_path.localeCompare(second.file_path) || first.label.localeCompare(second.label);
  });
  const selected = ordered.slice(0, MAX_VISIBLE_NODES);
  const selectedIds = new Set(selected.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map(selected.map((node) => [node.id, 0]));
  const edges = graph.edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target));

  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge.target]);
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
  }

  const layers = new Map<string, number>();
  const queue = [...selected]
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id)
    .sort();
  for (const node of selected) layers.set(node.id, 0);
  while (queue.length) {
    const current = queue.shift()!;
    for (const target of outgoing.get(current) || []) {
      layers.set(target, Math.max(layers.get(target) || 0, (layers.get(current) || 0) + 1));
      indegree.set(target, (indegree.get(target) || 1) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }

  const layerGroups = new Map<number, GraphNode[]>();
  for (const node of selected) {
    const layer = layers.get(node.id) || 0;
    layerGroups.set(layer, [...(layerGroups.get(layer) || []), node]);
  }
  const positions = new Map<string, { x: number; y: number }>();
  for (const [layer, layerNodes] of layerGroups) {
    layerNodes.sort((first, second) => first.file_path.localeCompare(second.file_path) || first.label.localeCompare(second.label));
    layerNodes.forEach((node, index) => positions.set(node.id, { x: 28 + layer * 270, y: 28 + index * 112 }));
  }

  return {
    nodes: selected.map((node) => ({
      id: node.id,
      type: "component",
      position: positions.get(node.id) || { x: 28, y: 28 },
      data: {
        label: node.label,
        filePath: node.file_path,
        kind: node.type,
        status: node.status || "unchanged",
      },
    })),
    edges: edges.map((edge) => {
      const status = edge.status || "unchanged";
      const color = STATUS_STYLE[status]?.border || STATUS_STYLE.unchanged.border;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: status === "unchanged" ? 1.25 : 2 },
        labelStyle: { fill: "#475569", fontSize: 9 },
      };
    }),
    hiddenCount: Math.max(0, graph.nodes.length - selected.length),
  };
}

function GraphView({ title, graph }: { title: string; graph: ArchitectureGraph }) {
  const flow = useMemo(() => graphToFlow(graph), [graph]);
  return (
    <section className="min-w-0 overflow-hidden rounded border border-glass bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3 border-b border-glass px-4 py-3">
        <h4 className="truncate text-sm font-bold text-white">{title}</h4>
        <span className="shrink-0 text-[11px] text-secondary">
          {graph.nodes.length} nodes · {graph.edges.length} relationships
        </span>
      </div>
      <div className="h-[420px] bg-white/[0.82]">
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.08}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={(node) => STATUS_STYLE[String(node.data.status)]?.border || STATUS_STYLE.unchanged.border} />
        </ReactFlow>
      </div>
      {flow.hiddenCount > 0 && (
        <p className="border-t border-glass px-4 py-2 text-xs text-amber-700">
          Showing 180 nodes, prioritizing changed components. {flow.hiddenCount} unchanged nodes are omitted from this view.
        </p>
      )}
    </section>
  );
}

function versionLabel(version: CommitVersion): string {
  const refs = version.refs.map((ref) => `${ref.type}: ${ref.name}`).join(", ");
  const date = new Date(version.committed_at).toLocaleDateString();
  return `${refs ? `${refs} · ` : ""}${version.short_id} · ${version.message} · ${date}`;
}

function evidenceLabel(item: GraphNode | GraphEdge): string {
  const evidence = item.evidence?.[0];
  return evidence ? `${evidence.file_path}${evidence.line ? `:${evidence.line}` : ""}` : "No file evidence recorded";
}

function ChangeSection({ title, items, color }: { title: string; items: (GraphNode | GraphEdge)[]; color: string }) {
  return (
    <section className="border-t border-glass py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <span className={`text-xs font-bold ${color}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted">None detected.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const relationship = "source" in item;
            const titleText = relationship
              ? `${item.source.replace(/^(file|class|interface):/, "")} → ${item.target.replace(/^(file|class|interface):/, "")}`
              : `${item.label} · ${item.file_path}`;
            return (
              <li key={item.id} className="flex flex-col gap-1 rounded border border-glass bg-white/[0.02] px-3 py-2">
                <span className="break-all text-xs font-semibold text-secondary">{titleText}</span>
                <span className="break-all font-mono text-[10px] text-cyan-500">{evidenceLabel(item)}</span>
                {"changes" in item && item.changes?.map((change, index) => (
                  <span key={`${change.change}-${change.relationship.id}-${index}`} className="break-all text-[10px] text-amber-600">
                    {change.change} {change.relationship.type}: {change.relationship.source} → {change.relationship.target}
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function ArchitectureDiffPanel({ repoUrl, user }: { repoUrl: string; user: User | null }) {
  const selectionKey = diffSelectionKey(repoUrl, user);
  const [commits, setCommits] = useState<CommitVersion[]>([]);
  const [baseCommit, setBaseCommit] = useState("");
  const [targetCommit, setTargetCommit] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [historyLimited, setHistoryLimited] = useState(false);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadCommits = async () => {
      setHistoryLoading(true);
      setError(null);
      setResult(null);
      setCommits([]);
      setBaseCommit("");
      setTargetCommit("");
      try {
        const token = await getIdToken(user);
        const response = await fetch(
          `${BACKEND_URL}/api/repo/commits?repo_url=${encodeURIComponent(repoUrl)}`,
          { headers: { Authorization: token ? `Bearer ${token}` : "" } },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || data.message || "Could not load repository history.");
        if (!active) return;
        const versions: CommitVersion[] = Array.isArray(data.commits) ? data.commits : [];
        setCommits(versions);
        setHistoryLimited(Boolean(data.history_limited));
        if (versions.length > 1) {
          let savedSelection: { baseCommit?: string; targetCommit?: string } | null = null;
          try {
            savedSelection = JSON.parse(localStorage.getItem(selectionKey) || "null");
          } catch {
            savedSelection = null;
          }
          const commitIds = new Set(versions.map((version) => version.commit_id));
          const hasSavedPair = savedSelection?.baseCommit && savedSelection.targetCommit &&
            savedSelection.baseCommit !== savedSelection.targetCommit &&
            commitIds.has(savedSelection.baseCommit) && commitIds.has(savedSelection.targetCommit);
          setBaseCommit(hasSavedPair && savedSelection?.baseCommit ? savedSelection.baseCommit : versions[versions.length - 1].commit_id);
          setTargetCommit(hasSavedPair && savedSelection?.targetCommit ? savedSelection.targetCommit : versions[0].commit_id);
        }
        if (!versions.length) setError(data.message || "No useful Git history is available for this repository.");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load repository history.");
      } finally {
        if (active) setHistoryLoading(false);
      }
    };
    loadCommits();
    return () => { active = false; };
  }, [repoUrl, user, selectionKey]);

  const saveSelection = (base: string, target: string) => {
    setBaseCommit(base);
    setTargetCommit(target);
    try {
      localStorage.setItem(selectionKey, JSON.stringify({ baseCommit: base, targetCommit: target }));
    } catch (storageError) {
      console.warn("Could not save the selected architecture comparison in this browser.", storageError);
    }
  };

  useEffect(() => {
    if (!baseCommit || !targetCommit || baseCommit === targetCommit) {
      setResult(null);
      return;
    }
    let active = true;
    setResult(null);
    const loadSavedDiff = async () => {
      try {
        const token = await getIdToken(user);
        const params = new URLSearchParams({ repo_url: repoUrl, base_commit: baseCommit, target_commit: targetCommit });
        const response = await fetch(`${BACKEND_URL}/api/repo/architecture-diff?${params}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (!active) return;
        if (response.ok) setResult(await response.json() as DiffResult);
      } catch {
        // A missing saved comparison is normal; the user can run it with Compare.
      }
    };
    loadSavedDiff();
    return () => { active = false; };
  }, [repoUrl, user, baseCommit, targetCommit]);

  const handleCompare = async () => {
    if (!baseCommit || !targetCommit || baseCommit === targetCommit) return;
    setComparing(true);
    setError(null);
    setResult(null);
    try {
      const token = await getIdToken(user);
      const response = await fetch(`${BACKEND_URL}/api/repo/architecture-diff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ repo_url: repoUrl, base_commit: baseCommit, target_commit: targetCommit }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "Architecture comparison failed.");
      setResult(data as DiffResult);
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : "Architecture comparison failed.");
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="glass-panel p-5 bg-white/[0.01]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
            <GitCompareArrows size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-lg font-extrabold text-white">Architecture Diff</h3>
            <p className="truncate text-xs text-secondary" title={repoUrl}>{repoUrl.split("/").pop()}</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center gap-2 py-5 text-sm text-secondary">
            <LoaderCircle size={16} className="animate-spin text-cyan-400" /> Fetching commits and refs...
          </div>
        ) : commits.length > 1 ? (
          <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-2">
            <label className="block text-xs font-semibold text-secondary">
              Base Version
              <select className="glass-input mt-2 w-full py-2 text-sm" value={baseCommit} onChange={(event) => saveSelection(event.target.value, targetCommit)}>
                {commits.map((commit) => <option key={commit.commit_id} value={commit.commit_id}>{versionLabel(commit)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-secondary">
              Compare With
              <select className="glass-input mt-2 w-full py-2 text-sm" value={targetCommit} onChange={(event) => saveSelection(baseCommit, event.target.value)}>
                {commits.map((commit) => <option key={commit.commit_id} value={commit.commit_id}>{versionLabel(commit)}</option>)}
              </select>
            </label>
            <button
              onClick={handleCompare}
              disabled={comparing || !baseCommit || !targetCommit || baseCommit === targetCommit}
              style={{ gridColumn: "1 / -1", width: "100%", minWidth: "220px", overflow: "visible" }}
              className="glass-btn flex h-10 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              {comparing ? <LoaderCircle size={15} className="animate-spin" /> : <GitCompareArrows size={15} />}
              <span className="shrink-0 whitespace-nowrap">{comparing ? "Comparing" : "Compare Architecture"}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-secondary">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <span>{error || "At least two available commits are needed to compare architecture."}</span>
          </div>
        )}
        {historyLimited && <p className="mt-3 text-[11px] text-amber-500">Showing the most recent available commits from the fetched history.</p>}
        {error && commits.length > 1 && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}
      </section>

      {comparing && (
        <div className="flex items-center gap-2 border-y border-glass py-4 text-sm text-secondary">
          <RefreshCw size={15} className="animate-spin text-cyan-400" /> Checking out both versions and extracting dependencies...
        </div>
      )}

      {result && (
        <>
          <section className="glass-panel p-5 bg-white/[0.01]">
            <div className="mb-4 flex items-center gap-2 text-cyan-400">
              <Network size={17} />
              <h3 className="text-sm font-bold text-white">Structural Change Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ["Added Components", result.summary.added_components, "text-emerald-400"],
                ["Removed Components", result.summary.removed_components, "text-rose-400"],
                ["Modified Components", result.summary.modified_components, "text-amber-400"],
                ["Added Relationships", result.summary.added_relationships, "text-emerald-400"],
                ["Removed Relationships", result.summary.removed_relationships, "text-rose-400"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="border-l-2 border-glass px-3 py-2">
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <div className="mt-1 text-[10px] uppercase text-secondary">{label}</div>
                </div>
              ))}
            </div>
          </section>

          {result.warnings.length > 0 && (
            <div className="flex items-start gap-2 border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <div>{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <GraphView title="Base Architecture" graph={result.base_graph} />
            <GraphView title="Target Architecture" graph={result.target_graph} />
          </div>

          <section className="glass-panel p-5 bg-white/[0.01]">
            <h3 className="mb-3 text-sm font-bold text-white">Detected Changes and Evidence</h3>
            <ChangeSection title="Added Components" items={result.added_components} color="text-emerald-400" />
            <ChangeSection title="Removed Components" items={result.removed_components} color="text-rose-400" />
            <ChangeSection title="Modified Components" items={result.modified_components} color="text-amber-400" />
            <ChangeSection title="Added Relationships" items={result.added_relationships} color="text-emerald-400" />
            <ChangeSection title="Removed Relationships" items={result.removed_relationships} color="text-rose-400" />
          </section>

          <section className="glass-panel p-5 bg-white/[0.01]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white">Gemini Explanation</h3>
              {result.explanation.status === "unavailable" && <span className="text-xs text-amber-500">Unavailable</span>}
            </div>
            <div className="prose prose-invert max-w-none text-secondary">
              <Markdown content={result.explanation.text} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
