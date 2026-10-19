"use client";
import React, { useState, useEffect } from "react";
import { AdminDiagnostics, EvaluationBenchmarkSummary, UserProfile } from "@/types";
import { apiRequest } from "@/lib/api";
import {
  RotateCw,
  Play,
  ShieldAlert,
} from "lucide-react";

interface AdminDiagnosticsBenchmarkProps {
  token: string;
  user: UserProfile | null;
}

export function AdminDiagnosticsBenchmark({ token, user }: AdminDiagnosticsBenchmarkProps) {
  const [diagnostics, setDiagnostics] = useState<AdminDiagnostics | null>(null);
  const [evalSummary, setEvalSummary] = useState<EvaluationBenchmarkSummary | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    loadDiagnostics();
  }, [token, user]);

  async function loadDiagnostics() {
    setLoadingDiag(true);
    setError(null);
    try {
      const res = await apiRequest<AdminDiagnostics>("/api/admin/diagnostics", {}, token);
      setDiagnostics(res);
    } catch (err: any) {
      setError(err.message || "Failed to load admin telemetry");
    } finally {
      setLoadingDiag(false);
    }
  }

  async function handleRunEvaluation() {
    setRunningEval(true);
    setError(null);
    try {
      const res = await apiRequest<EvaluationBenchmarkSummary>(
        "/api/admin/evaluate",
        { method: "POST" },
        token
      );
      setEvalSummary(res);
    } catch (err: any) {
      setError(err.message || "Evaluation suite execution failed");
    } finally {
      setRunningEval(false);
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-8 rounded-lg bg-zinc-950 border border-zinc-800 text-center max-w-md mx-auto my-12 space-y-3">
        <ShieldAlert className="w-8 h-8 text-zinc-500 mx-auto" />
        <h3 className="text-sm font-semibold text-white">Administrator Access Required</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The FinOps Telemetry, Ingestion Guardrails & 10-Case Automated Evaluation Benchmark are reserved for workspace Administrators.
        </p>
        <p className="text-xs text-zinc-500 font-mono">
          Switch to <strong className="text-zinc-300">Elena Rostova (Admin)</strong> in the top-right persona selector.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
        <div>
          <h2 className="text-base font-semibold text-white">
            FinOps & Benchmark Center
          </h2>
          <p className="text-xs text-zinc-500">
            Real-time inference telemetry, cost tracking, and automated 10-case evaluation suite
          </p>
        </div>

        <button
          onClick={loadDiagnostics}
          disabled={loadingDiag}
          className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Refresh Telemetry"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loadingDiag ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-rose-950/20 border border-rose-900/60 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {diagnostics && (
        <>
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-[11px] font-medium uppercase text-zinc-500">Estimated Cost</div>
              <div className="text-xl font-semibold text-white mt-0.5 font-mono tabular-nums">
                ${diagnostics.token_and_cost_summary.estimated_total_cost_usd.toFixed(4)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">USD across all operations</div>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-[11px] font-medium uppercase text-zinc-500">Total Tokens</div>
              <div className="text-xl font-semibold text-white mt-0.5 font-mono tabular-nums">
                {diagnostics.token_and_cost_summary.total_tokens.toLocaleString()}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                P ({diagnostics.token_and_cost_summary.total_prompt_tokens}) + C ({diagnostics.token_and_cost_summary.total_completion_tokens})
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-[11px] font-medium uppercase text-zinc-500">Avg Retrieval Latency</div>
              <div className="text-xl font-semibold text-white mt-0.5 font-mono tabular-nums">
                {diagnostics.token_and_cost_summary.avg_operation_latency_ms.toFixed(1)}&nbsp;ms
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">BM25 + Hybrid Vector + Rerank</div>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-[11px] font-medium uppercase text-zinc-500">Total Chunks</div>
              <div className="text-xl font-semibold text-white mt-0.5 font-mono tabular-nums">
                {diagnostics.ingestion_summary.total_chunks_indexed}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {diagnostics.ingestion_summary.total_documents} Indexed Documents
              </div>
            </div>
          </div>

          {/* Security Audit Feed */}
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Security Audit: Intercepted Prompt Injections ({diagnostics.security_audit.sanitized_injection_chunks.length})
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                Active Guardrail
              </span>
            </div>

            {diagnostics.security_audit.sanitized_injection_chunks.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No injection attempts logged in workspace corpus.</p>
            ) : (
              <div className="space-y-2">
                {diagnostics.security_audit.sanitized_injection_chunks.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded bg-zinc-900/40 border border-zinc-850 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="font-medium">
                        {item.document_title} (Page {item.page_number}, {item.section_title})
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                        Sanitized & Neutralized
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono line-clamp-2">
                      {item.sanitized_content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 10-Case Automated Evaluation Benchmark */}
      <div className="p-5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-zinc-850 gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Automated 10-Case RAG Evaluation Benchmark Suite
            </h3>
            <p className="text-xs text-zinc-500">
              Evaluates Retrieval Recall@5, MRR, Citation Page Accuracy, Faithfulness & Defense
            </p>
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={runningEval || !token}
            className="px-3.5 py-1.5 rounded-md bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-medium transition-colors flex items-center gap-2"
          >
            {runningEval ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Running 10 Inferences…</span>
              </>
            ) : (
              <span>Run Benchmark Suite</span>
            )}
          </button>
        </div>

        {evalSummary && (
          <div className="space-y-4">
            {/* Scoreboard */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-850">
                <div className="text-[10px] text-zinc-500">OVERALL PASS</div>
                <div className="text-base font-semibold text-emerald-400 font-mono tabular-nums mt-0.5">
                  {(evalSummary.overall_pass_rate * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-850">
                <div className="text-[10px] text-zinc-500">RECALL@5</div>
                <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                  {(evalSummary.retrieval_recall_at_5 * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-850">
                <div className="text-[10px] text-zinc-500">MRR SCORE</div>
                <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                  {evalSummary.mean_reciprocal_rank_mrr.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-850">
                <div className="text-[10px] text-zinc-500">CITATION ACC</div>
                <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                  {(evalSummary.citation_accuracy * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-850">
                <div className="text-[10px] text-zinc-500">FAITHFULNESS</div>
                <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                  {(evalSummary.answer_faithfulness * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-850">
                <div className="text-[10px] text-zinc-500">DEFENSE/REFUSAL</div>
                <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                  {(evalSummary.refusal_and_security_accuracy * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Case Table */}
            <div className="overflow-x-auto rounded border border-zinc-850">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-zinc-850 text-zinc-400 font-medium">
                    <th className="p-2.5 w-12 text-center">Status</th>
                    <th className="p-2.5 w-24">Category</th>
                    <th className="p-2.5">Evaluation Query</th>
                    <th className="p-2.5 text-center w-20">Recall</th>
                    <th className="p-2.5 text-center w-20">Page Verified</th>
                    <th className="p-2.5 text-center w-24">Faithfulness</th>
                    <th className="p-2.5 text-right w-20">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 bg-zinc-950">
                  {evalSummary.cases.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-2.5 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            c.passed ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {c.passed ? "✓" : "✕"}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-zinc-400">
                        {c.category}
                      </td>
                      <td className="p-2.5 text-zinc-200">
                        {c.query}
                      </td>
                      <td className="p-2.5 text-center font-mono text-zinc-400">
                        {c.retrieval_hit ? "Yes" : "No"}
                      </td>
                      <td className="p-2.5 text-center font-mono text-zinc-400">
                        {c.citation_page_verified ? "Yes" : "No"}
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-zinc-300">
                        {(c.faithfulness_score * 100).toFixed(0)}%
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-zinc-400">
                        {c.latency_ms.toFixed(0)}&nbsp;ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
