#!/usr/bin/env python3
"""Block an afterFileEdit that weakens a test under tests/**.

afterFileEdit matchers are compared to the tool name "Write", not the path,
so this script applies the tests/** scope itself. Exit 2 blocks the edit.

A test is weakened when the edit has fewer expect( occurrences than before,
or when an expect( that was live code is now inside a comment.
"""

import json
import os
import sys

TESTS_PATH = "/tests/"


def emit(payload, code):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.write("\n")
    raise SystemExit(code)


def deny(message):
    sys.stderr.write(message + "\n")
    emit(
        {
            "permission": "deny",
            "user_message": message,
            "agent_message": message,
        },
        2,
    )


def allow():
    emit({"permission": "allow"}, 0)


def in_tests(file_path):
    if not isinstance(file_path, str) or not file_path:
        return False
    normalized = file_path.replace("\\", "/")
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    return TESTS_PATH in normalized or normalized.startswith("tests/")


def scan_expects(text):
    """Return (total expect( tokens, live expect( tokens).

    Live means the token sits in code. A token inside a line comment, a block
    comment, or a string still counts toward the total.
    """
    if not isinstance(text, str):
        text = ""
    total = 0
    live = 0
    i = 0
    n = len(text)
    state = "code"
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state = "line"
                i += 2
                continue
            if ch == "/" and nxt == "*":
                state = "block"
                i += 2
                continue
            if ch in ("'", '"', "`"):
                state = ch
                i += 1
                continue
            if text.startswith("expect(", i) and not _identifier_prefix(text, i):
                total += 1
                live += 1
                i += len("expect(")
                continue
            i += 1
            continue
        if state == "line":
            if text.startswith("expect(", i) and not _identifier_prefix(text, i):
                total += 1
                i += len("expect(")
                continue
            if ch == "\n":
                state = "code"
            i += 1
            continue
        if state == "block":
            if text.startswith("expect(", i) and not _identifier_prefix(text, i):
                total += 1
                i += len("expect(")
                continue
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
                continue
            i += 1
            continue
        # string: ', ", or `
        if ch == "\\" and i + 1 < n:
            i += 2
            continue
        if ch == state:
            state = "code"
        i += 1
    return total, live


def _identifier_prefix(text, index):
    if index == 0:
        return False
    return text[index - 1].isalnum() or text[index - 1] == "_"


def weaken_reasons(before, after):
    before_total, before_live = scan_expects(before)
    after_total, after_live = scan_expects(after)
    reasons = []
    if after_total < before_total:
        reasons.append(
            f"expect( occurrences fell from {before_total} to {after_total}"
        )
    commented = (before_live - after_live) - max(before_total - after_total, 0)
    if commented > 0:
        reasons.append(
            f"an expect( was commented out ({before_live} live to {after_live})"
        )
    return reasons


def edit_pair(edit):
    if not isinstance(edit, dict):
        return "", ""
    old = edit.get("old_string")
    new = edit.get("new_string")
    return (old if isinstance(old, str) else "", new if isinstance(new, str) else "")


def reverse_edits(after, edits):
    """Rebuild the pre-edit file when every replacement is unique."""
    before = after
    for edit in reversed(edits):
        old, new = edit_pair(edit)
        if new == "":
            return None
        if before.count(new) != 1:
            return None
        before = before.replace(new, old, 1)
    return before


def before_after(file_path, edits):
    if os.path.isfile(file_path):
        with open(file_path, encoding="utf-8", errors="replace") as handle:
            after = handle.read()
        before = reverse_edits(after, edits)
        if before is not None:
            return before, after
    old_parts = []
    new_parts = []
    for edit in edits:
        old, new = edit_pair(edit)
        old_parts.append(old)
        new_parts.append(new)
    return "\n".join(old_parts), "\n".join(new_parts)


raw = sys.stdin.read()
try:
    data = json.loads(raw) if raw.strip() else {}
except json.JSONDecodeError:
    deny("Assertion gate could not parse hook input.")

if not isinstance(data, dict):
    deny("Assertion gate expected a JSON object on stdin.")

file_path = data.get("file_path") or ""
if not in_tests(file_path):
    allow()

edits = data.get("edits")
if not isinstance(edits, list):
    edits = []

before, after = before_after(file_path, edits)
reasons = weaken_reasons(before, after)
if reasons:
    deny(
        "Assertion gate blocked this edit to "
        + file_path
        + ": "
        + "; ".join(reasons)
        + ". Stop and raise the conflict. Do not weaken or delete an assertion to pass."
    )

allow()
