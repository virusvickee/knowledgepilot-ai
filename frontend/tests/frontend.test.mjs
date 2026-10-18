import test from "node:test";
import assert from "node:assert/strict";
import {
  highlightPassageInText,
  canUserAccessDocument,
  computeHybridScore,
  validateUploadFileMeta,
} from "../src/lib/citations.mjs";

test("highlightPassageInText splits source chunk and marks exact supporting passage", () => {
  const source =
    "All customer data at rest is encrypted using AES-256-GCM with HSM-backed keys. Keys rotate every 90 days.";
  const target = "encrypted using AES-256-GCM with HSM-backed keys.";
  const segments = highlightPassageInText(source, target);

  assert.equal(segments.length, 3);
  assert.equal(segments[0].highlighted, false);
  assert.equal(segments[1].highlighted, true);
  assert.equal(segments[1].text, target);
  assert.equal(segments[2].highlighted, false);
});

test("canUserAccessDocument enforces strict workspace tenant isolation and RBAC roles", () => {
  const acmeAdmin = { id: "usr_admin", role: "admin", workspace_id: "ws_acme" };
  const acmeViewer = { id: "usr_viewer", role: "viewer", workspace_id: "ws_acme" };
  const externalAdmin = { id: "usr_ext", role: "admin", workspace_id: "ws_external" };

  const restrictedFinanceDoc = {
    id: "doc_fin",
    workspace_id: "ws_acme",
    owner_id: "usr_admin",
    visibility: "restricted",
    allowed_roles: ["admin", "researcher"],
  };

  assert.equal(canUserAccessDocument(acmeAdmin, restrictedFinanceDoc, "read"), true);
  assert.equal(canUserAccessDocument(acmeViewer, restrictedFinanceDoc, "read"), false);
  assert.equal(canUserAccessDocument(externalAdmin, restrictedFinanceDoc, "read"), false);
  assert.equal(canUserAccessDocument(acmeViewer, restrictedFinanceDoc, "upload"), false);
});

test("computeHybridScore combines dense vector and BM25 lexical scores using configurable alpha", () => {
  const score = computeHybridScore(0.8, 0.6, 0.55);
  assert.equal(score, 0.71);
});

test("validateUploadFileMeta rejects unsupported extensions, empty files, and oversized payloads", () => {
  assert.equal(validateUploadFileMeta("report.pdf", 10240).valid, true);
  assert.equal(validateUploadFileMeta("protocol.md", 4096).valid, true);
  assert.equal(validateUploadFileMeta("payload.exe", 2048).valid, false);
  assert.equal(validateUploadFileMeta("empty.txt", 0).valid, false);
  assert.equal(validateUploadFileMeta("huge.pdf", 25 * 1024 * 1024).valid, false);
});
