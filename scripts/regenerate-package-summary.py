#!/usr/bin/env python3
"""Deterministically regenerate package-summary.json for the SpecPilot package.

Semantics:
- fileCount counts package files listed in `files`.
- package-summary.json intentionally excludes itself from `files` / fileCount.
- Generated OpenSpec integrations (.cursor/.codex/.opencode command/skill trees) are excluded.
- Artifacts adopted by w00-s01 are tracked under adoptedBaselineFiles (outside fileCount).
"""
from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ADOPTED_BASELINE = (
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
    if rel in {"README.md", "openspec/config.yaml"}:
        return True
    return rel.startswith(("bootstrap/", "docs/"))


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

    adopted = []
    for rel in ADOPTED_BASELINE:
        path = ROOT / rel
        if path.is_file():
            adopted.append(
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
        "semantics": (
            "fileCount and files list the imported canonical package inventory and "
            "intentionally exclude package-summary.json itself. Generated OpenSpec "
            "integrations are excluded. adoptedBaselineFiles lists artifacts formally "
            "adopted via w00-s01 / chg-w00-s01-repository-governance-and-openspec-foundation "
            "and remain outside fileCount. This does not complete w00-s02+."
        ),
        "waveCount": wave_count,
        "sliceCount": slice_count,
        "userStoryCount": user_story_count,
        "adoptedBaselineFiles": adopted,
        "candidateBaselineFiles": [],
        "files": package_files,
    }

    out = ROOT / "package-summary.json"
    out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(
        f"PASS wrote {out} fileCount={summary['fileCount']} "
        f"(excludes self) adopted={len(adopted)} "
        f"waves={wave_count} slices={slice_count} stories={user_story_count}"
    )


if __name__ == "__main__":
    main()
