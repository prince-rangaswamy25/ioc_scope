import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileSearch,
  History,
  Info,
  Menu,
  Moon,
  SearchCode,
  Settings,
  Shield,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ToastContainer } from "./ToastContainer";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_NAV: NavItem[] = [
  { to: "/analyze", label: "Analyzer", icon: FileSearch },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/history", label: "Case History", icon: History },
  { to: "/lookup", label: "IOC Lookup", icon: SearchCode },
  { to: "/how-it-works", label: "Methodology", icon: BookOpen },
  { to: "/about", label: "About", icon: Info },
  { to: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_BOTTOM_NAV: NavItem[] = [
  { to: "/analyze", label: "Analyze", icon: FileSearch },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/history", label: "History", icon: History },
  { to: "/lookup", label: "Lookup", icon: SearchCode },
];

const ROUTE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/analyze": "IOC Analyzer",
  "/insights": "AI Threat Insights",
  "/dashboard": "Analytics Dashboard",
  "/history": "Case History",
  "/lookup": "IOC Lookup & Defang",
  "/how-it-works": "Extraction Methodology",
  "/about": "About IOCScope",
  "/settings": "Workspace Settings",
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme, activeWorkspace } = useApp();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLanding = location.pathname === "/";
  const currentTitle = ROUTE_TITLES[location.pathname] ?? "Page Not Found";

  if (isLanding) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B1020] text-slate-900 dark:text-slate-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-cyan-500 focus:text-slate-950 focus:font-semibold"
        >
          Skip to main content
        </a>

        {/* Clean 3-zone Top Bar Contract */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0B1020]/85 backdrop-blur-md no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
            <Link
              to="/"
              className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <span>IOCScope</span>
            </Link>

            <nav
              aria-label="Primary navigation"
              className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              <Link
                to="/analyze"
                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
              >
                Analyzer
              </Link>
              <Link
                to="/dashboard"
                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
              >
                Dashboard
              </Link>
              <Link
                to="/lookup"
                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
              >
                IOC Lookup
              </Link>
              <Link
                to="/how-it-works"
                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
              >
                Methodology
              </Link>
              <Link
                to="/about"
                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
              >
                About
              </Link>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link
                to="/analyze"
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Open Analyzer
              </Link>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090D1A] py-10 px-4 sm:px-6 lg:px-8 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                <span>IOCScope</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Automated Indicator Extraction & Threat Intelligence Triage · Local-first browser engine
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
              <Link to="/analyze" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                Analyzer
              </Link>
              <Link to="/insights" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                AI Insights
              </Link>
              <Link to="/lookup" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                IOC Lookup
              </Link>
              <Link to="/how-it-works" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                Methodology
              </Link>
              <Link to="/about" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                Team & Project
              </Link>
              <Link to="/settings" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                Settings
              </Link>
            </div>
          </div>
        </footer>

        <ToastContainer />
      </div>
    );
  }

  // Workspace Sidebar Layout for SOC Analyst Pages
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1020] text-slate-900 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-cyan-500 focus:text-slate-950 focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Desktop Collapsible Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0E1529] transition-all duration-200 no-print ${
          sidebarCollapsed ? "w-[74px]" : "w-[248px]"
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display font-bold text-slate-900 dark:text-white whitespace-nowrap overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Crosshair className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
            </div>
            {!sidebarCollapsed && <span className="text-base tracking-tight">IOCScope</span>}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isActive
                      ? "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 shrink-0 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 shrink-0 text-slate-600" />
            )}
            {!sidebarCollapsed && (
              <span>{theme === "dark" ? "Light Theme" : "Dark SOC Theme"}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0E1529] border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 font-display font-bold text-slate-900 dark:text-white"
              >
                <Shield className="w-5 h-5 text-cyan-500" />
                <span>IOCScope</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {SIDEBAR_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Bar */}
        <header className="h-14 sm:h-16 sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0B1020]/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Link
                to="/"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hidden sm:inline whitespace-nowrap"
              >
                IOCScope
              </Link>
              <span className="text-slate-400 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-semibold text-slate-900 dark:text-white truncate">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeWorkspace.result && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <Activity className="w-3.5 h-3.5 text-cyan-500" aria-hidden="true" />
                <span>{activeWorkspace.result.summary.uniqueCount} active IOCs</span>
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/analyze"
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Analyzer
            </Link>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation (compact <= 15% viewport height) */}
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 dark:bg-[#0E1529]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-1 no-print"
        >
          {MOBILE_BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium min-w-[56px] ${
                    isActive
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`
                }
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <ToastContainer />
    </div>
  );
};
