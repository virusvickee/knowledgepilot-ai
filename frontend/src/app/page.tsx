"use client";
import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { DocumentItem, UserProfile, CitationItem } from "@/types";

export default function KnowledgePilotDashboard() {
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(email: string, password: string) {
    try {
      setError(null);
      const res = await apiRequest<{ access_token: string; user: UserProfile }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.access_token);
      setUser(res.user);
      const docs = await apiRequest<DocumentItem[]>("/api/documents", {}, res.access_token);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ answer: string; citations: CitationItem[] }>(
        "/api/chat/query",
        {
          method: "POST",
          body: JSON.stringify({ query, top_k: 5, hybrid_alpha: 0.55, enable_reranker: true }),
        },
        token
      );
      setAnswer(res.answer);
      setCitations(res.citations);
      if (res.citations.length > 0) setActiveCitation(res.citations[0]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KnowledgePilot AI</h1>
          <p className="text-sm text-slate-400">Intelligent Document Research & Grounded Synthesis Platform</p>
        </div>
        {!user ? (
          <button
            onClick={() => handleLogin("elena.rostova@acme.ai", "AdminPass123!")}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
          >
            Sign In (Demo Admin)
          </button>
        ) : (
          <div className="text-right text-sm">
            <div className="font-semibold">{user.full_name}</div>
            <div className="text-xs text-indigo-400 uppercase">{user.role} • {user.workspace_name}</div>
          </div>
        )}
      </header>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <section className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Workspace Corpus ({documents.length})</h2>
          {documents.map((doc) => (
            <div key={doc.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="font-medium text-sm">{doc.title}</div>
              <div className="text-xs text-slate-400 mt-1">
                {doc.file_type.toUpperCase()} • {doc.page_count}p • {doc.chunk_count} chunks • {doc.visibility}
              </div>
            </div>
          ))}
        </section>

        <section className="lg:col-span-8 space-y-4">
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a grounded research question across your authorized documents..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !token}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? "Synthesizing..." : "Research"}
            </button>
          </form>

          {answer && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="prose prose-invert max-w-none text-sm whitespace-pre-line">{answer}</div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                {citations.map((c) => (
                  <button
                    key={c.chunk_id}
                    onClick={() => setActiveCitation(c)}
                    className="px-3 py-1 rounded-full text-xs bg-indigo-950/80 border border-indigo-700/60 text-indigo-300"
                  >
                    [{c.citation_index}] {c.document_title} • p.{c.page_number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeCitation && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-700/40">
              <div className="text-xs font-semibold text-amber-300 uppercase">
                Verified Source Passage • {activeCitation.document_title} (Page {activeCitation.page_number}, {activeCitation.section_title})
              </div>
              <mark className="block mt-2 p-2.5 rounded bg-amber-500/20 text-amber-100 text-sm">
                {activeCitation.highlighted_passage}
              </mark>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
