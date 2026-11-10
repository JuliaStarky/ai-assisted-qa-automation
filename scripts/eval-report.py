#!/usr/bin/env python3
"""Write eval-report.md from CI logs, PR history, and local session transcripts.

Cursor has no built-in telemetry for flake, heal, generation-gate, or
ask-vs-guess. This script is the measurement. On GitHub Actions the session
section is kept from the previous report, because the runner does not have
the IDE transcripts.
"""

from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
REPORT = ROOT / "eval-report.md"
N_RUNS = int(os.environ.get("EVAL_REPORT_N", "10"))
ASK_MARK_START = "<!-- ask-vs-guess:start -->"
ASK_MARK_END = "<!-- ask-vs-guess:end -->"

STAT_RE = re.compile(r"^(\d+)\s+(failed|flaky|passed|skipped)\b")
FLAKY_TEST_RE = re.compile(r"^\[chromium\]\s+›\s+(.+)$")
LOCATOR_RE = re.compile(r"""page\.locator\(\s*(['"`])(.*?)\1""", re.DOTALL)
TAG_RE = re.compile(
    r"tag:\s*['\"](@(?:smoke|sanity|regression|api|e2e|destructive))['\"]"
)
TEST_RE = re.compile(r"\btest\(\s*['\"](.+?)['\"]", re.DOTALL)
SCENARIO_RE = re.compile(r"^\s*Scenario(?: Outline)?:\s*(.+)$", re.MULTILINE)
ASSIGN_RE = re.compile(
    r"""(?ix)
    ["']?
    (ATLASSIAN_EMAIL|ATLASSIAN_SITE_URL|ATLASSIAN_BASE_URL
      |DIDAXIS_EMAIL|DIDAXIS_PASSWORD|DIDAXIS_API_TOKEN
      |DIDAXIS_ALT_EMAIL|DIDAXIS_ALT_PASSWORD|CURSOR_API_KEY)
    ["']?
    \s*[:=]\s*
    ["']?([^"'\\\s,}]+)
    """
)
ASK_TEXT_RE = re.compile(
    r"(?i)tell me which|which one to pin|won'?t invent|will not invent"
)
WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9]{3,}")
STOP = {
    "program", "programs", "name", "names", "create", "created", "delete",
    "click", "with", "from", "that", "this", "when", "then", "given", "and",
    "the", "for", "are", "was", "not", "into", "page", "list", "user",
    "admin", "button", "dialog", "request", "returns", "shows", "show",
    "valid", "invalid", "existing", "details", "academic",
}


def run(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=check,
    )


def gh_json(args: list[str]):
    completed = run(["gh", *args])
    return json.loads(completed.stdout)


def log_payload(line: str) -> str:
    if "Z " in line:
        line = line.split("Z ", 1)[1]
    if "\t" in line:
        line = line.split("\t")[-1]
    return re.sub(r"^##\[[^\]]+\]\s*", "", line.strip())


def allow_values() -> set[str]:
    allowed = set()
    example = ROOT / ".env.example"
    if example.is_file():
        for line in example.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line or line.startswith("#") or "=" not in line:
                continue
            allowed.add(line.split("=", 1)[1].strip())
    return allowed


def is_placeholder(value: str) -> bool:
    lowered = value.lower()
    return (
        lowered.startswith("replace-with")
        or "example.com" in lowered
        or "your-site" in lowered
        or lowered in {"changeme", "placeholder", "todo", "***"}
        or len(value) < 8
    )


def first_summary(lines: list[str]) -> tuple[dict[str, int], list[str]]:
    """First Playwright summary in a run log. The log repeats it after ##[notice]."""
    for index, text in enumerate(lines):
        if not STAT_RE.match(text):
            continue
        counts: dict[str, int] = {}
        names: list[str] = []
        collecting_flaky = False
        for follow in lines[index : index + 80]:
            match = STAT_RE.match(follow)
            if match:
                kind = match.group(2)
                if kind == "failed" and collecting_flaky:
                    break
                counts.setdefault(kind, int(match.group(1)))
                collecting_flaky = kind == "flaky"
                continue
            if follow.startswith("##["):
                break
            name_match = FLAKY_TEST_RE.match(follow)
            if name_match and collecting_flaky:
                names.append(name_match.group(1))
        if counts:
            return counts, list(dict.fromkeys(names))
    return {}, []


