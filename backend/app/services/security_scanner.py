import re
from typing import Tuple, List

# Patterns indicative of direct or indirect prompt injection inside documents or user queries
INJECTION_PATTERNS = [
    (r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)", "Instruction Override Attempt"),
    (r"system\s*override|developer\s*mode\s*enabled|jailbreak", "System Override / Jailbreak Marker"),
    (r"(exfiltrate|reveal|print|output)\s+(the\s+)?(system\s+prompt|api\s+key|secret_key|environment\s+variables)", "Secret Exfiltration Attempt"),
    (r"<\s*script[^>]*>|javascript\s*:", "Embedded Script / XSS Payload"),
    (r"\[\s*SYSTEM\s*:\s*you\s+are\s+now", "Role Hijacking Directive"),
    (r"forget\s+your\s+guardrails|bypass\s+tenant\s+isolation", "Security Guardrail Bypass Attempt"),
]

ZERO_WIDTH_CHARS = ["\u200b", "\u200c", "\u200d", "\ufeff", "\u2060"]

def scan_and_sanitize_text(text: str) -> Tuple[str, bool, List[str]]:
    """
    Scans raw document or query text for prompt injection payloads and zero-width obfuscation.
    Returns (sanitized_text, flagged_boolean, list_of_findings).
    In documents, adversarial directives are neutralized with [REDACTED_INJECTION_DIRECTIVE] so
    they can never hijack downstream LLM synthesis while preserving surrounding factual text.
    """
    findings: List[str] = []
    cleaned = text

    # Strip zero-width obfuscation characters
    if any(zw in cleaned for zw in ZERO_WIDTH_CHARS):
        findings.append("Removed hidden zero-width Unicode characters")
        for zw in ZERO_WIDTH_CHARS:
            cleaned = cleaned.replace(zw, "")

    for pattern, label in INJECTION_PATTERNS:
        if re.search(pattern, cleaned, flags=re.IGNORECASE):
            findings.append(label)
            cleaned = re.sub(
                pattern,
                "[SECURITY_REDACTED_DIRECTIVE]",
                cleaned,
                flags=re.IGNORECASE,
            )

    return cleaned, (len(findings) > 0), findings

def is_malicious_user_query(query: str) -> Tuple[bool, List[str]]:
    """
    Checks whether a user query itself is attempting prompt injection, system prompt extraction,
    or cross-tenant unauthorized probing.
    """
    _, flagged, findings = scan_and_sanitize_text(query)
    return flagged, findings
