// Re-export pure helpers with TypeScript signatures
// @ts-ignore
import {
  highlightPassageInText as _highlightPassageInText,
  canUserAccessDocument as _canUserAccessDocument,
  computeHybridScore as _computeHybridScore,
  validateUploadFileMeta as _validateUploadFileMeta,
} from "./citations.mjs";
import { DocumentItem, UserProfile } from "@/types";

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export function highlightPassageInText(fullText: string, highlightedPassage: string): HighlightSegment[] {
  return _highlightPassageInText(fullText, highlightedPassage);
}

export function canUserAccessDocument(
  user: UserProfile | null,
  doc: DocumentItem | null,
  action: "read" | "write" | "upload" = "read"
): boolean {
  return _canUserAccessDocument(user, doc, action);
}

export function computeHybridScore(vectorScore: number, bm25Score: number, alpha: number = 0.55): number {
  return _computeHybridScore(vectorScore, bm25Score, alpha);
}

export function validateUploadFileMeta(
  filename: string,
  sizeBytes: number,
  maxBytes: number = 15 * 1024 * 1024
): { valid: boolean; ext?: string; error?: string } {
  return _validateUploadFileMeta(filename, sizeBytes, maxBytes);
}