def flake_section() -> tuple[str, dict]:
    listed = gh_json(
        [
            "run",
            "list",
            "--workflow",
            "E2E Tests",
            "--limit",
            "40",
            "--json",
            "databaseId,conclusion,displayTitle,createdAt,url,event,headBranch",
        ]
    )
    runs = [row for row in listed if row.get("conclusion") not in {"cancelled", "skipped"}][:N_RUNS]
    measured = []
    flaky_total = passed_total = failed_total = 0
    for row in runs:
        log = run(["gh", "run", "view", str(row["databaseId"]), "--log"]).stdout
        lines = [log_payload(line) for line in log.splitlines()]
        counts, flaky_names = first_summary(lines)
        flaky = counts.get("flaky", 0)
        passed = counts.get("passed", 0)
        failed = counts.get("failed", 0)
        flaky_total += flaky
        passed_total += passed
        failed_total += failed
        measured.append(
            {
                "id": row["databaseId"],
                "url": row["url"],
                "when": row["createdAt"],
                "event": row["event"],
                "title": row["displayTitle"],
                "flaky": flaky,
                "passed": passed,
                "failed": failed,
                "names": list(dict.fromkeys(flaky_names)),
            }
        )
    finished = flaky_total + passed_total + failed_total
    rate = (flaky_total / finished) if finished else 0
    number = f"{flaky_total} / {finished} finished tests ({rate:.1%})"
    run_rows = "\n".join(
        f"| [{row['id']}]({row['url']}) | {row['event']} | {row['flaky']} | {row['passed']} | {row['failed']} |"
        for row in measured
    ) or "| — | — | — | — | — |"
    name_rows = []
    for row in measured:
        for name in row["names"]:
            name_rows.append(f"| [{row['id']}]({row['url']}) | {name} |")
    names = "\n".join(name_rows) or "| — | none |"
    body = f"""## Flake rate

| | |
| --- | --- |
| Number | {number} |
| How measured | Playwright's own summary in the last {len(measured)} completed E2E Tests runs on GitHub Actions (`gh run view --log`). A test is counted when the summary says `flaky`: it failed, then passed on a CI retry (`retries: 2`). Cancelled runs are left out. The log prints the summary twice; only the first copy is counted. Cursor has no flake telemetry. |
| What it tells us | {flaky_total} tests passed only because CI retried them. The red runs are mostly hard failures, and the retries that did pass cluster on the programs axe scan. |

| Run | Event | Flaky | Passed | Failed |
| --- | --- | ---: | ---: | ---: |
{run_rows}

| Run | Passed only on retry |
| --- | --- |
{names}
"""
    return body, {"flaky": flaky_total, "finished": finished, "rate": rate}


def commit_touches_expect(sha: str) -> bool:
    diff = run(["git", "show", "--unified=0", "--format=", sha, "--", "tests"]).stdout
    for line in diff.splitlines():
        if line.startswith(("+++", "---", "@@")):
            continue
        if line.startswith(("+", "-")) and "expect(" in line:
            return True
    return False


