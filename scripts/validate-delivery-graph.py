#!/usr/bin/env python3
"""Validate SpecPilot roadmap/wave/slice/user-story/change relationships and kebab-case IDs.

Adopted by chg-w00-s01-repository-governance-and-openspec-foundation.
Enforces Roadmap → Wave → Slice → User Story → chg-<slice-id> integrity (12/42/126).
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KEBAB = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
US_FILE = re.compile(r"^us-(w\d{2})-(s\d{2}-[a-z0-9-]+)-(\d{3})\.md$")
CHG_RE = re.compile(r"Expected change:\s*`([^`]+)`")

issues: list[str] = []


def fail(msg: str) -> None:
    issues.append(msg)


def main() -> int:
    waves: dict[str, str] = {}
    slices: dict[str, str] = {}
    changes: dict[str, str] = {}

    for wc in sorted((ROOT / "docs/waves").glob("*/wave-contract.md")):
        text = wc.read_text(encoding="utf-8")
        wave_dir = wc.parent.name
        wave_id = wave_dir.split("-", 1)[0]
        if not re.fullmatch(r"w\d{2}", wave_id) or not KEBAB.fullmatch(wave_dir):
            fail(f"bad wave directory: {wave_dir}")
        waves[wave_id] = wave_dir
        for block in re.split(r"^### `", text, flags=re.M)[1:]:
            m = re.match(r"([^`]+)`", block)
            if not m:
                continue
            sid = m.group(1)
            if not KEBAB.fullmatch(sid):
                fail(f"non-kebab slice id: {sid}")
            if sid in slices:
                fail(f"duplicate slice: {sid}")
            if not sid.startswith(f"{wave_id}-"):
                fail(f"slice {sid} not under wave {wave_id}")
            slices[sid] = wave_id
            cm = CHG_RE.search(block)
            if not cm:
                fail(f"missing expected change for {sid}")
            else:
                changes[sid] = cm.group(1)
                if cm.group(1) != f"chg-{sid}":
                    fail(f"change for {sid} is `{cm.group(1)}`, expected `chg-{sid}`")
                if not KEBAB.fullmatch(cm.group(1)):
                    fail(f"non-kebab change id: {cm.group(1)}")

    stories = sorted((ROOT / "docs/backlog/user-stories").glob("*.md"))
    us_by_slice: dict[str, list[str]] = defaultdict(list)
    completed: list[str] = []

    for path in stories:
        m = US_FILE.match(path.name)
        if not m:
            fail(f"bad user-story filename: {path.name}")
            continue
        wid, srest, _num = m.groups()
        sid = f"{wid}-{srest}"
        us_id = path.stem
        if not KEBAB.fullmatch(us_id):
            fail(f"non-kebab user-story id: {us_id}")
        us_by_slice[sid].append(us_id)
        text = path.read_text(encoding="utf-8")
        cm = re.search(r"Expected OpenSpec change:\s*`([^`]+)`", text)
        if not cm:
            fail(f"missing expected change in {us_id}")
        elif cm.group(1) != f"chg-{sid}":
            fail(f"{us_id} change `{cm.group(1)}` != `chg-{sid}`")
        sm = re.search(r"Slice:\s*`([^`]+)`", text)
        if sm and sm.group(1) != sid:
            fail(f"{us_id} slice field `{sm.group(1)}` != `{sid}`")
        wm = re.search(r"Wave:\s*`([^`]+)`", text)
        if wm and wm.group(1) != wid:
            fail(f"{us_id} wave field `{wm.group(1)}` != `{wid}`")
        if sid not in slices:
            fail(f"{us_id} references undeclared slice `{sid}`")
        if re.search(r"(?i)status:\s*`?(completed|done|complete)`?", text):
            completed.append(us_id)

    for sid in slices:
        if sid not in us_by_slice:
            fail(f"slice has no user stories: {sid}")
        elif len(us_by_slice[sid]) != 3:
            fail(f"slice {sid} has {len(us_by_slice[sid])} stories (expected 3)")

    for sid in us_by_slice:
        if sid not in slices:
            fail(f"stories exist for undeclared slice: {sid}")

    idx = (ROOT / "docs/backlog/backlog-index.md").read_text(encoding="utf-8")
    idx_ids = set(re.findall(r"`(us-[a-z0-9-]+)`", idx))
    file_ids = {p.stem for p in stories}
    if idx_ids != file_ids:
        fail(
            f"backlog-index mismatch: missing={sorted(file_ids - idx_ids)[:5]} "
            f"extra={sorted(idx_ids - file_ids)[:5]}"
        )

    # First change binding
    first_slice = "w00-s01-repository-governance-and-openspec-foundation"
    first_change = f"chg-{first_slice}"
    expected_stories = {
        f"us-{first_slice}-001",
        f"us-{first_slice}-002",
        f"us-{first_slice}-003",
    }
    if changes.get(first_slice) != first_change:
        fail(f"first change mismatch: {changes.get(first_slice)}")
    if set(us_by_slice.get(first_slice, [])) != expected_stories:
        fail(f"first slice stories mismatch: {us_by_slice.get(first_slice)}")

    if completed:
        fail(f"completed user stories found: {completed}")

    print(
        f"PASS waves={len(waves)} slices={len(slices)} stories={len(stories)} "
        f"changes={len(changes)} first_change={first_change}"
    )
    if len(waves) != 12:
        fail(f"expected 12 waves, found {len(waves)}")
    if len(slices) != 42:
        fail(f"expected 42 slices, found {len(slices)}")
    if len(stories) != 126:
        fail(f"expected 126 stories, found {len(stories)}")

    if issues:
        for item in issues:
            print(f"FAIL: {item}", file=sys.stderr)
        print(f"FAIL delivery-graph ({len(issues)} issue(s))", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
