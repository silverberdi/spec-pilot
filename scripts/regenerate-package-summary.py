#!/usr/bin/env python3
"""Deterministically regenerate package-summary.json for the imported canonical package.

Semantics:
- fileCount counts package files listed in `files`.
- package-summary.json intentionally excludes itself from `files` / fileCount.
- Generated OpenSpec integrations (.cursor/.codex/.opencode) are excluded.
- Candidate baseline artifacts created during reconciliation (AGENTS.md, .gitignore,
  scripts/, .cursor/rules/, etc.) are tracked under candidateBaselineFiles and remain
  outside fileCount unless an approved change promotes them into the package inventory.
"""
from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CANDIDATE_BASELINE = (
    ".gitignore",
    "AGENTS.md",
    ".cursor/rules/spec-pilot-governance.mdc",
    "scripts/validate-baseline.sh",
    "scripts/validate-delivery-graph.py",
    "scripts/scan-secrets.py",
    "scripts/regenerate-package-summary.py",
)


def is_package_path(rel: str) -> bool:
    if rel == "package-summary.json":
        return False
    if "node_modules/" in rel or rel.startswith("node_modules/"):
        return False
    if rel.startswith(("dist/", "coverage/", ".nx/", ".angular/", "tmp/", "out/")):
        return False
    root_workspace = {
        "README.md",
        "openspec/config.yaml",
        "package.json",
        "package-lock.json",
        "nx.json",
        "tsconfig.json",
        "tsconfig.base.json",
        "jest.config.ts",
        "jest.preset.js",
        ".prettierrc",
        ".prettierignore",
    }
    if rel in root_workspace:
        return True
    return rel.startswith(("bootstrap/", "docs/", "apps/", "packages/"))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main() -> None:
    package_files: list[dict] = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith((".git/", ".cursor/", ".codex/", ".opencode/", "scripts/")):
            continue
        if rel in {".gitignore", "AGENTS.md"}:
            continue
        if not is_package_path(rel):
            continue
        package_files.append(
            {
                "path": rel,
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
        )

    wave_count = len([p for p in (ROOT / "docs/waves").iterdir() if p.is_dir()])
    slice_count = 0
    for wc in (ROOT / "docs/waves").glob("*/wave-contract.md"):
        slice_count += wc.read_text(encoding="utf-8").count("\n### `")
    user_story_count = len(list((ROOT / "docs/backlog/user-stories").glob("*.md")))

    candidates = []
    for rel in CANDIDATE_BASELINE:
        path = ROOT / rel
        if path.is_file():
            candidates.append(
                {
                    "path": rel,
                    "bytes": path.stat().st_size,
                    "sha256": sha256_file(path),
                }
            )

    summary = {
        "project": "spec-pilot",
        "generated": date.today().isoformat(),
        "fileCount": len(package_files),
        "fileCountExcludesSelf": True,
        "semantics": {
            "fileCountExcludesSelf": True,
            "excludesGeneratedIntegrations": True,
            "candidateBaselineOutsideFileCount": True,
            "description": (
                "fileCount and files list the canonical package inventory (docs, bootstrap, "
                "apps/, packages/, and root workspace manifests) and intentionally exclude "
                "package-summary.json itself. Generated OpenSpec integrations are excluded. "
                "candidateBaselineFiles lists reconciliation candidates outside fileCount."
            ),
        },
        "waveCount": wave_count,
        "sliceCount": slice_count,
        "userStoryCount": user_story_count,
        "candidateBaselineFiles": candidates,
        "files": package_files,
    }

    out = ROOT / "package-summary.json"
    out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(
        f"wrote {out} fileCount={summary['fileCount']} "
        f"(excludes self) candidates={len(candidates)} "
        f"waves={wave_count} slices={slice_count} stories={user_story_count}"
    )


if __name__ == "__main__":
    main()