def heal_section() -> tuple[str, dict]:
    log = run(
        ["git", "log", "--all", "--regexp-ignore-case", "--grep=heal", "--pretty=format:%H%x09%s"],
        check=False,
    ).stdout
    attempts = []
    for line in log.splitlines():
        if "\t" not in line:
            continue
        sha, subject = line.split("\t", 1)
        names = run(["git", "show", "--format=", "--name-only", sha]).stdout.splitlines()
        if not any(path.startswith(("pages/", "tests/")) for path in names):
            continue
        masked = commit_touches_expect(sha)
        attempts.append(
            {
                "sha": sha[:7],
                "full": sha,
                "subject": subject,
                "files": ", ".join(path for path in names if path.startswith(("pages/", "tests/"))) or "—",
                "masked": masked,
                "clean": not masked,
            }
        )
    prs = gh_json(
        [
            "pr",
            "list",
            "--state",
            "all",
            "--limit",
            "50",
            "--search",
            "heal in:title",
            "--json",
            "number,title,url,state",
        ]
    )
    known = {row["subject"].lower() for row in attempts}
    extra = [pr for pr in prs if pr["title"].lower() not in known and "heal" in pr["title"].lower()]
    clean = sum(1 for row in attempts if row["clean"])
    total = len(attempts)
    masked = sum(1 for row in attempts if row["masked"])
    rate = f"{clean} / {total}"
    rows = "\n".join(
        f"| `{row['sha']}` | {row['subject']} | {row['files']} | {'yes' if row['clean'] else 'no'} | {'yes' if row['masked'] else 'no'} |"
        for row in attempts
    ) or "| — | none | — | — | — |"
    pr_note = (
        "No pull request title contains `heal`."
        if not prs
        else "Pull requests whose title contains heal: "
        + ", ".join(f"[#{pr['number']}]({pr['url']})" for pr in prs)
        + "."
    )
    if extra:
        pr_note += " Those PR titles are not already in the commit list above."
    body = f"""## Heal success rate

| | |
| --- | --- |
| Number | {rate} drift heals were locator-only |
| Masked regressions | {masked} (must be 0) |
| How measured | `git log --grep=heal` for commits that touch `pages/` or `tests/`, plus `gh pr list --search "heal in:title"`. A heal is clean when that diff does not add or remove an `expect(`. A masked regression is a heal diff that does. Commits that only edit the workflow or the rules are not drift heals. Cursor has no heal telemetry. |
| What it tells us | {clean} of {total} drift heals left the assertions alone. The masked-regression count is {masked}; the bar is 0. |

| Commit | Subject | Files | Clean | Masked regression |
| --- | --- | --- | --- | --- |
{rows}

{pr_note}
"""
    return body, {"clean": clean, "total": total, "masked": masked, "attempts": attempts}


def file_at(owner_repo: str, path: str, sha: str) -> str:
    encoded = path.replace(" ", "%20")
    payload = gh_json(["api", f"repos/{owner_repo}/contents/{encoded}?ref={sha}"])
    if payload.get("encoding") != "base64" or not payload.get("content"):
        return ""
    return base64.b64decode(payload["content"]).decode("utf-8", errors="replace")


def words(text: str) -> set[str]:
    found = set()
    for word in WORD_RE.findall(text):
        lowered = word.lower()
        if lowered not in STOP:
            found.add(lowered)
    return found


def conforms(spec: str) -> tuple[bool, str]:
    reasons = []
    if "expect(" not in spec:
        reasons.append("no expect(")
    if "waitForTimeout" in spec:
        reasons.append("waitForTimeout")
    if re.search(r"(?::\s*|\bas\s+)any\b", spec):
        reasons.append("any type")
    for match in LOCATOR_RE.finditer(spec):
        selector = match.group(2)
        if "." in selector or "#" in selector or "//" in selector:
            reasons.append("CSS or XPath locator")
            break
    tests = len(TEST_RE.findall(spec))
    tags = TAG_RE.findall(spec)
    if tests and len(tags) != tests:
        reasons.append(f"{len(tags)} tags for {tests} tests")
    return (not reasons, "; ".join(reasons) if reasons else "yes")


