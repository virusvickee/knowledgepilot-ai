/**
 * Pure utility functions for citation parsing, passage highlighting, RBAC permission checks,
 * and hybrid score computation — shared between Next.js UI and frontend unit tests.
 */

export function highlightPassageInText(fullText, highlightedPassage) {
  if (!fullText || !highlightedPassage) {
    return [{ text: fullText || "", highlighted: false }];
  }
  const cleanTarget = highlightedPassage.trim();
  const idx = fullText.toLowerCase().indexOf(cleanTarget.toLowerCase());
  if (idx === -1) {
    // Fallback to matching first 50 chars if passage spans two sentences
    const prefix = cleanTarget.slice(0, 50).toLowerCase();
    const pIdx = fullText.toLowerCase().indexOf(prefix);
    if (pIdx === -1) {
      return [{ text: fullText, highlighted: false }];
    }
    const endIdx = Math.min(fullText.length, pIdx + cleanTarget.length);
    return [
      { text: fullText.slice(0, pIdx), highlighted: false },
      { text: fullText.slice(pIdx, endIdx), highlighted: true },
      { text: fullText.slice(endIdx), highlighted: false },
    ].filter((s) => s.text.length > 0);
  }
  return [
    { text: fullText.slice(0, idx), highlighted: false },
    { text: fullText.slice(idx, idx + cleanTarget.length), highlighted: true },
    { text: fullText.slice(idx + cleanTarget.length), highlighted: false },
  ].filter((s) => s.text.length > 0);
}

export function canUserAccessDocument(user, doc, action = "read") {
  if (!user || !doc) return false;
  if (user.workspace_id !== doc.workspace_id) return false;
  if (user.role === "admin") return true;
  if (doc.owner_id === user.id) return true;
  if ((action === "write" || action === "upload") && user.role === "viewer") return false;
  if (doc.visibility === "private") return false;
  return Array.isArray(doc.allowed_roles) && doc.allowed_roles.includes(user.role);
}

export function computeHybridScore(vectorScore, bm25Score, alpha = 0.55) {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return Number((clampedAlpha * vectorScore + (1 - clampedAlpha) * bm25Score).toFixed(4));
}

export function validateUploadFileMeta(filename, sizeBytes, maxBytes = 15 * 1024 * 1024) {
  if (!filename || !filename.includes(".")) {
    return { valid: false, error: "Filename must include an extension (.pdf, .docx, .txt, .md)" };
  }
  const ext = filename.split(".").pop().toLowerCase();
  if (!["pdf", "docx", "txt", "md"].includes(ext)) {
    return { valid: false, error: `Unsupported file extension .${ext}` };
  }
  if (sizeBytes <= 0) {
    return { valid: false, error: "File is empty (0 bytes)" };
  }
  if (sizeBytes > maxBytes) {
    return { valid: false, error: "File exceeds 15 MB limit" };
  }
  return { valid: true, ext };
}
