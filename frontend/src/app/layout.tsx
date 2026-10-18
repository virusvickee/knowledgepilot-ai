import React from "react";

export const metadata = {
  title: "KnowledgePilot AI — Intelligent Document Research Platform",
  description: "Enterprise Grounded Document Intelligence, Hybrid Retrieval & Comparative Research Suite",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
