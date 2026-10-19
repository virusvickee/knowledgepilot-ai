"use client";
import React, { useState, useEffect } from "react";
import { DocumentItem, UserProfile } from "@/types";
import { apiRequest } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { ResearchChat } from "@/components/ResearchChat";
import { CorpusHub } from "@/components/CorpusHub";
import { ComparisonStudio } from "@/components/ComparisonStudio";
import { AdminDiagnosticsBenchmark } from "@/components/AdminDiagnosticsBenchmark";
import { DocumentReaderModal } from "@/components/DocumentReaderModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { LoginModal } from "@/components/LoginModal";

export default function KnowledgePilotDashboard() {
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"research" | "corpus" | "compare" | "admin">("research");
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);

  // Modals state
  const [inspectDocId, setInspectDocId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Cross-tab interaction state
  const [preselectedCompareDocId, setPreselectedCompareDocId] = useState<string | null>(null);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>("");

  // Check health and auto-login with Dr. Elena Rostova on initial load
  useEffect(() => {
    // Ping API health
    fetch("http://localhost:8000/api/health")
      .then((res) => setApiHealthy(res.ok))
      .catch(() => setApiHealthy(false));

    // Auto login as default demo admin
    handleLogin("elena.rostova@acme.ai", "AdminPass123!");
  }, []);

  async function handleLogin(email: string, pass: string) {
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await apiRequest<{ access_token: string; user: UserProfile }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: pass }),
      });
      setToken(res.access_token);
      setUser(res.user);
      setShowLoginModal(false);

      // Load documents for this authorized session
      const docs = await apiRequest<DocumentItem[]>("/api/documents", {}, res.access_token);
      setDocuments(docs);
    } catch (err: any) {
      setLoginError(err.message || "Failed to authenticate session");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    setDocuments([]);
    setShowLoginModal(true);
  }

  async function refreshDocuments() {
    if (!token) return;
    try {
      const docs = await apiRequest<DocumentItem[]>("/api/documents", {}, token);
      setDocuments(docs);
    } catch (e) {
      console.error("Failed to refresh documents", e);
    }
  }

  function handleSelectForComparison(docId: string) {
    setPreselectedCompareDocId(docId);
    setActiveTab("compare");
  }

  function handleAskDoc(docTitle: string) {
    setChatInitialQuery(`What are the key governance standards and SLA objectives defined in ${docTitle}?`);
    setActiveTab("research");
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSwitchPersona={handleLogin}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        apiHealthy={apiHealthy}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "research" && (
          <ResearchChat
            documents={documents}
            token={token}
            user={user}
            onInspectDoc={(id) => setInspectDocId(id)}
            initialQuery={chatInitialQuery}
          />
        )}

        {activeTab === "corpus" && (
          <CorpusHub
            documents={documents}
            user={user}
            onOpenUpload={() => setShowUploadModal(true)}
            onInspectDoc={(id) => setInspectDocId(id)}
            onSelectForComparison={handleSelectForComparison}
            onAskDoc={handleAskDoc}
          />
        )}

        {activeTab === "compare" && (
          <ComparisonStudio
            documents={documents}
            token={token}
            preselectedDocId={preselectedCompareDocId}
            onInspectDoc={(id) => setInspectDocId(id)}
          />
        )}

        {activeTab === "admin" && (
          <AdminDiagnosticsBenchmark token={token} user={user} />
        )}
      </main>

      {/* Modals */}
      <DocumentReaderModal
        documentId={inspectDocId}
        token={token}
        onClose={() => setInspectDocId(null)}
      />

      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        token={token}
        user={user}
        onUploadSuccess={(newDoc) => {
          setDocuments((prev) => [newDoc, ...prev]);
        }}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
      />
    </div>
  );
}
