#!/usr/bin/env python3
"""Block a constitution WON'T violation introduced under tests/** or pages/**.

afterFileEdit matchers are compared to the tool name "Write", not the path,
so this script applies the tests/** and pages/** scope itself. Exit 2 blocks
the edit. A violation already in the file is left alone; only an edit that
adds one is blocked.
"""

import json
import os
import re
import sys

SCOPE = re.compile(r"(^|/)(?:tests|pages)/")

WAIT = re.compile(r"\bwaitForTimeout\s*\(")
ANY_TYPE = re.compile(
    r"(?:(?::\s*|\bas\s+|\bsatisfies\s+|[|&]\s*|<\s*|,\s*)any\b|\bany\s*\[\s*\])"
)
LOCATOR_ARG = re.compile(
    r"""\b(?:locator|frameLocator|\$x)\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1""",
    re.DOTALL,
)
XPATH_TOKEN = re.compile(r"(?i)(?<![A-Za-z0-9_])xpath\s*=")
DOLLAR_X = re.compile(r"(?<![\w$])\$x\s*\(")
DESCRIBE = re.compile(
    r"\btest\.describe(?!\.configure)"
    r"(?:\.(?:only|skip|fixme|serial|parallel))?"
    r"(?:\s*<[^;\n]{0,80}>)?\s*\("
)
FILL = re.compile(
    r"""\.(?:fill|type|pressSequentially)\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1""",
    re.DOTALL,
)
ASSIGN = re.compile(
    r"""(?<!\w)([A-Za-z_][A-Za-z0-9_]*)\s*\??\s*[:=]\s*(['"`])((?:\\.|(?!\2).)*)\2"""
)
BEARER = re.compile(r"Bearer\s+([A-Za-z0-9._\-]{8,})")
SENSITIVE_NAME = re.compile(
    r"(?i)(?:password|passwd|secret|api[_-]?key|access[_-]?token|"
    r"auth[_-]?token|bearer[_-]?token|token)"
)
SOFT = re.compile(r"\bexpect\.soft\s*\(")
STRONG_MATCHERS = (
    "toEqual",
    "toStrictEqual",
    "toBe",
    "toHaveText",
    "toContainText",
    "toHaveCount",
    "toHaveValue",
    "toHaveAttribute",
    "toHaveClass",
    "toHaveURL",
    "toHaveTitle",
    "toBeVisible",
    "toBeEnabled",
    "toBeDisabled",
    "toBeChecked",
    "toBeFocused",
    "toBeOK",
    "toHaveLength",
    "toMatch",
    "toMatchObject",
    "toContain",
)
WEAK_MATCHERS = ("toBeTruthy", "toBeFalsy", "toBeDefined", "toBeUndefined")


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


def in_scope(file_path):
    if not isinstance(file_path, str) or not file_path:
        return False
    return SCOPE.search(file_path.replace("\\", "/")) is not None


def views(text):
    """Return (code, with_strings).

    code blanks comments and string contents. with_strings blanks comments
    only, so a locator or credential literal can still be read. Length and
    newlines stay aligned with text.
    """
    if not isinstance(text, str):
        text = ""
    n = len(text)
    code = [" "] * n
    kept = [" "] * n
    i = 0
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
            if ch == "'":
                state = "sq"
                kept[i] = ch
                i += 1
                continue
            if ch == '"':
                state = "dq"
                kept[i] = ch
                i += 1
                continue
            if ch == "`":
                state = "bt"
                kept[i] = ch
                i += 1
                continue
            code[i] = ch
            kept[i] = ch
            i += 1
            continue
        if state == "line":
            if ch == "\n":
                state = "code"
                code[i] = "\n"
                kept[i] = "\n"
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
                continue
            if ch == "\n":
                code[i] = "\n"
                kept[i] = "\n"
            i += 1
            continue
        quote = {"sq": "'", "dq": '"', "bt": "`"}[state]
        kept[i] = ch
        if ch == "\\" and i + 1 < n:
            kept[i + 1] = text[i + 1]
            if text[i + 1] == "\n":
                code[i + 1] = "\n"
            i += 2
            continue
        if ch == "\n":
            code[i] = "\n"
        if ch == quote:
            state = "code"
        i += 1
    return "".join(code), "".join(kept)


def is_xpath(selector):
    value = selector.strip()
    lowered = value.lower()
    if lowered.startswith("xpath=") or lowered.startswith("xpath ="):
        return True
    body = value[1:].lstrip() if value.startswith("(") else value
    if not body.startswith("//"):
        return False
    segment = re.split(r"[\[/@\s)\]]", body[2:], maxsplit=1)[0]
    if "." in segment and "[" not in value and "::" not in value:
        return False
    if segment in ("", "*"):
        return True
    return re.fullmatch(r"[A-Za-z_][\w.-]*", segment) is not None


def xpath_hits(text):
    _, kept = views(text)
    hits = len(DOLLAR_X.findall(views(text)[0]))
    hits += len(XPATH_TOKEN.findall(views(text)[0]))
    for match in LOCATOR_ARG.finditer(kept):
        if is_xpath(match.group(2)):
            hits += 1
    return hits


def _call_window(text, start):
    """Text of the chained call that ends at start, not the previous statement."""
    lines = text[:start].split("\n")
    chosen = [lines[-1]]
    index = len(lines) - 2
    while index >= 0 and len(chosen) < 8:
        previous = lines[index]
        current = chosen[-1]
        continued = previous.rstrip().endswith((".", "(", ",", "?", ":")) or current.lstrip().startswith(
            (".", ")", ",")
        )
        if not continued:
            break
        chosen.append(previous)
        index -= 1
    return "\n".join(reversed(chosen))


