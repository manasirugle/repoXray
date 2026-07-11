"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Users,
  Database,
  FileCode2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  Lock,
  BarChart3,
  Activity,
  Sun,
  Moon,
  LogOut,
  User as UserIcon
} from "lucide-react";
import type { User } from "firebase/auth";
import { auth, getIdToken, logoutUser, onAuthStateChanged } from "../../config/firebase";

interface AdminUser {
  email: string;
  repositories_scanned: number;
  repos: string[];
  total_files: number;
}

interface AdminAnalytics {
  total_repositories_scanned: number;
  total_platform_users: number;
  total_files_analyzed: number;
  users: AdminUser[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://coderecall.onrender.com";
const ADMIN_EMAIL = "aryankale1410@gmail.com";
export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Dark mode theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  // User dropdown visibility
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Load and apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Handle redirect result for mobile devices
    const handleRedirectResult = async () => {
      try {
        const { getRedirectResult } = await import("firebase/auth");
        await getRedirectResult(auth);
      } catch (err) {
        console.error("Error fetching redirect result:", err);
      }
    };
    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchAdminAnalytics = async () => {
    if (!user) return;
    setDataLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`${BACKEND_URL}/api/analytics/admin`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      if (res.status === 403) {
        setError("Access denied. Admin privileges required.");
        return;
      }
      const data = await res.json();
      if (data && !data.detail) {
        setAnalytics(data);
      } else {
        setError(data.detail || "Failed to load analytics.");
      }
    } catch (err) {
      setError("Failed to connect to the backend server.");
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.email === ADMIN_EMAIL || user.email === "developer@repoxray.local")) {
      fetchAdminAnalytics();
    }
  }, [user]);

  const toggleUserExpand = (email: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  // Auth Loading
  if (authLoading) {
    return (
      <div className="admin-loader">
        <RefreshCw size={48} className="admin-spin" />
        <h3 className="admin-loader-title">Verifying Admin Credentials...</h3>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="admin-denied">
        <div className="admin-denied-card">
          <Lock size={48} className="admin-denied-icon" />
          <h2 className="admin-denied-title">Authentication Required</h2>
          <p className="admin-denied-desc">Please sign in from the main page to access the admin dashboard.</p>
          <a href="/" className="admin-back-link">
            <ArrowLeft size={16} />
            <span>Back to RepoXray</span>
          </a>
        </div>
      </div>
    );
  }

  // Not admin
  if (user.email !== ADMIN_EMAIL && user.email !== "developer@repoxray.local") {
    return (
      <div className="admin-denied">
        <div className="admin-denied-card">
          <Shield size={48} className="admin-denied-icon" />
          <h2 className="admin-denied-title">Access Denied</h2>
          <p className="admin-denied-desc">
            This dashboard is restricted to platform administrators.<br />
            Signed in as: <code className="admin-email-code">{user.email}</code>
          </p>
          <a href="/" className="admin-back-link">
            <ArrowLeft size={16} />
            <span>Back to RepoXray</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-header-left">
          <a href="/" className="admin-logo-link">
            <div className="admin-logo">Ω</div>
            <div>
              <h1 className="admin-brand">REPO<span className="admin-brand-accent">XRAY</span></h1>
              <p className="admin-brand-sub">Admin Analytics Console</p>
            </div>
          </a>
        </div>
        <div className="admin-header-right flex items-center gap-3">
          <div className="admin-user-badge">
            <Activity size={14} className="admin-badge-icon" />
            <span>{user.email}</span>
          </div>
          <button onClick={fetchAdminAnalytics} className="admin-refresh-btn" disabled={dataLoading}>
            <RefreshCw size={16} className={dataLoading ? "admin-spin" : ""} />
            <span>Refresh</span>
          </button>

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
              <div className="user-dropdown-menu animate-fade-in" style={{ right: 0, left: "auto" }}>
                <div className="dropdown-user-info">
                  <p className="user-name">{user?.displayName || "RepoXray User"}</p>
                  <p className="user-email">{user?.email}</p>
                </div>
                <div className="dropdown-divider" />
                <button onClick={logoutUser} className="logout-btn">
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="admin-main">
        {/* ERROR STATE */}
        {error && (
          <div className="admin-error">
            <Shield size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* LOADING STATE */}
        {dataLoading && !analytics && (
          <div className="admin-loading">
            <RefreshCw size={36} className="admin-spin" />
            <p>Loading platform analytics...</p>
          </div>
        )}

        {/* ANALYTICS DASHBOARD */}
        {analytics && (
          <>
            {/* SUMMARY CARDS */}
            <div className="admin-summary-grid">
              <div className="admin-summary-card admin-card-violet">
                <div className="admin-card-icon-wrap admin-icon-violet">
                  <Users size={24} />
                </div>
                <div className="admin-card-data">
                  <span className="admin-card-value">{analytics.total_platform_users}</span>
                  <span className="admin-card-label">Total Users</span>
                </div>
              </div>
              <div className="admin-summary-card admin-card-cyan">
                <div className="admin-card-icon-wrap admin-icon-cyan">
                  <Database size={24} />
                </div>
                <div className="admin-card-data">
                  <span className="admin-card-value">{analytics.total_repositories_scanned}</span>
                  <span className="admin-card-label">Repos Scanned</span>
                </div>
              </div>
              <div className="admin-summary-card admin-card-fuchsia">
                <div className="admin-card-icon-wrap admin-icon-fuchsia">
                  <FileCode2 size={24} />
                </div>
                <div className="admin-card-data">
                  <span className="admin-card-value">{analytics.total_files_analyzed}</span>
                  <span className="admin-card-label">Files Analyzed</span>
                </div>
              </div>
            </div>

            {/* USER ACTIVITY TABLE */}
            <div className="admin-table-container">
              <div className="admin-table-header">
                <div className="admin-table-title-wrap">
                  <BarChart3 size={20} className="admin-table-icon" />
                  <h2 className="admin-table-title">User Activity</h2>
                </div>
                <span className="admin-table-count">{analytics.users.length} users</span>
              </div>

              <div className="admin-table">
                {/* Table Header Row */}
                <div className="admin-table-row admin-table-row-header">
                  <div className="admin-col-expand"></div>
                  <div className="admin-col-email">Email / User ID</div>
                  <div className="admin-col-repos">Repos Scanned</div>
                  <div className="admin-col-files">Files Analyzed</div>
                </div>

                {/* Table Body */}
                {analytics.users.length === 0 ? (
                  <div className="admin-table-empty">
                    <p>No user activity recorded yet.</p>
                  </div>
                ) : (
                  analytics.users.map((u, idx) => {
                    const isExpanded = expandedUsers.has(u.email);
                    return (
                      <React.Fragment key={idx}>
                        <div
                          className={`admin-table-row admin-table-row-body ${isExpanded ? "admin-row-expanded" : ""}`}
                          onClick={() => toggleUserExpand(u.email)}
                        >
                          <div className="admin-col-expand">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                          <div className="admin-col-email">
                            <span className="admin-user-email">{u.email}</span>
                          </div>
                          <div className="admin-col-repos">
                            <span className="admin-repos-badge">{u.repositories_scanned}</span>
                          </div>
                          <div className="admin-col-files">
                            <span>{u.total_files}</span>
                          </div>
                        </div>

                        {/* Expanded Repo Details */}
                        {isExpanded && (
                          <div className="admin-expanded-row">
                            <div className="admin-expanded-content">
                              <p className="admin-expanded-label">Repositories:</p>
                              <div className="admin-repo-list">
                                {u.repos.map((repo, rIdx) => (
                                  <a
                                    key={rIdx}
                                    href={repo}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="admin-repo-link"
                                  >
                                    {repo.replace("https://github.com/", "")}
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="admin-footer">
        <p>RepoXray Admin Console • Platform Analytics Dashboard</p>
      </footer>
    </div>
  );
}
