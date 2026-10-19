"use client";
import React, { useState } from "react";
import { X, Lock, Mail, AlertCircle } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function LoginModal({ isOpen, onClose, onLogin, loading, error }: LoginModalProps) {
  const [email, setEmail] = useState("elena.rostova@acme.ai");
  const [password, setPassword] = useState("AdminPass123!");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onLogin(email, password);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-sm rounded-lg bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close login modal"
          className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">Sign In to KnowledgePilot</h2>
          <p className="text-xs text-zinc-500">Enterprise Tenant Session</p>
        </div>

        {error && (
          <div className="mb-3.5 p-2 rounded bg-rose-950/20 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-medium transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Signing In…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-zinc-850">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Presets
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail("elena.rostova@acme.ai");
                setPassword("AdminPass123!");
              }}
              className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-left transition-colors"
            >
              <div className="font-medium text-white text-[11px]">Admin</div>
              <div className="text-[10px] text-zinc-500 truncate">Elena Rostova</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("marcus.chen@acme.ai");
                setPassword("ResearchPass123!");
              }}
              className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-left transition-colors"
            >
              <div className="font-medium text-white text-[11px]">Researcher</div>
              <div className="text-[10px] text-zinc-500 truncate">Marcus Chen</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("priya.nair@acme.ai");
                setPassword("ViewerPass123!");
              }}
              className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-left transition-colors"
            >
              <div className="font-medium text-white text-[11px]">Viewer</div>
              <div className="text-[10px] text-zinc-500 truncate">Priya Nair</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("david.kim@bionova.io");
                setPassword("ExternalPass123!");
              }}
              className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-left transition-colors"
            >
              <div className="font-medium text-white text-[11px]">External</div>
              <div className="text-[10px] text-zinc-500 truncate">David Kim</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