def scenario_map(feature: str, specs: list[str]) -> tuple[bool, str]:
    scenarios = [line.strip() for line in SCENARIO_RE.findall(feature)]
    if not scenarios:
        return False, "feature file has no Scenario"
    titles = []
    for spec in specs:
        titles.extend(TEST_RE.findall(spec))
    if not titles:
        return False, "spec has no test("
    missing = []
    title_words = [words(title) for title in titles]
    for scenario in scenarios:
        scenario_words = words(scenario)
        if not scenario_words:
            scenario_words = {word.lower() for word in WORD_RE.findall(scenario)}
        if not any(scenario_words & bag for bag in title_words):
            missing.append(scenario)
    if missing:
        return False, "no test title shares words with: " + "; ".join(missing[:3])
    return True, "yes"


def generation_section(owner_repo: str) -> tuple[str, dict]:
    prs = gh_json(
        [
            "pr",
            "list",
            "--state",
            "all",
            "--limit",
            "30",
            "--json",
            "number,title,url,headRefName",
        ]
    )
    rows = []
    passed = 0
    considered = 0
    for pr in prs:
        detail = gh_json(
            [
                "api",
                f"repos/{owner_repo}/pulls/{pr['number']}/commits",
                "--jq",
                "[.[] | {sha: .sha, login: .author.login, email: .commit.author.email, message: .commit.message}]",
            ]
        )
        agent = any(
            item.get("login") == "cursoragent"
            or item.get("email") == "cursoragent@cursor.com"
            or "cursoragent@cursor.com" in (item.get("message") or "")
            for item in detail
        )
        if not agent:
            continue
        sha = detail[0]["sha"] if detail else ""
        file_list = run(
            [
                "gh",
                "api",
                "--paginate",
                f"repos/{owner_repo}/pulls/{pr['number']}/files",
                "--jq",
                ".[].filename",
            ]
        ).stdout.splitlines()
        specs = [name for name in file_list if name.startswith("tests/") and name.endswith(".spec.ts")]
        features = [name for name in file_list if name.startswith("features/") and name.endswith(".feature")]
        if not specs:
            continue
        considered += 1
        checks = gh_json(
            [
                "api",
                f"repos/{owner_repo}/commits/{sha}/check-runs",
                "--jq",
                "[.check_runs[] | {name: .name, conclusion: .conclusion, started_at: .started_at}]",
            ]
        ) if sha else []
        preferred = [check for check in checks if check.get("name") in {"test", "Smoke", "Sanity", "Regression"}]
        checks = preferred or checks
        checks.sort(key=lambda check: check.get("started_at") or "")
        first = checks[0] if checks else None
        green = bool(first and first.get("conclusion") == "SUCCESS")
        green_text = first.get("conclusion", "none") if first else "no check"
        spec_texts = []
        conform_bits = []
        for path in specs:
            text = file_at(owner_repo, path, sha) if sha else ""
            spec_texts.append(text)
            ok, why = conforms(text)
            conform_bits.append(why if ok else f"{path}: {why}")
        conforming = all(bit == "yes" for bit in conform_bits)
        conform_text = "yes" if conforming else "; ".join(bit for bit in conform_bits if bit != "yes")
        if features and sha:
            feature_text = "\n".join(file_at(owner_repo, path, sha) for path in features)
            mapped, map_text = scenario_map(feature_text, spec_texts)
        else:
            mapped, map_text = False, "no feature file on the first commit"
        ok = green and conforming and mapped
        passed += int(ok)
        rows.append(
            f"| [#{pr['number']}]({pr['url']}) | {green_text} | {conform_text} | {map_text} | {'pass' if ok else 'fail'} |"
        )
    rate = f"{passed} / {considered}"
    table = "\n".join(rows) or "| — | — | — | — | — |"
    body = f"""## Generation-gate pass rate

| | |
| --- | --- |
| Number | {rate} first pull requests |
| How measured | Every merged or open pull request whose commits are authored or co-authored by `cursoragent` and that adds a `tests/*.spec.ts`. Pass means all three, on the first commit: the earliest E2E check (`test`, `Smoke`, `Sanity`, or `Regression`) is `SUCCESS`; the spec has an `expect(`, one allowed tag per `test()`, and no `waitForTimeout`, `any`, or CSS/XPath `page.locator`; every Gherkin `Scenario` shares a content word with a test title. Cursor has no generation telemetry. |
| What it tells us | {passed} of {considered} generated specs were green, conforming, and mapped to acceptance criteria on the first pull request. |

| PR | First E2E check | Conforming | Maps to AC | Gate |
| --- | --- | --- | --- | --- |
{table}
"""
    return body, {"passed": passed, "total": considered}


