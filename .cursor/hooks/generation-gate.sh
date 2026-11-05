#!/usr/bin/env python3
"""Generation gate for agent edits under tests/**.

afterFileEdit matchers are compared to the tool name "Write", not the path,
so this script applies the tests/** scope itself. Exit 2 blocks the edit.
"""

import json
import os
import re
import sys

LOCATOR = re.compile(r"""page\.locator\(\s*(['"`])(.*?)\1""", re.DOTALL)
TESTS_PATH = re.compile(r"(^|/)tests/")


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


raw = sys.stdin.read()
try:
    data = json.loads(raw) if raw.strip() else {}
except json.JSONDecodeError:
    deny("Generation gate could not parse hook input.")

if not isinstance(data, dict):
    deny("Generation gate expected a JSON object on stdin.")

file_path = data.get("file_path") or ""
if not isinstance(file_path, str) or not TESTS_PATH.search(file_path.replace("\\", "/")):
    emit({"permission": "allow"}, 0)

if not os.path.isfile(file_path):
    deny(f"Generation gate could not read {file_path}.")

with open(file_path, encoding="utf-8", errors="replace") as handle:
    content = handle.read()

reasons = []
if "expect(" not in content:
    reasons.append("spec contains no expect( (a test that asserts nothing)")

for match in LOCATOR.finditer(content):
    selector = match.group(2)
    if "." in selector or "#" in selector or "//" in selector:
        quote = match.group(1)
        reasons.append(
            f"CSS or XPath locator page.locator({quote}{selector}{quote})"
        )
        break

if reasons:
    deny("Generation gate blocked this spec: " + "; ".join(reasons))

emit({"permission": "allow"}, 0)