def credential_hits(text):
    code, kept = views(text)
    hits = 0
    for match in ASSIGN.finditer(kept):
        if code[match.start()] == " ":
            continue
        name = match.group(1)
        literal = match.group(3)
        if not SENSITIVE_NAME.search(name):
            continue
        if "${" in literal or not literal.strip():
            continue
        hits += 1
    for match in FILL.finditer(kept):
        if code[match.start()] == " ":
            continue
        literal = match.group(2)
        if "${" in literal or not literal.strip():
            continue
        if SENSITIVE_NAME.search(_call_window(kept, match.start())):
            hits += 1
    hits += len(BEARER.findall(kept))
    return hits


def describe_tag_hits(text):
    code, kept = views(text)
    hits = 0
    for match in DESCRIBE.finditer(kept):
        if code[match.start()] == " ":
            continue
        open_paren = match.end() - 1
        if open_paren < 0 or kept[open_paren] != "(":
            continue
        if _options_include_tag(kept, open_paren):
            hits += 1
    return hits


def _keyword_at(text, index, word):
    if not text.startswith(word, index):
        return False
    before = text[index - 1] if index else ""
    after_index = index + len(word)
    after = text[after_index] if after_index < len(text) else ""
    if before.isalnum() or before == "_":
        return False
    if after.isalnum() or after == "_":
        return False
    return True


def _options_include_tag(text, open_paren):
    """True when a test.describe options object has a tag key.

    Stops at the callback (`=>` or `function`) so a tag on a nested test()
    is not a tag on describe.
    """
    i = open_paren + 1
    n = len(text)
    depth = 1
    brace = 0
    state = "code"
    while i < n and depth > 0:
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
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch == "{":
                brace += 1
            elif ch == "}":
                brace = max(0, brace - 1)
            elif brace == 0 and text.startswith("=>", i):
                return False
            elif depth == 1 and brace == 0 and _keyword_at(text, i, "function"):
                return False
            elif brace >= 1 and _keyword_at(text, i, "tag"):
                j = i + 3
                while j < n and text[j] in " \t\r\n":
                    j += 1
                if j < n and text[j] == ":":
                    return True
            i += 1
            continue
        if state == "line":
            if ch == "\n":
                state = "code"
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
                continue
            i += 1
            continue
        if ch == "\\" and i + 1 < n:
            i += 2
            continue
        if ch == state:
            state = "code"
        i += 1
    return False


def matcher_count(text, name):
    code, _ = views(text)
    return len(re.findall(r"\." + name + r"\s*\(", code))


def _identifier_prefix(text, index):
    if index == 0:
        return False
    return text[index - 1].isalnum() or text[index - 1] == "_"


def scan_expects(text):
    """Return (total expect( tokens, live expect( tokens)."""
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
        if ch == "\\" and i + 1 < n:
            i += 2
            continue
        if ch == state:
            state = "code"
        i += 1
    return total, live


def expect_reasons(before, after):
    before_total, before_live = scan_expects(before)
    after_total, after_live = scan_expects(after)
    reasons = []
    code_before, _ = views(before)
    code_after, _ = views(after)
    soft_added = len(SOFT.findall(code_after)) - len(SOFT.findall(code_before))
    dropped = before_total - after_total
    if dropped > 0:
        softened = min(dropped, max(soft_added, 0))
        removed = dropped - softened
        if softened:
            reasons.append(
                "expect( softened to expect.soft( ({0} to {1})".format(
                    before_total, after_total
                )
            )
        if removed:
            reasons.append(
                "expect( removed ({0} to {1})".format(before_total, after_total)
            )
    commented = (before_live - after_live) - max(dropped, 0)
    if commented > 0:
        reasons.append(
            "expect( commented out ({0} live to {1})".format(before_live, after_live)
        )
    strong_dropped = False
    weak_raised = False
    for name in STRONG_MATCHERS:
        if matcher_count(before, name) > matcher_count(after, name):
            strong_dropped = True
            break
    for name in WEAK_MATCHERS:
        if matcher_count(after, name) > matcher_count(before, name):
            weak_raised = True
            break
    if strong_dropped and weak_raised:
        reasons.append("expect( matcher softened to a truthy or defined check")
    return reasons


def introduced(label, before, after, count):
    added = count(after) - count(before)
    if added > 0:
        return ["{0} introduced ({1})".format(label, added)]
    return []


def violation_reasons(before, after):
    reasons = []
    reasons.extend(introduced("waitForTimeout", before, after, lambda t: len(WAIT.findall(views(t)[0]))))
    reasons.extend(introduced("XPath locator", before, after, xpath_hits))
    reasons.extend(introduced("any type", before, after, lambda t: len(ANY_TYPE.findall(views(t)[0]))))
    reasons.extend(introduced("hardcoded credential", before, after, credential_hits))
    reasons.extend(introduced("tag on test.describe()", before, after, describe_tag_hits))
    reasons.extend(expect_reasons(before, after))
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


def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        deny("Constitution gate could not parse hook input.")

    if not isinstance(data, dict):
        deny("Constitution gate expected a JSON object on stdin.")

    file_path = data.get("file_path") or ""
    if not in_scope(file_path):
        allow()

    edits = data.get("edits")
    if not isinstance(edits, list):
        edits = []

    before, after = before_after(file_path, edits)
    reasons = violation_reasons(before, after)
    if reasons:
        deny(
            "Constitution gate blocked this edit to "
            + file_path
            + ": "
            + "; ".join(reasons)
            + ". Stop and raise the conflict."
        )

    allow()


if __name__ == "__main__":
    main()
