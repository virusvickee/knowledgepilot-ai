"use client";
import React, { useState, useRef } from "react";
import { DocumentItem, UserProfile } from "@/types";
import { validateUploadFileMeta } from "@/lib/citations";
import { apiRequest } from "@/lib/api";
import { X, UploadCloud, FileText, AlertTriangle } from "lucide-react";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  user: UserProfile | null;
  onUploadSuccess: (newDoc: DocumentItem) => void;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  token,
  user,
  onUploadSuccess,
}: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"workspace" | "restricted" | "private">("workspace");
  const [allowedRoles, setAllowedRoles] = useState<string[]>(["admin", "researcher", "viewer"]);
  const [tags, setTags] = useState("research, enterprise, security");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileSelect(file: File) {
    const val = validateUploadFileMeta(file.name, file.size);
    if (!val.valid) {
      setError(val.error || "Invalid file");
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    if (!title) {
      const clean = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function toggleRole(role: string) {
    if (allowedRoles.includes(role)) {
      if (allowedRoles.length > 1) {
        setAllowedRoles(allowedRoles.filter((r) => r !== role));
      }
    } else {
      setAllowedRoles([...allowedRoles, role]);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a document file (.pdf, .docx, .txt, .md)");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (title.trim()) formData.append("title", title.trim());
      formData.append("visibility", visibility);
      formData.append("allowed_roles", allowedRoles.join(","));
      formData.append("tags", tags);

      const res = await apiRequest<DocumentItem>("/api/documents/upload", {
        method: "POST",
        body: formData,
      }, token);

      onUploadSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to ingest document");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-lg rounded-lg bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close upload modal"
          className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">Ingest Research Document</h2>
          <p className="text-xs text-zinc-500">
            Extraction, sliding-window chunking, and semantic vector indexing
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-rose-950/20 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-3.5">
          {/* Drag & drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-md p-5 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-zinc-500 bg-zinc-900/80"
                : selectedFile
                ? "border-zinc-600 bg-zinc-900/40"
                : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2.5 text-left">
                <FileText className="w-5 h-5 text-zinc-300" />
                <div>
                  <div className="text-xs font-medium text-white">{selectedFile.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)}&nbsp;KB • Ready to index
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <UploadCloud className="w-5 h-5 text-zinc-400 mx-auto mb-1.5" />
                <div className="text-xs font-medium text-zinc-300">
                  Drop PDF, DOCX, TXT, or MD here, or browse
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Magic-byte validation and prompt injection defense (Max 15MB)
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Title
            </label>
            <input
              type="text"
              name="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enterprise Security Policy 2026"
              className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-200"
              >
                <option value="workspace">Workspace</option>
                <option value="restricted">Restricted</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Tags
              </label>
              <input
                type="text"
                name="doc-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="compliance, security"
                className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Allowed Roles (RBAC)
            </label>
            <div className="flex items-center gap-2">
              {(["admin", "researcher", "viewer"] as const).map((r) => {
                const active = allowedRoles.includes(r);
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors border ${
                      active
                        ? "bg-zinc-800 border-zinc-600 text-white font-medium"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    <span className="capitalize">{r}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-2 rounded-md bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Indexing Document…</span>
                </>
              ) : (
                <span>Ingest Document</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
