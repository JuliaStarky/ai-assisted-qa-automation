#!/bin/bash
# Rewrite eval-report.md after an agent or the orchestrator stops.
# Fail open: a measurement failure must not block the agent.

cat >/dev/null
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
cd "$(dirname "$0")/../.." || exit 0
python3 scripts/eval-report.py >/dev/null 2>&1 || true
printf '%s\n' '{}'
exit 0
