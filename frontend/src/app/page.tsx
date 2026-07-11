"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  GitBranch,
  Shield,
  FileCode2,
  MessageSquare,
  ArrowRight,
  Database,
  History,
  AlertTriangle,
  FileText,
  Search,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Code,
  Trash2,
  Download,
  Users,
  LogOut,
  User as UserIcon,
  Zap,
  BarChart3,
  Lock,
  FileDown,
  Layers,
  Bot,
  Sun,
  Moon,
  Menu,
  GitCompareArrows
} from "lucide-react";
import type { User } from "firebase/auth";
import { auth, signInWithGoogle, logoutUser, getIdToken, onAuthStateChanged } from "../config/firebase";
import Markdown from "../components/Markdown";
import CodeViewer from "../components/CodeViewer";
import ChatPanel from "../components/ChatPanel";
import { generatePdf } from "../components/PdfExport";
import PhaseTwoModal from "../components/PhaseTwoModal";

// Definitions
interface RepositoryFileStatus {
  file_path: string;
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  error?: string;
}

interface Repository {
  repo_url: string;
  total_files: number;
  completed_files: number;
  pending_files: number;
  processing_files: number;
  error_files: number;
  status: "pending" | "processing" | "completed" | "error" | "unknown";
  has_report: boolean;
  files?: RepositoryFileStatus[];
}

interface FileSummary {
  file_path: string;
  language: string;
  summary: string;
  key_components: string[];
}

interface Vulnerability {
  file_path: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | string;
}

interface RepoReport {
  repo_url: string;
  global_overview: string;
  security_audit: string;
  files: FileSummary[];
  vulnerabilities: Vulnerability[];
}

interface SelectedFileDetails {
  file_path: string;
  language: string;
  content: string;
  summary: string;
  key_components: string[];
}

interface PlatformAnalytics {
  total_repositories_scanned: number;
  total_platform_users: number;
  user_repositories_scanned: number;
}

interface PublicStats {
  total_repositories_scanned: number;
  total_platform_users: number;
  total_files_analyzed: number;
}


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://coderecall.onrender.com";

// Review-version flag: PDF export and repo refresh stay fully implemented but are
// hidden from the UI while this is false. Set to true to show the buttons again.
const SHOW_PDF_AND_REFRESH_ACTIONS = false;
const ADMIN_EMAIL = "aryankale1410@gmail.com";

const FUNNY_EXCUSES = [
  "☕ Gemini is taking a coffee break. Free-tier struggles are real...",
  "🤝 Negotiating with the Master Architect. He wants a raise in tokens...",
  "🙈 Asking the Security Auditor to look away from our API key limits...",
  "🚴 Render's free-tier CPU is pedaling its bicycle generator as fast as it can...",
  "📝 Translating files from 'developer gibberish' to 'architect speak'...",
  "😴 Waiting for the Gemini model to wake up from its rate-limit nap...",
  "📜 The Master Explainer is drafting a 500-page report. Please hold...",
  "📦 Trying to fit the entire repository structure into a free-tier context window..."
];