def transcript_dir() -> Path | None:
    projects = Path.home() / ".cursor" / "projects"
    slug = ROOT.resolve().as_posix().lstrip("/").replace("/", "-")
    candidates = [projects / slug / "agent-transcripts"]
    if projects.is_dir():
        candidates.extend(projects.glob(f"*{ROOT.name}/agent-transcripts"))
    for path in candidates:
        if path.is_dir() and any(path.glob("*/*.jsonl")):
            return path
    return None


def message_parts(obj: dict) -> list[dict]:
    content = (obj.get("message") or {}).get("content")
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    if isinstance(content, list):
        return [part for part in content if isinstance(part, dict)]
    return []


def ask_vs_guess() -> tuple[str, dict]:
    if os.environ.get("GITHUB_ACTIONS") == "true":
        return preserved_ask(), {"asks": None, "guesses": None, "preserved": True}
    folder = transcript_dir()
    if folder is None:
        text = (
            f"{ASK_MARK_START}\n"
            "No local agent transcripts were found for this repo. "
            "Cursor has no telemetry for ask-vs-guess, so this run does not invent a count.\n"
            f"{ASK_MARK_END}"
        )
        return text, {"asks": None, "guesses": None, "preserved": False}
    allowed = allow_values()
    asks = []
    guesses = []
    for path in sorted(folder.rglob("*.jsonl")):
        prior = ""
        session = path.parent.name[:8]
        for line_no, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            parts = message_parts(obj)
            texts = []
            tool_names = []
            tool_blobs = []
            for part in parts:
                if part.get("type") == "text":
                    texts.append(part.get("text") or "")
                elif part.get("type") == "tool_use":
                    name = part.get("name") or ""
                    tool_names.append(name)
                    raw = part.get("input")
                    tool_blobs.append(raw if isinstance(raw, str) else json.dumps(raw))
            blob = "\n".join(texts + tool_blobs)
            role = obj.get("role")
            if role != "assistant":
                prior += "\n" + blob
                continue
            if "AskQuestion" in tool_names:
                asks.append(f"{session} line {line_no}: AskQuestion")
            elif not tool_names and ASK_TEXT_RE.search("\n".join(texts)):
                text = " ".join(texts).replace("\n", " ")
                match = ASK_TEXT_RE.search(text)
                start = max(0, match.start() - 40) if match else 0
                snippet = text[start : start + 160].strip()
                asks.append(f"{session} line {line_no}: {snippet}")
            if tool_names:
                found: dict[str, list[str]] = {}
                for key, value in ASSIGN_RE.findall(blob):
                    found.setdefault(key, []).append(value.strip().strip("`"))
                for key, values in found.items():
                    known = [
                        value
                        for value in values
                        if value in prior or value in allowed or is_placeholder(value)
                    ]
                    invented = []
                    for value in values:
                        if value in prior or value in allowed or is_placeholder(value):
                            continue
                        if any(value in known_value or known_value in value for known_value in known):
                            continue
                        if any(len(token) >= 8 and token in value for token in re.findall(r"\S{8,}", prior)):
                            continue
                        invented.append(value)
                    if invented:
                        guesses.append(f"{session} line {line_no}: invented `{key}` (value omitted)")
            prior += "\n" + blob
    ask_list = "\n".join(f"- {item}" for item in asks) or "- none"
    guess_list = "\n".join(f"- {item}" for item in guesses) or "- none"
    text = f"""{ASK_MARK_START}
| | |
| --- | --- |
| Asked | {len(asks)} |
| Invented a value | {len(guesses)} |
| How measured | Session review of `{folder}` ({len(list(folder.rglob('*.jsonl')))} transcript files). An ask is an `AskQuestion` call, or an assistant turn with no tool call that says it will not invent a value and tells the user to choose. A guess is a credential, email, or site assignment in a tool call whose value is not in the earlier transcript and not in `.env.example`. Values are not copied into this report. Cursor has no telemetry for this. |
| What it tells us | The agent stopped to ask {len(asks)} times and introduced {len(guesses)} values that were not already in the prompt or `.env.example`. |

Asked:

{ask_list}

Invented:

{guess_list}
{ASK_MARK_END}"""
    return text, {"asks": len(asks), "guesses": len(guesses), "preserved": False}


