"use client";
import React, { useState, useEffect } from "react";
import { DocumentItem, DocumentChunk } from "@/types";
import { apiRequest } from "@/lib/api";
import { X, Search } from "lucide-react";

interface DocumentReaderModalProps {
  documentId: string | null;
  token: string;
  onClose: () => void;
}

export function DocumentReaderModal({ documentId, token, onClose }: DocumentReaderModalProps) {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedPage, setSelectedPage] = useState<number | "all">("all");

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    apiRequest<{ document: DocumentItem; chunks: DocumentChunk[] }>(
      `/api/documents/${documentId}`,
      {},
      token
    )
      .then((res) => {
        setDoc(res.document);
        setChunks(res.chunks || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [documentId, token]);

  if (!documentId) return null;

  const pages = Array.from(new Set(chunks.map((c) => c.page_number))).sort((a, b) => a - b);

  const filteredChunks = chunks.filter((c) => {
    const matchesPage = selectedPage === "all" || c.page_number === selectedPage;
    const matchesQuery =
      !searchFilter.trim() ||
      c.sanitized_content.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.section_title.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesPage && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-lg bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-850">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white truncate max-w-lg">
                {doc?.title || "Document Chunks"}
              </h2>
              {doc?.security_flag && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/60">
                  Sanitized
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5 flex items-center gap-2">
              <span>{doc?.filename}</span>
              <span>•</span>
              <span className="uppercase">{doc?.file_type}</span>
              <span>•</span>
              <span>{doc?.page_count}&nbsp;Pages</span>
              <span>•</span>
              <span>{chunks.length}&nbsp;Chunks</span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close reader modal"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-850 bg-zinc-900/30">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              name="chunk-search"
              autoComplete="off"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter chunks…"
              className="w-full pl-8 pr-3 py-1 rounded bg-zinc-900 border border-zinc-800 focus:border-zinc-600 text-xs text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 text-[11px]">Page:</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
              <button
                onClick={() => setSelectedPage("all")}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  selectedPage === "all"
                    ? "bg-white text-black font-medium"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All
              </button>
              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPage(p)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
                    selectedPage === p
                      ? "bg-white text-black font-medium"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  p.{p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-zinc-500 text-xs">
              Loading document vector chunks…
            </div>
          ) : error ? (
            <div className="p-3 rounded bg-rose-950/20 border border-rose-900 text-rose-300 text-xs">
              {error}
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No chunks match search criteria.
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="p-3.5 rounded-md bg-zinc-900/30 border border-zinc-850 hover:border-zinc-700 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-zinc-850/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-400">
                      #{chunk.chunk_index + 1}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300 font-mono text-[11px]">
                      Page {chunk.page_number}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400 text-xs">
                      {chunk.section_title || "General"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                    <span>[{chunk.char_start}..{chunk.char_end}]</span>
                    <span>•</span>
                    <span>{chunk.token_count}&nbsp;Tokens</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {chunk.sanitized_content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
