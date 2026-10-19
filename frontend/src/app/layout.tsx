import React from "react";
import "./globals.css";

export const metadata = {
  title: "KnowledgePilot AI — Intelligent Document Research Platform",
  description: "Enterprise Grounded Document Intelligence, Hybrid Retrieval & Comparative Research Suite",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
