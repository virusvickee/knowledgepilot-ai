"use client";
import React, { useState } from "react";
import { UserProfile, UserRole } from "@/types";
import {
  ChevronDown,
  LogOut,
  Check,
  Search,
  Layers,
  FileSpreadsheet,
  BarChart3,
  Shield,
} from "lucide-react";

interface NavbarProps {
  user: UserProfile | null;
  activeTab: "research" | "corpus" | "compare" | "admin";
  setActiveTab: (tab: "research" | "corpus" | "compare" | "admin") => void;
  onSwitchPersona: (email: string, pass: string) => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  apiHealthy: boolean;
}

const DEMO_PERSONAS = [
  {
    role: "admin" as UserRole,
    name: "Elena Rostova",
    email: "elena.rostova@acme.ai",
    pass: "AdminPass123!",
    badge: "Admin",
    workspace: "Acme Global Research Lab",
    desc: "Full admin privileges, FinOps telemetry & 10-case evaluation suite",
  },
  {
    role: "researcher" as UserRole,
    name: "Marcus Chen",
    email: "marcus.chen@acme.ai",
    pass: "ResearchPass123!",
    badge: "Researcher",
    workspace: "Acme Global Research Lab",
    desc: "Authorized for research Q&A, document ingestion & comparison",
  },
  {
    role: "viewer" as UserRole,
    name: "Priya Nair",
    email: "priya.nair@acme.ai",
    pass: "Viewer",
    badge: "Viewer",
    workspace: "Acme Global Research Lab",
    desc: "Read-only access to public workspace docs; uploads & finance docs blocked",
  },
  {
    role: "admin" as UserRole,
    name: "David Kim",
    email: "david.kim@bionova.io",
    pass: "ExternalPass123!",
    badge: "External Tenant",
    workspace: "BioNova External Tenant",
    desc: "Isolated tenant partition; cannot access Acme research corpus",
  },
];

export function Navbar({
  user,
  activeTab,
  setActiveTab,
  onSwitchPersona,
  onOpenLoginModal,
  onLogout,
  apiHealthy,
}: NavbarProps) {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/90 backdrop-blur-md">
      {/* Top primary bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Vercel-style Logo & Workspace Selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("research")}
              className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity"
              aria-label="KnowledgePilot Home"
            >
              {/* Minimal geometric emblem */}
              <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-bold text-xs rounded">
                ▲
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">
                KnowledgePilot
              </span>
            </button>

            <span className="text-zinc-600 font-light select-none">/</span>

            {/* Workspace pill */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-200 transition-colors"
                aria-label="Switch workspace or persona"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">
                  {user ? user.workspace_name : "Select Workspace"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showPersonaMenu && (
                <div
                  className="absolute left-0 mt-2 w-72 rounded-lg bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 z-50 animate-in fade-in duration-100"
                  onClick={() => setShowPersonaMenu(false)}
                >
                  <div className="px-2.5 py-1.5 border-b border-zinc-800/80 mb-1">
                    <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Workspaces & Personas
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {DEMO_PERSONAS.map((p) => {
                      const isActive = user?.email === p.email;
                      return (
                        <button
                          key={p.email}
                          onClick={() => onSwitchPersona(p.email, p.pass)}
                          className={`w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between text-xs ${
                            isActive
                              ? "bg-zinc-800 text-white font-medium"
                              : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{p.name}</span>
                              <span className="text-[10px] font-mono px-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                                {p.badge}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                              {p.workspace}
                            </div>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-zinc-800/80">
                    <button
                      onClick={onOpenLoginModal}
                      className="w-full text-left px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white rounded transition-colors"
                    >
                      Sign In with Custom Email & Password →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Health Status & Active Identity */}
          <div className="flex items-center gap-3">
            {/* Minimal backend health pill */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  apiHealthy ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span className="font-mono text-[11px]">
                {apiHealthy ? "API Online" : "Offline"}
              </span>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-medium text-zinc-200">{user.full_name}</span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{user.role}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onSwitchPersona("elena.rostova@acme.ai", "AdminPass123!")
                  }
                  className="px-3 py-1 rounded-md bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors"
                >
                  Demo Login
                </button>
                <button
                  onClick={onOpenLoginModal}
                  className="px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subnav: Vercel-style clean horizontal tabs */}
        <nav className="flex items-center space-x-6 h-10 border-t border-zinc-900 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab("research")}
            className={`h-full flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "research"
                ? "border-white text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Research & Q&A</span>
          </button>

          <button
            onClick={() => setActiveTab("corpus")}
            className={`h-full flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "corpus"
                ? "border-white text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Corpus</span>
          </button>

          <button
            onClick={() => setActiveTab("compare")}
            className={`h-full flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "compare"
                ? "border-white text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab("admin")}
            className={`h-full flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "admin"
                ? "border-white text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>FinOps & Benchmark</span>
            {user?.role !== "admin" && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                Admin
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