export default function Home() {
  // Navigation & Workspace State
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoUrl, setSelectedRepoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "security" | "files" | "chat">("overview");

  // Phase 2 feature preview modal (holds the feature title, or null when closed)
  const [phaseTwoFeature, setPhaseTwoFeature] = useState<string | null>(null);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Mobile layout menu & dropdown states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileUserDropdown, setShowMobileUserDropdown] = useState(false);
  const mobileDropdownRef = useRef<HTMLDivElement | null>(null);

  // Platform Analytics State
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  // Public stats for landing page (unauthenticated)
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);

  // Landing page scroll state
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  // Dark mode theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Effect to apply the theme class to document element dynamically and save to localStorage
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Ingestion Input Form
  const [repoInput, setRepoInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in.");
    }
  };

  // Live Pipeline Progress Status
  const [pipelineStatus, setPipelineStatus] = useState<Repository | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Loaded Repo Reports
  const [report, setReport] = useState<RepoReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // File Details Drawer
  const [selectedFile, setSelectedFile] = useState<SelectedFileDetails | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  // Search Filters
  const [fileSearch, setFileSearch] = useState("");
  const [vulnFilter, setVulnFilter] = useState<string>("all");

  // Live Pipeline Progress Logs & Auto-scroll Ref
  const [pipelineLogs, setPipelineLogs] = useState<{ time: string; message: string }[]>([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  // Funny excuses timer during the Reduce Phase
  const [funnyExcuseIdx, setFunnyExcuseIdx] = useState(0);

  // Repository Deletion Overlay States
  const [deleteConfirmRepo, setDeleteConfirmRepo] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load: Fetch Repository History
  const fetchReposHistory = async (currentUser: User | null = user) => {
    if (!currentUser) return;
    try {
      const token = await getIdToken(currentUser);
      const res = await fetch(`${BACKEND_URL}/api/repos`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRepos(data);
      }
    } catch (err) {
      console.error("Failed to load historical repos:", err);
    }
  };

  // Fetch Platform Analytics (Derived dynamically from the single RepositoryFile table)
  const fetchAnalytics = async (currentUser: User | null = user) => {
    if (!currentUser) return;
    try {
      const token = await getIdToken(currentUser);
      const res = await fetch(`${BACKEND_URL}/api/analytics`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      const data = await res.json();
      if (data && !data.detail) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load platform analytics:", err);
    }
  };

  // Fetch public stats (no auth required) for landing page
  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/analytics/public`);
        const data = await res.json();
        if (data && typeof data.total_repositories_scanned === "number") {
          setPublicStats(data);
        }
      } catch (err) {
        // Silently fail — landing page works without stats
      }
    };
    fetchPublicStats();
  }, []);

  // Firebase auth listener
  useEffect(() => {
    // Handle redirect result for mobile devices
    const handleRedirectResult = async () => {
      try {
        const { getRedirectResult } = await import("firebase/auth");
        const result = await getRedirectResult(auth);
        if (result) {
          setAuthError(null);
        }
      } catch (err: any) {
        console.error("Error fetching redirect result:", err);
        setAuthError(err.message || "Authentication redirect failed.");
      }
    };
    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchReposHistory(currentUser);
        fetchAnalytics(currentUser);
      } else {
        setRepos([]);
        setAnalytics(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Funny excuses rotation timer during the Reduce Phase
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const isReducing = 
      pipelineStatus && 
      pipelineStatus.total_files > 0 && 
      (pipelineStatus.completed_files + pipelineStatus.error_files === pipelineStatus.total_files) && 
      pipelineStatus.status === "processing";
      
    if (isReducing) {
      interval = setInterval(() => {
        setFunnyExcuseIdx((prev) => (prev + 1) % FUNNY_EXCUSES.length);
      }, 3000);
    } else {
      setFunnyExcuseIdx(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pipelineStatus]);

  // Landing page scroll observer for reveal animations + sticky nav
  useEffect(() => {
    if (user) return; // Only on landing page

    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.15 }
    );

    setTimeout(() => {
      document.querySelectorAll(".reveal-section").forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [user]);

  // Dropdown click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) {
        setShowMobileUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 2. Poll Status of Active Repository Ingestion Pipeline
  const startStatusPolling = (repoUrl: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    setIsPolling(true);
    setPipelineLogs([]); // Reset log buffer when starting polling
    
    const poll = async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch(`${BACKEND_URL}/api/repo/status?repo_url=${encodeURIComponent(repoUrl)}`, {
          headers: {
            "Authorization": token ? `Bearer ${token}` : ""
          }
        });
        const statusData: Repository = await res.json();
        
        setPipelineStatus(statusData);

        // Update in history list
        setRepos((prev) =>
          prev.map((r) => (r.repo_url === repoUrl ? { ...r, ...statusData } : r))
        );

        // Streaming pipeline logs polling
        const resLogs = await fetch(`${BACKEND_URL}/api/repo/logs?repo_url=${encodeURIComponent(repoUrl)}`);
        const logsData = await resLogs.json();
        if (Array.isArray(logsData)) {
          setPipelineLogs(logsData);
        }

        if (statusData.has_report) {
          // Ingestion and global reports are completely finished! Fetch reports
          stopStatusPolling();
          fetchRepoReport(repoUrl, user);
          fetchAnalytics(user); // refresh analytics after complete
        } else if (statusData.status === "error") {
          stopStatusPolling();
        }
      } catch (err) {
        console.error("Polling status error:", err);
      }
    };

    poll(); // Run instantly first
    pollingIntervalRef.current = setInterval(poll, 3000);
  };

  const stopStatusPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  const handleStopIngestion = async () => {
    if (!pipelineStatus || !user) return;
    setIsStopping(true);
    try {
      stopStatusPolling();
      const token = await getIdToken(user);
      const res = await fetch(`${BACKEND_URL}/api/repo/stop`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ repo_url: pipelineStatus.repo_url })
      });
      const data = await res.json();
      if (data && data.status === "success") {
        setPipelineStatus(null);
        setSelectedRepoUrl(null);
        fetchReposHistory(user);
        fetchAnalytics(user);
      }
    } catch (err) {
      console.error("Error stopping repository ingestion:", err);
    } finally {
      setIsStopping(false);
    }
  };

  useEffect(() => {
    return () => stopStatusPolling();
  }, []);

  // Auto-scroll pipeline terminal (non-disruptive for mobile viewports)
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [pipelineLogs]);

  // Handle repository deletion
  const handleDeleteRepo = async (repoUrl: string) => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`${BACKEND_URL}/api/repo/stop`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ repo_url: repoUrl })
      });
      const data = await res.json();
      if (data && data.status === "success") {
        setDeleteConfirmRepo(null);
        fetchReposHistory(user);
        fetchAnalytics(user);
        if (selectedRepoUrl === repoUrl) {
          setSelectedRepoUrl(null);
          setReport(null);
          setPipelineStatus(null);
          stopStatusPolling();
        }
      }
    } catch (err) {
      console.error("Error deleting repository:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. Fetch Full Reports (Overview, Security, File list)
  const fetchRepoReport = async (repoUrl: string, currentUser: User | null = user) => {
    if (!currentUser) return;
    setReportLoading(true);
    setPipelineStatus(null);
    try {
      const token = await getIdToken(currentUser);
      const res = await fetch(`${BACKEND_URL}/api/repo/report?repo_url=${encodeURIComponent(repoUrl)}`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      const data: RepoReport = await res.json();
      setReport(data);
      setSelectedRepoUrl(repoUrl);
    } catch (err) {
      console.error("Error fetching repository report:", err);
    } finally {
      setReportLoading(false);
    }
  };

  // 4. Ingest new repository URL
  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim() || !user) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setReport(null);

    const targetUrl = repoInput.trim();

    try {
      const token = await getIdToken(user);
      const res = await fetch(`${BACKEND_URL}/api/ingest`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ repo_url: targetUrl })
      });

      const data = await res.json();

      if (data && data.status === "accepted") {
        // Success: start status polling
        setSelectedRepoUrl(targetUrl);
        setPipelineStatus({
          repo_url: targetUrl,
          total_files: 0,
          completed_files: 0,
          pending_files: 0,
          processing_files: 0,
          error_files: 0,
          status: "pending",
          has_report: false
        });
        startStatusPolling(targetUrl);
        setRepoInput("");
        fetchReposHistory(user); // update history list
      } else {
        setSubmitError(data.message || data.detail || "Failed to submit repository url for analysis.");
      }
    } catch (err) {
      setSubmitError("Failed to connect to the backend server. Please verify FastAPI is running.");
      console.error("Submit repo error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Select repo from historical list
  const handleSelectHistoryRepo = (historyRepo: Repository) => {
    stopStatusPolling();
    setSelectedFile(null);
    setReport(null);
    setPipelineStatus(null);
    setMobileMenuOpen(false);

    if (historyRepo.has_report) {
      fetchRepoReport(historyRepo.repo_url, user);
    } else {
      // It is still pending, processing, or reducing! Show progress dashboard
      setSelectedRepoUrl(historyRepo.repo_url);
      setPipelineStatus(historyRepo);
      startStatusPolling(historyRepo.repo_url);
    }
  };

  // 6. Fetch details of a single file for the Side drawer
  const handleSelectFile = async (filePath: string) => {
    if (!selectedRepoUrl || !user) return;
    setFileLoading(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch(
        `${BACKEND_URL}/api/repo/file?repo_url=${encodeURIComponent(
          selectedRepoUrl
        )}&file_path=${encodeURIComponent(filePath)}`,
        {
          headers: {
            "Authorization": token ? `Bearer ${token}` : ""
          }
        }
      );
      const data = await res.json();
      if (data && data.status !== "error") {
        setSelectedFile({
          file_path: data.file_path,
          language: data.language,
          content: data.content,
          summary: data.summary,
          key_components: data.key_components
        });
      }
    } catch (err) {
      console.error("Error loading file details:", err);
    } finally {
      setFileLoading(false);
    }
  };

  // Filtered lists
  const filteredFiles = report?.files.filter((f) =>
    f.file_path.toLowerCase().includes(fileSearch.toLowerCase()) ||
    f.language.toLowerCase().includes(fileSearch.toLowerCase())
  ) || [];

  const filteredVulns = report?.vulnerabilities.filter((v) => {
    if (vulnFilter === "all") return true;
    return v.severity.toLowerCase() === vulnFilter;
  }) || [];

  // Helper status color getters
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case "processing":
        return <RefreshCw size={16} className="text-cyan-400 animate-spin" />;
      case "pending":
        return <Clock size={16} className="text-amber-400 animate-pulse" />;
      case "error":
        return <XCircle size={16} className="text-rose-400" />;
      default:
        return <HelpCircle size={16} className="text-gray-400" />;
    }
  };

  // -------------------------------------------------------------
  // RENDERING LOGIC
  // -------------------------------------------------------------

  // 1. Auth Loading State
  if (authLoading) {
    return (
      <div className="auth-loader-screen">
        <RefreshCw size={48} className="text-violet-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-white font-heading">Securing Connection...</h3>
        <p className="text-secondary text-xs mt-1">Verifying identity certificates with Firebase.</p>
      </div>
    );
  }

  // 2. Unauthenticated State — FAANG-Grade Multi-Section Landing Page
  if (!user) {
    return (
      <div className="lp">


        {/* ====== STICKY NAVIGATION BAR ====== */}
        <nav className={`lp-nav ${scrolled ? "lp-nav-scrolled" : ""}`}>
          <div className="lp-nav-inner">
            <div className="lp-nav-brand">
              <div className="lp-nav-logo">Ω</div>
              <span className="lp-nav-name">REPO<span className="lp-nav-name-accent">XRAY</span></span>
            </div>
            <div className="lp-nav-links">
              <a href="#features" className="lp-nav-link">Features</a>
              <a href="#how-it-works" className="lp-nav-link">How It Works</a>
              <a href="#tech-stack" className="lp-nav-link">Tech Stack</a>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 rounded-lg border border-glass flex items-center justify-center text-secondary hover:text-white transition-colors"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                style={{ width: "34px", height: "34px" }}
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button onClick={handleSignIn} className="lp-nav-cta">
                Get Started
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </nav>

        {/* ====== HERO SECTION ====== */}
        <section className="lp-hero">
          <div className="lp-hero-content">
            {/* Badge */}
            <div className="lp-hero-badge">
              <Sparkles size={14} />
              <span>Powered by Gemini AI</span>
            </div>

            <h1 className="lp-hero-title">
              Ship <span className="lp-gradient-text">Secure Code</span>,
              <br />Faster Than Ever.
            </h1>

            <p className="lp-hero-subtitle">
              RepoXray is an AI-powered repository intelligence platform that deep-analyzes
              your codebase, detects vulnerabilities, generates architectural reports, and lets
              you query your code with natural language — all in real-time.
            </p>

            {/* CTA Group */}
            <div className="lp-hero-cta-group">
              <button onClick={handleSignIn} className="lp-hero-cta-primary">
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2A5.725 5.725 0 0 1 8.24 12.87a5.725 5.725 0 0 1 5.75-5.73c1.5 0 2.871.56 3.931 1.485l3.22-3.21C19.141 3.555 16.79 2.5 13.99 2.5C8.47 2.5 4 6.97 4 12.485s4.47 9.985 9.99 9.985c5.78 0 9.61-4.06 9.61-9.78c0-.66-.06-1.29-.17-1.89h-11.2v-.515z" />
                </svg>
                <span>Start with Google</span>
              </button>
              <a href="#features" className="lp-hero-cta-secondary">
                <span>Explore Features</span>
                <ChevronRight size={16} />
              </a>
            </div>

            {authError && (
              <div className="text-xs text-rose-400 mt-4 flex items-center justify-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 max-w-sm">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Live Platform Stats */}
            <div className="lp-hero-stats">
              <div className="lp-hero-stat">
                <Database size={16} className="lp-stat-icon lp-icon-cyan" />
                <span className="lp-stat-number">{publicStats?.total_repositories_scanned ?? "—"}</span>
                <span className="lp-stat-label">Repos Analyzed</span>
              </div>
              <div className="lp-hero-stat-divider" />
              <div className="lp-hero-stat">
                <Users size={16} className="lp-stat-icon lp-icon-violet" />
                <span className="lp-stat-number">{publicStats?.total_platform_users ?? "—"}</span>
                <span className="lp-stat-label">Engineers</span>
              </div>
              <div className="lp-hero-stat-divider" />
              <div className="lp-hero-stat">
                <FileCode2 size={16} className="lp-stat-icon lp-icon-fuchsia" />
                <span className="lp-stat-number">{publicStats?.total_files_analyzed ?? "—"}</span>
                <span className="lp-stat-label">Files Analyzed</span>
              </div>
            </div>
          </div>

          {/* Hero Visual — Floating Code Card */}
          <div className="lp-hero-visual">
            <div className="lp-code-card">
              <div className="lp-code-header">
                <div className="lp-code-dots">
                  <span className="lp-dot lp-dot-red" />
                  <span className="lp-dot lp-dot-yellow" />
                  <span className="lp-dot lp-dot-green" />
                </div>
                <span className="lp-code-title">architecture_report.md</span>
              </div>
              <div className="lp-code-body">
                <code><span className="lp-code-kw">##</span> <span className="lp-code-str">Architecture Overview</span></code>
                <code><span className="lp-code-comment">{"// AI-generated deep analysis"}</span></code>
                <code></code>
                <code><span className="lp-code-kw">├──</span> <span className="lp-code-fn">auth/</span> <span className="lp-code-comment">Firebase JWT verification</span></code>
                <code><span className="lp-code-kw">├──</span> <span className="lp-code-fn">services/</span> <span className="lp-code-comment">Map-Reduce pipeline</span></code>
                <code><span className="lp-code-kw">├──</span> <span className="lp-code-fn">rag/</span> <span className="lp-code-comment">pgvector similarity search</span></code>
                <code><span className="lp-code-kw">└──</span> <span className="lp-code-fn">reports/</span> <span className="lp-code-comment">PDF export engine</span></code>
                <code></code>
                <code><span className="lp-code-kw">⚠</span> <span className="lp-code-warn">3 vulnerabilities detected</span></code>
                <code><span className="lp-code-kw">✓</span> <span className="lp-code-success">Security audit complete</span></code>
              </div>
            </div>
          </div>
        </section>

        {/* ====== FEATURES SECTION ====== */}
        <section id="features" className={`lp-section reveal-section ${visibleSections.has("features") ? "lp-visible" : ""}`}>
          <div className="lp-section-inner">
            <div className="lp-section-header">
              <span className="lp-section-badge">Platform Capabilities</span>
              <h2 className="lp-section-title">Everything You Need to <span className="lp-gradient-text">Review Code</span></h2>
              <p className="lp-section-desc">Enterprise-grade AI analysis meets elegant developer experience.</p>
            </div>

            <div className="lp-features-grid">
              <div className="lp-feature-card">
                <div className="lp-feature-icon lp-fi-indigo"><Bot size={24} /></div>
                <h3 className="lp-feature-title">AI Architecture Analysis</h3>
                <p className="lp-feature-desc">Gemini deep-reasons over your entire codebase to produce master architectural overviews with dependency mapping.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon lp-fi-rose"><Shield size={24} /></div>
                <h3 className="lp-feature-title">Vulnerability Detection</h3>
                <p className="lp-feature-desc">Automated security audits with severity classification — Critical, High, Medium, Low — across every file.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon lp-fi-cyan"><MessageSquare size={24} /></div>
                <h3 className="lp-feature-title">RAG Chat Console</h3>
                <p className="lp-feature-desc">Ask questions about your codebase in natural language. Powered by pgvector semantic search and Gemini reasoning.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon lp-fi-amber"><Zap size={24} /></div>
                <h3 className="lp-feature-title">Real-time Pipeline</h3>
                <p className="lp-feature-desc">Live Map-Reduce streaming with terminal logs. Watch your repository being analyzed file-by-file in real-time.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon lp-fi-violet"><FileDown size={24} /></div>
                <h3 className="lp-feature-title">PDF Report Export</h3>
                <p className="lp-feature-desc">One-click comprehensive PDF reports with architecture overviews, security audits, and file-level analysis.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon lp-fi-emerald"><Lock size={24} /></div>
                <h3 className="lp-feature-title">Multi-Tenant Isolation</h3>
                <p className="lp-feature-desc">Firebase Auth with user-scoped data. Every engineer sees only their own repositories and reports.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ====== HOW IT WORKS SECTION ====== */}
        <section id="how-it-works" className={`lp-section lp-section-alt reveal-section ${visibleSections.has("how-it-works") ? "lp-visible" : ""}`}>
          <div className="lp-section-inner">
            <div className="lp-section-header">
              <span className="lp-section-badge">Simple Workflow</span>
              <h2 className="lp-section-title">Three Steps to <span className="lp-gradient-text">Code Intelligence</span></h2>
              <p className="lp-section-desc">From repository URL to comprehensive AI analysis in minutes.</p>
            </div>

            <div className="lp-steps">
              <div className="lp-step">
                <div className="lp-step-number">01</div>
                <div className="lp-step-connector" />
                <h3 className="lp-step-title">Clone & Index</h3>
                <p className="lp-step-desc">Submit a GitHub URL. We shallow-clone the repository, filter relevant source files, and build an index of your codebase.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-number">02</div>
                <div className="lp-step-connector" />
                <h3 className="lp-step-title">Analyze & Vectorize</h3>
                <p className="lp-step-desc">Gemini AI analyzes each file — generating summaries, detecting vulnerabilities, and creating vector embeddings for semantic search.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-number">03</div>
                <h3 className="lp-step-title">Review & Query</h3>
                <p className="lp-step-desc">Explore your generated architecture report, security audit, browse files, and chat with your codebase using natural language.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ====== TECH STACK SECTION ====== */}
        <section id="tech-stack" className={`lp-section reveal-section ${visibleSections.has("tech-stack") ? "lp-visible" : ""}`}>
          <div className="lp-section-inner">
            <div className="lp-section-header">
              <span className="lp-section-badge">Built With</span>
              <h2 className="lp-section-title">Modern <span className="lp-gradient-text">Tech Stack</span></h2>
              <p className="lp-section-desc">Engineered with industry-leading frameworks and infrastructure.</p>
            </div>

            <div className="lp-tech-grid">
              <div className="lp-tech-card">
                <Layers size={28} className="lp-tech-icon" />
                <span className="lp-tech-name">Next.js</span>
                <span className="lp-tech-role">Frontend</span>
              </div>
              <div className="lp-tech-card">
                <Zap size={28} className="lp-tech-icon" />
                <span className="lp-tech-name">FastAPI</span>
                <span className="lp-tech-role">Backend</span>
              </div>
              <div className="lp-tech-card">
                <Database size={28} className="lp-tech-icon" />
                <span className="lp-tech-name">PostgreSQL</span>
                <span className="lp-tech-role">Database</span>
              </div>
              <div className="lp-tech-card">
                <Search size={28} className="lp-tech-icon" />
                <span className="lp-tech-name">pgvector</span>
                <span className="lp-tech-role">Vector Search</span>
              </div>
              <div className="lp-tech-card">
                <Bot size={28} className="lp-tech-icon" />
                <span className="lp-tech-name">Gemini</span>
                <span className="lp-tech-role">AI Engine</span>
              </div>
              <div className="lp-tech-card">
                <Shield size={28} className="lp-tech-icon" />
                <span className="lp-tech-name">Firebase</span>
                <span className="lp-tech-role">Auth</span>
              </div>
            </div>
          </div>
        </section>

        {/* ====== CTA SECTION ====== */}
        <section className={`lp-section reveal-section ${visibleSections.has("tech-stack") ? "lp-visible" : ""}`}>
          <div className="lp-cta-block">

            <h2 className="lp-cta-title">Ready to Elevate Your Code Reviews?</h2>
            <p className="lp-cta-desc">Join engineers who trust RepoXray for AI-powered code intelligence.</p>
            <button onClick={handleSignIn} className="lp-cta-btn">
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2A5.725 5.725 0 0 1 8.24 12.87a5.725 5.725 0 0 1 5.75-5.73c1.5 0 2.871.56 3.931 1.485l3.22-3.21C19.141 3.555 16.79 2.5 13.99 2.5C8.47 2.5 4 6.97 4 12.485s4.47 9.985 9.99 9.985c5.78 0 9.61-4.06 9.61-9.78c0-.66-.06-1.29-.17-1.89h-11.2v-.515z" />
              </svg>
              <span>Get Started for Free</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* ====== FOOTER ====== */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <div className="lp-nav-logo">Ω</div>
              <span className="lp-nav-name">REPO<span className="lp-nav-name-accent">XRAY</span></span>
            </div>
            <p className="lp-footer-text">© 2026 RepoXray. AI-Powered Repository Intelligence.</p>
          </div>
        </footer>
      </div>
    );
  }

  // 3. Authenticated Workspace Dashboard
  return (
    <div className="min-height-screen flex flex-col md:flex-row relative">
      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* -------------------- SIDEBAR HISTORICAL TRACKER -------------------- */}
      <aside 
        className={`sidebar-historical border-r border-glass flex flex-col transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-glass flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-extrabold shadow-lg">
              Ω
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-md tracking-tight text-white leading-none">
                REPO<span className="text-violet-400">XRAY</span>
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              stopStatusPolling();
              setSelectedRepoUrl(null);
              setReport(null);
              setPipelineStatus(null);
            }}
            className="p-1.5 rounded-lg border border-glass hover:bg-white/10 text-secondary hover:text-white transition-colors"
            title="Ingest New Repo"
          >
            <PlusCircle size={18} />
          </button>
        </div>

        {/* Repos History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar">
          <div className="flex items-center gap-1.5 text-muted uppercase font-bold tracking-wider text-[10px] px-2 mb-3">
            <History size={12} />
            <span>Repository History</span>
          </div>

          {repos.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-glass rounded-lg">
              <Database size={24} className="text-muted mx-auto mb-2 opacity-30" />
              <p className="text-xs text-muted">No repositories scanned yet.</p>
            </div>
          ) : (
            repos.map((r, idx) => {
              const isActive = selectedRepoUrl === r.repo_url;
              return (
                <div
                  key={idx}
                  className={`w-full relative rounded-lg border transition-all flex flex-col gap-2 p-3 ${
                    isActive
                      ? "border-violet-500 bg-violet-600/5 shadow-[inset_0_0_15px_rgba(139,92,246,0.1)]"
                      : "border-glass bg-white/[0.01] hover:bg-white/[0.03] hover:border-glass-hover"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <button
                      onClick={() => handleSelectHistoryRepo(r)}
                      className="text-left flex-1 truncate pr-2"
                    >
                      <span className="text-[12px] font-semibold text-white truncate block max-w-[140px]" title={r.repo_url}>
                        {r.repo_url.split("/").pop()}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusIcon(r.status)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmRepo(r.repo_url);
                        }}
                        className="delete-repo-btn-static"
                        title="Delete Repository Data"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectHistoryRepo(r)}
                    className="w-full text-left flex justify-between items-center text-[10px] text-secondary mt-0.5"
                  >
                    <span className="truncate max-w-[120px] font-mono opacity-50 font-semibold" title={r.repo_url}>
                      {r.repo_url.replace("https://github.com/", "")}
                    </span>
                    <span className="shrink-0 font-medium">
                      {r.completed_files}/{r.total_files} files
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-historical-footer">
          <p className="text-[10px] text-muted">RepoXray v1.0.0</p>
        </div>
      </aside>

      {/* -------------------- MAIN WRAPPER FOR HEADER + WORKSPACE -------------------- */}
      <div className="flex-1 flex flex-col min-height-screen overflow-hidden">
        {/* MOBILE HEADER */}
        <header className="mobile-header items-center justify-between px-4 py-2.5 bg-[#0c0d12]/95 border-b border-glass backdrop-blur-md shrink-0 z-30">
          <div className="flex items-center gap-2">
            {/* Hamburger Button */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-glass text-secondary hover:text-white transition-colors"
              title="Open Repository History"
            >
              <Menu size={16} />
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-extrabold shadow-sm text-[11px] leading-none" style={{ width: "26px", height: "26px" }}>
                Ω
              </div>
              <span className="font-heading font-extrabold text-[12px] text-white tracking-tight">
                REPO<span className="text-violet-400">XRAY</span>
              </span>
            </div>

            {/* Ingest/Plus Button */}
            <button
              onClick={() => {
                stopStatusPolling();
                setSelectedRepoUrl(null);
                setReport(null);
                setPipelineStatus(null);
              }}
              className="p-1 rounded-md border border-glass hover:bg-white/10 text-secondary hover:text-white transition-colors ml-0.5"
              title="Ingest New Repo"
            >
              <PlusCircle size={15} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-1.5 rounded-lg border border-glass flex items-center justify-center text-secondary hover:text-white transition-colors"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              style={{ width: "28px", height: "28px" }}
            >
              {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
            </button>

            {/* User Dropdown wrapper */}
            <div className="relative" ref={mobileDropdownRef}>
              <button
                onClick={() => setShowMobileUserDropdown(!showMobileUserDropdown)}
                className="user-avatar-btn flex items-center justify-center"
                title="User Account"
                style={{ width: "28px", height: "28px" }}
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Google User"}
                    className="user-avatar-img"
                    referrerPolicy="no-referrer"
                    style={{ width: "28px", height: "28px", borderRadius: "50%" }}
                  />
                ) : (
                  <div className="user-avatar-fallback text-[10px]" style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                    <UserIcon size={12} />
                  </div>
                )}
              </button>

              {showMobileUserDropdown && (
                <div className="user-dropdown-menu animate-fade-in absolute right-0 mt-2 z-50">
                  <div className="dropdown-user-info">
                    <p className="user-name text-xs font-semibold">{user?.displayName || "RepoXray User"}</p>
                    <p className="user-email text-[10px] text-muted">{user?.email}</p>
                  </div>
                  <div className="dropdown-divider" />
                  {(user?.email === ADMIN_EMAIL || user?.email === "developer@repoxray.local") && (
                    <a href="/admin" className="admin-link-btn text-xs py-1.5 flex items-center gap-1.5">
                      <BarChart3 size={12} />
                      <span>Admin Dashboard</span>
                    </a>
                  )}
                  <button 
                    onClick={() => {
                      setShowMobileUserDropdown(false);
                      logoutUser();
                    }} 
                    className="logout-btn text-xs py-1.5 flex items-center gap-1.5 w-full text-left"
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* -------------------- MAIN WORKSPACE AREA -------------------- */}
        <main className="flex-1 flex flex-col bg-deep overflow-hidden p-6 md:p-8 scrollbar relative">
          {/* UNIFIED WORKSPACE TOPBAR */}
          <header className="workspace-topbar">
            <div className="topbar-welcome" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-lg border border-glass flex items-center justify-center text-secondary hover:text-white transition-colors"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              style={{ width: "34px", height: "34px" }}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="user-avatar-btn"
              title="User Account"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Google User"}
                  className="user-avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="user-avatar-fallback">
                  <UserIcon size={16} />
                </div>
              )}
            </button>

            {showUserDropdown && (
              <div className="user-dropdown-menu animate-fade-in">
                <div className="dropdown-user-info">
                  <p className="user-name">{user?.displayName || "RepoXray User"}</p>
                  <p className="user-email">{user?.email}</p>
                </div>
                <div className="dropdown-divider" />
                {(user?.email === ADMIN_EMAIL || user?.email === "developer@repoxray.local") && (
                  <a href="/admin" className="admin-link-btn">
                    <BarChart3 size={14} />
                    <span>Admin Dashboard</span>
                  </a>
                )}
                <button onClick={logoutUser} className="logout-btn">
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
            </div>
          </div>
        </header>

        {/* LANDING PAGE (NO SELECTED REPO) */}
        {!selectedRepoUrl && !reportLoading && (
          <div className="max-w-3xl mx-auto w-full my-auto py-6 flex flex-col items-center justify-center animate-fade-in">
            {/* Glowing Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_35px_rgba(139,92,246,0.4)] mb-6">
              Ω
            </div>
            
            <h2 className="text-4xl font-extrabold font-heading text-center text-white tracking-tight leading-none mb-3">
              AI-Powered Repository <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Intelligence Platform
              </span>
            </h2>
            
            <p className="text-secondary text-center text-sm max-w-lg mb-6 leading-relaxed">
              Submit a GitHub repository URL below. Our system shallow-clones, runs static defense analyzers, chunks vector embeddings, and builds a comprehensive architectural and security blueprint.
            </p>

            <form onSubmit={handleIngestSubmit} className="w-full glass-panel p-6 bg-white/[0.02] glow-active mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="url"
                    required
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="flex-1 glass-input py-3 text-sm font-sans"
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !repoInput.trim()}
                    className="glass-btn shrink-0"
                  >
                    <span>Analyze Repository</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
                
                {submitError && (
                  <div className="text-xs text-rose-400 mt-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            </form>

            <div className="text-[11px] text-secondary/60 flex items-center justify-center gap-1.5 mb-8 font-sans px-4 py-1.5 rounded-full bg-black/[0.02] dark:bg-white/[0.01] border border-black/5 dark:border-white/5 shadow-sm max-w-max mx-auto">
              <span>🔒 Rate limit: 2 repos per 12 hours. Be gentle, our servers run on a hamster wheel 🐹</span>
            </div>



            {/* Feature quick details */}
            <div className="grid grid-cols-3 gap-8 mt-4 w-full text-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-2">
                  <GitBranch size={16} />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Static Mapping</h4>
                <p className="text-[10px] text-muted leading-relaxed">Aggressive shallow-cloning and defense filters.</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 mb-2">
                  <Shield size={16} />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Vulnerability Audits</h4>
                <p className="text-[10px] text-muted leading-relaxed">Pulsing security audit with priority severity tags.</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/25 flex items-center justify-center text-fuchsia-400 mb-2">
                  <MessageSquare size={16} />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Full RAG Chat</h4>
                <p className="text-[10px] text-muted leading-relaxed">Query the codebase contextually using pgvector.</p>
              </div>
            </div>
          </div>
        )}

        {/* LOADING REPO STATE */}
        {reportLoading && (
          <div className="my-auto py-24 flex flex-col items-center justify-center animate-pulse">
            <RefreshCw size={48} className="text-violet-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white font-heading">Synthesizing Repository Analysis...</h3>
            <p className="text-secondary text-xs mt-1">Reading database vectors and loading architecture documents.</p>
          </div>
        )}

        {/* PIPELINE LIVE INGESTION PROGRESS TRACKER */}
        {pipelineStatus && (
          <div className="max-w-xl mx-auto w-full my-auto animate-fade-in">
            <div className="glass-panel p-8 bg-white/[0.02] border-violet-500/30 text-center relative overflow-hidden">
              {/* Pulsing neon bg glow */}
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-violet-500/20 blur-3xl rounded-full" />
              <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-cyan-500/20 blur-3xl rounded-full" />

              {pipelineStatus.status === "error" ? (
                <XCircle size={36} className="text-rose-500 mx-auto mb-6" />
              ) : (
                <RefreshCw size={36} className="text-cyan-400 animate-spin mx-auto mb-6" />
              )}
              
              <h3 className="text-xl font-bold text-white font-heading mb-1">
                {pipelineStatus.status === "error" ? "Repository Analysis Failed" : "AI Map-Reduce Engine Running"}
              </h3>
              <p className="text-secondary text-xs truncate max-w-sm mx-auto font-mono mb-6" title={pipelineStatus.repo_url}>
                {pipelineStatus.repo_url}
              </p>

              {/* Progress Stat circles/numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-black/40 border border-glass mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white leading-tight">
                    {pipelineStatus.total_files}
                  </h4>
                  <p className="text-[9px] text-secondary uppercase font-bold tracking-wider">Total Files</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-400 leading-tight">
                    {pipelineStatus.completed_files}
                  </h4>
                  <p className="text-[9px] text-secondary uppercase font-bold tracking-wider">Completed</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-cyan-400 leading-tight">
                    {pipelineStatus.processing_files + pipelineStatus.pending_files}
                  </h4>
                  <p className="text-[9px] text-secondary uppercase font-bold tracking-wider">Processing</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-rose-400 leading-tight">
                    {pipelineStatus.error_files}
                  </h4>
                  <p className="text-[9px] text-secondary uppercase font-bold tracking-wider">Errors</p>
                </div>
              </div>

              {/* Glowing Progress bar */}
              {pipelineStatus.total_files > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-secondary">
                    <span>Overall Progress</span>
                    <span className="text-cyan-400 font-mono">
                      {Math.round(
                        ((pipelineStatus.completed_files + pipelineStatus.error_files) / pipelineStatus.total_files) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${((pipelineStatus.completed_files + pipelineStatus.error_files) / pipelineStatus.total_files) * 100}%`
                      }}
                    />
                  </div>
                  {pipelineStatus.total_files > 0 && 
                   pipelineStatus.status === "processing" && (
                    <div className="reduce-excuse-banner">
                      <RefreshCw size={14} className="excuse-icon animate-spin" />
                      <span className="excuse-text">
                        {pipelineStatus.completed_files + pipelineStatus.error_files === pipelineStatus.total_files ? (
                          FUNNY_EXCUSES[funnyExcuseIdx]
                        ) : (
                          "🔍 Mapping codebase: chunking code, extracting summaries, and generating vector embeddings... ⚡"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted italic">Cloning repo & indexing folder trees...</p>
              )}

              {/* LIVE TERMINAL LOG PANEL */}
              <div className="mt-6 text-left">
                <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5 px-1">
                  {pipelineStatus.status === "error" ? (
                    <XCircle size={10} className="text-rose-500" />
                  ) : (
                    <RefreshCw size={10} className="animate-spin text-cyan-400" />
                  )}
                  <span>Live Pipeline Logs</span>
                </div>
                <div ref={terminalRef} className="live-terminal">
                  {pipelineLogs.length === 0 ? (
                    <div className="text-muted italic text-[11px]">Connecting to streaming server...</div>
                  ) : (
                    pipelineLogs.map((log, idx) => (
                      <div key={idx} className="live-terminal-log text-[11px] font-mono">
                        <span className="live-terminal-time text-cyan-400">[{log.time}]</span>
                        <span className="live-terminal-msg text-white">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

                  {/* INDIVIDUAL FAILED FILES DETAILS PANEL */}
                  {pipelineStatus.files && pipelineStatus.files.some(f => f.status === "error") && (
                    <div className="mt-6 text-left border border-rose-200 dark:border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 rounded-lg p-4">
                      <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5 px-1">
                        <XCircle size={10} className="text-rose-700 dark:text-rose-400" />
                        <span>Failed Files Details</span>
                      </div>
                      <div className="max-h-[150px] overflow-y-auto scrollbar space-y-2 pr-1">
                        {pipelineStatus.files
                          .filter(f => f.status === "error")
                          .map((f, idx) => (
                            <div key={idx} className="text-left text-xs bg-rose-50/60 dark:bg-black/40 rounded p-2 border border-rose-200/40 dark:border-rose-500/20">
                              <div className="font-semibold text-rose-700 dark:text-rose-300 truncate font-mono text-[11px]" title={f.file_path}>
                                {f.file_path}
                              </div>
                              <div className="text-[10px] text-secondary mt-1 leading-normal truncate" title={f.error || "Unknown analysis error."}>
                                {f.error || "Unknown analysis error."}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

              {pipelineStatus.status === "error" ? (
                <p className="text-[11px] text-rose-400 mt-6 max-w-xs mx-auto leading-normal font-semibold">
                  Critical pipeline failure. Review the errors logged in the terminal above. Click "Reset Ingestion State" to clear this screen and try again.
                </p>
              ) : (
                <p className="text-[10px] text-muted mt-6 max-w-xs mx-auto leading-normal">
                  Phase 1 is synchronous. Phases 2 (Vector Map Summarization) and 3 (Global Architecture Reduce) run concurrently in background threads. Your interface will auto-load when done.
                </p>
              )}

              <button
                onClick={handleStopIngestion}
                disabled={isStopping}
                className="mt-6 w-full py-2.5 px-4 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:text-rose-300 font-semibold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStopping ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Stopping Ingestion...</span>
                  </>
                ) : pipelineStatus.status === "error" ? (
                  <>
                    <XCircle size={14} />
                    <span>Reset Ingestion State</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Stop & Reset Ingestion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* THE MAIN ACTIVE ANALYSIS DASHBOARD */}
        {selectedRepoUrl && report && !reportLoading && !pipelineStatus && (
          <div className="flex-1 flex flex-col space-y-6 animate-fade-in">
            {/* Header Dashboard Info Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-glass pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-violet-400 px-2 py-0.5 bg-violet-600/10 border border-violet-500/20 rounded">
                    active repository
                  </span>
                  <a
                    href={selectedRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-secondary hover:text-white transition-colors"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
                <h2 className="text-2xl font-bold font-heading text-white mt-1 leading-none">
                  {selectedRepoUrl.split("/").pop()}
                </h2>
                <p className="text-xs text-secondary mt-1 font-mono">{selectedRepoUrl}</p>
              </div>

              {/* Dynamic stats */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex flex-col px-3 py-1.5 border border-glass rounded bg-white/[0.01] text-center">
                  <span className="text-white font-bold leading-none">{report.files.length}</span>
                  <span className="text-[9px] text-secondary uppercase font-bold tracking-wider mt-1">Code Files</span>
                </div>
                <div className="flex flex-col px-3 py-1.5 border border-glass rounded bg-white/[0.01] text-center">
                  <span className="text-rose-400 font-bold leading-none">{report.vulnerabilities.length}</span>
                  <span className="text-[9px] text-secondary uppercase font-bold tracking-wider mt-1">Issues Found</span>
                </div>
                {SHOW_PDF_AND_REFRESH_ACTIONS && (
                  <>
                    <button
                      onClick={() => generatePdf(report)}
                      className="p-3 rounded-lg border border-glass bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 hover:text-white transition-all flex items-center gap-2 font-semibold"
                      title="Download PDF Analysis Report"
                    >
                      <Download size={14} />
                      <span className="hidden md:inline">Download PDF</span>
                    </button>
                    <button
                      onClick={() => fetchRepoReport(selectedRepoUrl)}
                      className="p-3 rounded-lg border border-glass bg-white/[0.01] hover:bg-white/[0.03] text-secondary hover:text-white transition-all"
                      title="Reload Data"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="flex border-b border-glass gap-3 pb-3 mb-6 text-sm tabs-container">
              <button
                onClick={() => setActiveTab("overview")}
                className={`tab-btn ${activeTab === "overview" ? "tab-btn-active" : ""}`}
              >
                <GitBranch size={16} />
                <span>Architecture Overview</span>
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`tab-btn ${activeTab === "security" ? "tab-btn-active" : ""}`}
              >
                <Shield size={16} />
                <span>Security Audit</span>
              </button>
              <button
                onClick={() => setPhaseTwoFeature("File Explorer")}
                className={`tab-btn ${activeTab === "files" ? "tab-btn-active" : ""}`}
              >
                <FileCode2 size={16} />
                <span>File Explorer</span>
              </button>
              <button
                onClick={() => setPhaseTwoFeature("AI Chat Console")}
                className={`tab-btn ${activeTab === "chat" ? "tab-btn-active" : ""}`}
              >
                <MessageSquare size={16} />
                <span>AI Chat Console</span>
              </button>
              <button
                onClick={() => setPhaseTwoFeature("Architecture Diff")}
                className="tab-btn"
              >
                <GitCompareArrows size={16} />
                <span>Architecture Diff</span>
              </button>
            </div>

            {/* -------------------- TAB CONTENT PANELS -------------------- */}
            <div className="flex-1 min-h-[400px]">
              {/* TAB 1: ARCHITECTURE OVERVIEW */}
              {activeTab === "overview" && (
                <div className="glass-panel p-6 bg-white/[0.01] animate-fade-in space-y-6">
                  <div className="flex items-center gap-2 mb-2 text-violet-400">
                    <Sparkles size={18} />
                    <h3 className="font-heading font-extrabold text-lg text-white">Master Architect Overview</h3>
                  </div>
                  <div className="prose prose-invert max-w-none text-secondary">
                    <Markdown content={report.global_overview} />
                  </div>
                </div>
              )}

              {/* TAB 2: SECURITY AUDIT */}
              {activeTab === "security" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Master Security Summary Report */}
                  <div className="glass-panel p-6 bg-white/[0.01]">
                    <div className="flex items-center gap-2 mb-4 text-rose-400">
                      <Shield size={18} />
                      <h3 className="font-heading font-extrabold text-lg text-white">Master Security Audit</h3>
                    </div>
                    <div className="prose prose-invert max-w-none text-secondary">
                      <Markdown content={report.security_audit} />
                    </div>
                  </div>

                  {/* Vulnerability Checklist Table */}
                  <div className="glass-panel overflow-hidden bg-white/[0.01]">
                    <div className="p-5 border-b border-glass flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-white">Vulnerability Checklist</h4>
                        <p className="text-xs text-muted mt-0.5">Filter and review raw potential issues detected by file agents.</p>
                      </div>
                      
                      {/* Filter controls */}
                      <div className="flex gap-2">
                        {["all", "critical", "high", "medium", "low"].map((sev) => (
                          <button
                            key={sev}
                            onClick={() => setVulnFilter(sev)}
                            className={`sev-btn ${
                              vulnFilter === sev
                                ? `sev-btn-${sev}-active`
                                : ""
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredVulns.length === 0 ? (
                      <div className="p-12 text-center">
                        <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-2 opacity-55" />
                        <p className="text-secondary text-sm">No vulnerabilities match the current filter.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-glass">
                        {filteredVulns.map((v, idx) => (
                          <div key={idx} className="p-5 hover:bg-white/[0.01] transition-all flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2.5">
                                <span className={`badge badge-${v.severity.toLowerCase()}`}>
                                  {v.severity}
                                </span>
                                <h5 className="font-bold text-sm text-white">{v.title || "Potential Vulnerability"}</h5>
                              </div>
                              <p className="text-secondary text-xs leading-relaxed max-w-3xl">
                                {v.description || "No specific details provided."}
                              </p>
                              
                              <button
                                onClick={() => handleSelectFile(v.file_path)}
                                className="text-[11px] text-cyan-400 font-semibold font-mono flex items-center gap-1 hover:underline mt-2 text-left"
                              >
                                <span>{v.file_path}</span>
                                <ChevronRight size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FILE EXPLORER */}
              {activeTab === "files" && (
                <div className="glass-panel overflow-hidden bg-white/[0.01] animate-fade-in flex flex-col">
                  {/* Filter and Search Bar */}
                  <div className="p-4 border-b border-glass bg-white/[0.005] flex gap-3">
                    <div className="relative flex-1">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        value={fileSearch}
                        onChange={(e) => setFileSearch(e.target.value)}
                        placeholder="Search files by path, filename, language..."
                        className="search-input"
                      />
                    </div>
                  </div>

                  {/* File List */}
                  {filteredFiles.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText size={36} className="text-secondary mx-auto mb-2 opacity-30" />
                      <p className="text-secondary text-sm">No repository files match the search query.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-glass max-h-[600px] overflow-y-auto scrollbar">
                      {filteredFiles.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectFile(file.file_path)}
                          className="p-4 hover:bg-white/[0.02] cursor-pointer transition-all flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 truncate">
                            <div className="w-9 h-9 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                              <Code size={16} />
                            </div>
                            <div className="truncate">
                              <h5 className="font-bold text-sm text-white truncate max-w-[450px]" title={file.file_path}>
                                {file.file_path.split("/").pop()}
                              </h5>
                              <p className="text-[11px] text-secondary truncate max-w-[450px] mt-0.5" title={file.file_path}>
                                {file.file_path}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-bold font-mono px-2 py-1 bg-white/[0.04] border border-glass rounded text-secondary uppercase">
                              {file.language}
                            </span>
                            <ChevronRight size={16} className="text-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CHAT PANEL */}
              {activeTab === "chat" && (
                <div className="animate-fade-in">
                  <ChatPanel repoUrl={selectedRepoUrl} user={user} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* -------------------- FILE DETAIL SLIDING SHEET -------------------- */}
      {selectedFile && (
        <CodeViewer
          filePath={selectedFile.file_path}
          language={selectedFile.language}
          summary={selectedFile.summary}
          keyComponents={selectedFile.key_components}
          rawContent={selectedFile.content}
          onClose={() => setSelectedFile(null)}
        />
      )}

      {/* Full Sheet Loading Spinner for File Click */}
      {fileLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="glass-panel p-6 bg-[#0c0d12]/90 flex items-center gap-4 border-violet-500/30">
            <RefreshCw size={24} className="text-cyan-400 animate-spin" />
            <span className="text-sm font-semibold text-white">Loading raw code buffers...</span>
          </div>
        </div>
      )}

      {/* Beautiful Delete Confirmation Modal */}
      {deleteConfirmRepo && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h3 className="confirm-modal-title">
              <AlertTriangle className="text-rose-500" size={22} />
              <span>Delete Repository Data?</span>
            </h3>
            <p className="confirm-modal-desc">
              Are you sure you want to delete all stored metrics, AI summaries, vector embeddings, and reports for <code className="text-rose-400 font-mono text-xs">{deleteConfirmRepo.split("/").pop()}</code>? This action is permanent and cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                onClick={() => setDeleteConfirmRepo(null)}
                className="confirm-modal-btn-cancel"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRepo(deleteConfirmRepo)}
                className="confirm-modal-btn-delete"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2 Feature Preview Modal */}
      {phaseTwoFeature && (
        <PhaseTwoModal
          featureTitle={phaseTwoFeature}
          onClose={() => setPhaseTwoFeature(null)}
        />
      )}
    </div>
  );
}
