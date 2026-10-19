"use client";
import React, { useState } from "react";
import { DocumentItem, CompareDocumentsResponse } from "@/types";
import { apiRequest } from "@/lib/api";
import {
  FileSpreadsheet,
  Check,
  Copy,
  Printer,
  Sparkles,
} from "lucide-react";

interface ComparisonStudioProps {
  documents: DocumentItem[];
  token: string;
  preselectedDocId?: string | null;
  onInspectDoc: (docId: string) => void;
}

const COMPARISON_TOPIC_PRESETS = [
  "Architecture, Security Controls, SLA Commitments, and Governance Metrics",
  "Encryption at Rest, Key Management HSM, and TLS In-Transit Standards",
  "Disaster Recovery, High Availability, RPO & RTO Objectives",
  "Financial Liabilities, SLA Breach Penalty Credits & Cap Limits",
];

export function ComparisonStudio({
  documents,
  token,
  preselectedDocId,
  onInspectDoc,
}: ComparisonStudioProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    preselectedDocId
      ? [preselectedDocId, ...documents.filter((d) => d.id !== preselectedDocId).slice(0, 1).map((d) => d.id)]
      : documents.slice(0, 2).map((d) => d.id)
  );
  const [focusTopic, setFocusTopic] = useState(COMPARISON_TOPIC_PRESETS[0]);
  const [topKPerDoc, setTopKPerDoc] = useState(3);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CompareDocumentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleDoc(id: string) {
    if (selectedDocIds.includes(id)) {
      if (selectedDocIds.length > 2) {
        setSelectedDocIds(selectedDocIds.filter((item) => item !== id));
      }
    } else {
      if (selectedDocIds.length < 6) {
        setSelectedDocIds([...selectedDocIds, id]);
      }
    }
  }

  async function handleCompare() {
    if (selectedDocIds.length < 2) {
      setError("Please select at least 2 documents to compare (up to 6)");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest<CompareDocumentsResponse>(
        "/api/compare",
        {
          method: "POST",
          body: JSON.stringify({
            document_ids: selectedDocIds,
            focus_topic: focusTopic,
            top_k_per_doc: topKPerDoc,
          }),
        },
        token
      );
      setReport(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate comparison report");
    } finally {
      setLoading(false);
    }
  }

  function copyMarkdown() {
    if (!report) return;
    let md = `# ${report.report_title}\n\n`;
    md += `**Focus Topic**: ${report.focus_topic}\n\n`;
    md += `## Executive Summary\n${report.executive_summary}\n\n`;
    md += `## Key Agreements\n` + report.key_agreements.map((a) => `- ${a}`).join("\n") + "\n\n";
    md += `## Contradictions & Strategic Gaps\n` + report.key_contradictions_or_gaps.map((c) => `- ${c}`).join("\n") + "\n\n";
    md += `## Recommended Actions\n` + report.recommended_actions.map((r, i) => `${i + 1}. ${r}`).join("\n") + "\n";

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="p-5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-850">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Multi-Document Comparative Synthesis
            </h2>
            <p className="text-xs text-zinc-500">
              Cross-document alignment matrix and strategic gap detection
            </p>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            Selected: <span className="text-white font-semibold">{selectedDocIds.length}</span>/6 Documents (Min 2)
          </div>
        </div>

        {/* Document Selector Grid */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">Select Documents to Compare:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {documents.map((doc) => {
              const selected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`p-2.5 rounded-md border cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs ${
                    selected
                      ? "bg-zinc-900 border-zinc-600 text-white"
                      : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{doc.title}</div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
                      {doc.file_type} • {doc.page_count}p
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                      selected
                        ? "bg-white border-white text-black"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Focus Topic and Presets */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">Research Focus Topic:</label>
          <input
            type="text"
            value={focusTopic}
            onChange={(e) => setFocusTopic(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-200"
          />

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="text-[11px] text-zinc-500 self-center mr-1">Presets:</span>
            {COMPARISON_TOPIC_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setFocusTopic(p)}
                className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {p.slice(0, 32)}…
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={handleCompare}
            disabled={loading || selectedDocIds.length < 2 || !token}
            className="px-4 py-2 rounded-md bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Comparing Across {selectedDocIds.length} Docs…</span>
              </>
            ) : (
              <span>Generate Comparative Synthesis Report</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-rose-950/20 border border-rose-900/60 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Generated Report */}
      {report && (
        <div className="p-5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-zinc-850 gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">{report.report_title}</h3>
              <div className="text-xs text-zinc-400 font-mono mt-0.5">
                Topic: {report.focus_topic}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyMarkdown}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Markdown"}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3 h-3" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-md bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Executive Summary
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed font-sans">
              {report.executive_summary}
            </p>
          </div>

          {/* Comparison Matrix Table */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Dimension Comparison Matrix
            </div>

            <div className="overflow-x-auto rounded border border-zinc-850">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-zinc-850 text-zinc-400 font-medium">
                    <th className="p-3 w-1/4">Evaluation Dimension</th>
                    {report.documents_compared.map((doc) => (
                      <th key={doc.id} className="p-3">
                        <div className="truncate max-w-[180px] text-zinc-200">{doc.title}</div>
                        <div className="text-[10px] text-zinc-500 font-mono font-normal">
                          {doc.filename}
                        </div>
                      </th>
                    ))}
                    <th className="p-3 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 bg-zinc-950">
                  {report.comparison_matrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-3 font-medium text-zinc-200 align-top">
                        {row.dimension}
                      </td>
                      {report.documents_compared.map((doc) => (
                        <td key={doc.id} className="p-3 text-zinc-300 align-top leading-relaxed">
                          {row.findings_by_document[doc.id] || "No explicit clause mentioned in document"}
                        </td>
                      ))}
                      <td className="p-3 align-top text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                            row.consensus_or_conflict.toLowerCase().includes("conflict") ||
                            row.consensus_or_conflict.toLowerCase().includes("gap")
                              ? "bg-rose-950/20 border-rose-900/60 text-rose-300"
                              : "bg-emerald-950/20 border-emerald-900/60 text-emerald-300"
                          }`}
                        >
                          {row.consensus_or_conflict}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agreements & Contradictions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-md bg-zinc-950 border border-zinc-850 space-y-2">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Key Agreements & Mutual Standards
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {report.key_agreements.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-zinc-500">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-md bg-zinc-950 border border-zinc-850 space-y-2">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Contradictions & Strategic Gaps
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {report.key_contradictions_or_gaps.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-zinc-500">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="p-4 rounded-md bg-zinc-950 border border-zinc-850 space-y-2.5">
            <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Recommended Strategic Actions
            </div>
            <div className="space-y-1.5">
              {report.recommended_actions.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <span className="font-mono text-zinc-500">{i + 1}.</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
