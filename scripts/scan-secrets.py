#!/usr/bin/env python3
"""Heuristic secret scan for SpecPilot baseline files (excludes generated OpenSpec integrations)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE_PREFIXES = (
    ".git/",
    ".cursor/commands/",
    ".cursor/skills/",
    ".codex/",
    ".opencode/",
    "node_modules/",
)

# Quarantine for change-scoped evidence only (fixtures / redacted transcripts
# under .../evidence/). Does not weaken scanning of canonical docs or scripts.
EXCLUDE_SUBSTRINGS = (
    "/evidence/",
)
EXCLUDE_NAMES = {".DS_Store"}

PATTERNS = [
    ("aws_access_key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("generic_api_key_assignment", re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][^'\"]{12,}")),
    ("private_key_block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("github_pat", re.compile(r"ghp_[A-Za-z0-9]{36}")),
    ("slack_token", re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}")),
]

# Allowlisted documentation examples / field names
ALLOW_SUBSTRINGS = (
    "DEEPSEEK_API_KEY",
    "process.env",
    "credentials.json",  # mentioned as ignore pattern
)


def iter_files():
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if any(rel.startswith(p) for p in EXCLUDE_PREFIXES):
            continue
        if any(s in rel for s in EXCLUDE_SUBSTRINGS):
            continue
        if path.name in EXCLUDE_NAMES:
            continue
        if path.suffix in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip"}:
            continue
        yield path, rel


def main() -> int:
    findings: list[str] = []
    for path, rel in iter_files():
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            findings.append(f"{rel}: unreadable ({exc})")
            continue
        for name, pat in PATTERNS:
            for match in pat.finditer(text):
                snippet = match.group(0)
                if any(a.lower() in snippet.lower() or a.lower() in text[max(0, match.start()-40):match.end()+40].lower() for a in ALLOW_SUBSTRINGS):
                    # still flag real private key blocks
                    if name != "private_key_block" and "BEGIN" not in snippet:
                        # Only skip soft assignment patterns near documented env var names
                        window = text[max(0, match.start() - 80) : match.end() + 80]
                        if any(a in window for a in ALLOW_SUBSTRINGS):
                            continue
                findings.append(f"{rel}: possible {name}: {snippet[:48]}...")
    if findings:
        for item in findings[:50]:
            print(f"ERROR: {item}", file=sys.stderr)
        if len(findings) > 50:
            print(f"ERROR: ... and {len(findings) - 50} more", file=sys.stderr)
        return 1
    print("no heuristic secrets found")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
