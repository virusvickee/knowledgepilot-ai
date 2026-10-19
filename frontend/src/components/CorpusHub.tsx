"use client";
import React, { useState } from "react";
import { DocumentItem, UserProfile } from "@/types";
import { canUserAccessDocument } from "@/lib/citations";
import {
  Search,
  UploadCloud,
  FileText,
  Lock,
  Eye,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";

interface CorpusHubProps {
  documents: DocumentItem[];
  user: UserProfile | null;
  onOpenUpload: () => void;
  onInspectDoc: (docId: string) => void;
  onSelectForComparison: (docId: string) => void;
  onAskDoc: (docTitle: string) => void;
}

export function CorpusHub({
  documents,
  user,
  onOpenUpload,
  onInspectDoc,
  onSelectForComparison,
  onAskDoc,
}: CorpusHubProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

  const canUpload = user ? user.role === "admin" || user.role === "researcher" : false;

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVisibility =
      visibilityFilter === "all" || doc.visibility === visibilityFilter;

    return matchesSearch && matchesVisibility;
  });

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count || 0), 0);
  const flaggedCount = documents.filter((d) => d.security_flag).length;

  return (
    <div className="space-y-6">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Total Documents
          </div>
          <div className="text-xl font-semibold text-white mt-0.5 font-mono tabular-nums">
            {documents.length}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Indexed Chunks
          </div>
          <div className="text-xl font-semibold text-white mt-0.5 font-mono tabular-nums">
            {totalChunks}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Extracted Pages
          </div>
          <div className="text-xl font-semibold text-white mt-0.5 font-mono tabular-nums">
            {totalPages}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Injections Neutralized
          </div>
          <div className="text-xl font-semibold text-emerald-400 mt-0.5 font-mono tabular-nums">
            {flaggedCount}
          </div>
        </div>
      </div>

      {/* Filter and Ingestion Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              name="corpus-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title, tag, or filename…"
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">All Visibility</option>
            <option value="workspace">Workspace</option>
            <option value="restricted">Restricted</option>
            <option value="private">Private</option>
          </select>
        </div>

        <button
          onClick={onOpenUpload}
          disabled={!canUpload}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            canUpload
              ? "bg-white text-black hover:bg-zinc-200"
              : "bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Ingest Document</span>
          {!canUpload && <Lock className="w-3 h-3 ml-1" />}
        </button>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
          <FileText className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
          <div className="text-xs text-zinc-300 font-medium">No documents match criteria</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Try adjusting your search query or switch personas.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {doc.file_type}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {doc.visibility}
                  </span>
                </div>

                <h3 className="text-sm font-medium text-white line-clamp-2">
                  {doc.title}
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                  {doc.filename}
                </p>

                {doc.security_flag && (
                  <div className="mt-2.5 px-2 py-1 rounded bg-rose-950/20 border border-rose-900/40 text-[10px] text-rose-300 font-mono truncate">
                    Injection Sanitized
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 py-2.5 my-2.5 border-y border-zinc-850 text-center text-xs">
                  <div>
                    <div className="text-zinc-500 text-[10px]">PAGES</div>
                    <div className="font-mono tabular-nums text-zinc-200 mt-0.5">{doc.page_count}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-[10px]">CHUNKS</div>
                    <div className="font-mono tabular-nums text-zinc-200 mt-0.5">{doc.chunk_count}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-[10px]">SIZE</div>
                    <div className="font-mono tabular-nums text-zinc-400 mt-0.5">
                      {(doc.file_size_bytes / 1024).toFixed(0)}&nbsp;KB
                    </div>
                  </div>
                </div>

                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {doc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-850"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-1.5 border-t border-zinc-850">
                <button
                  onClick={() => onInspectDoc(doc.id)}
                  className="flex-1 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Chunks</span>
                </button>

                <button
                  onClick={() => onSelectForComparison(doc.id)}
                  className="flex-1 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>

                <button
                  onClick={() => onAskDoc(doc.title)}
                  title="Ask question focused on this document"
                  className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