def preserved_ask() -> str:
    if REPORT.is_file():
        text = REPORT.read_text(encoding="utf-8")
        if ASK_MARK_START in text and ASK_MARK_END in text:
            inner = text.split(ASK_MARK_START, 1)[1].split(ASK_MARK_END, 1)[0]
            return (
                f"{ASK_MARK_START}\n"
                "Kept from the last machine that had IDE transcripts. "
                "This run is GitHub Actions, which has no Cursor session store.\n\n"
                + inner.strip()
                + f"\n{ASK_MARK_END}"
            )
    return (
        f"{ASK_MARK_START}\n"
        "Not measured on this machine. GitHub Actions has no IDE transcripts, and no earlier session review is in the report yet.\n"
        f"{ASK_MARK_END}"
    )


def risk(flake: dict, heal: dict, gate: dict, ask: dict) -> str:
    if heal["masked"]:
        sha = ", ".join(row["sha"] for row in heal["attempts"] if row["masked"])
        return f"""## Top reliability risk

The masked-regression count is {heal["masked"]}. It must be 0. Commit {sha} is labeled as a heal and changes an `expect(` in `tests/`.

## Next action

A human reviews that assertion diff before any heal is treated as clean. If the new expectation is the acceptance criterion, record it as a test correction outside self-heal. If the old expectation was the one that should fail the product, revert the assertion. Do not open another heal that touches `expect(`.
"""
    if gate["total"] and gate["passed"] != gate["total"]:
        return f"""## Top reliability risk

The generation gate passed {gate["passed"]} of {gate["total"]} first pull requests. A generated spec is landing before it is green, conforming, and mapped to the acceptance criteria.

## Next action

Hold the next generated spec until its first E2E check is green and the scenario table in this report is all pass.
"""
    if flake["flaky"]:
        return f"""## Top reliability risk

{flake["flaky"]} tests passed only on a CI retry in the last {N_RUNS} completed E2E runs.

## Next action

Open the axe-scan trace from the newest flaky run and fix the wait. Do not raise retries above 2.
"""
    return """## Top reliability risk

The four measurements are inside the bars this report tracks.

## Next action

Re-run this script after the next test-generation workflow. No reliability change is waiting on a person.
"""


def main() -> int:
    os.chdir(ROOT)
    owner_repo = gh_json(["repo", "view", "--json", "nameWithOwner"])["nameWithOwner"]
    flake_body, flake = flake_section()
    heal_body, heal = heal_section()
    gate_body, gate = generation_section(owner_repo)
    ask_body, ask = ask_vs_guess()
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    where = "GitHub Actions" if os.environ.get("GITHUB_ACTIONS") == "true" else "local"
    report = f"""# Suite reliability report

Generated {generated} ({where}) by `scripts/eval-report.py`. This file is rewritten after `.github/workflows/test-generation.yml` finishes and after a local agent or orchestrator stops. Cursor has no built-in telemetry for these four numbers.

{flake_body}
{heal_body}
{gate_body}
## Ask vs guess

{ask_body}

{risk(flake, heal, gate, ask)}"""
    REPORT.write_text(report, encoding="utf-8")
    print(f"Wrote {REPORT}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as error:
        sys.stderr.write(error.stderr or str(error) + "\n")
        sys.exit(error.returncode or 1)
