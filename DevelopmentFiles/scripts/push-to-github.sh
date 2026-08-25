#!/usr/bin/env bash
#
# Push iNWebTools to GitHub without ever writing the token to disk or history.
#
# The token is read from the GITHUB_TOKEN environment variable and injected into
# the remote URL only for the lifetime of this process. It is never stored in
# .git/config, never committed, and never echoed.
#
# Usage:
#   GITHUB_TOKEN=<your_pat> bash DevelopmentFiles/scripts/push-to-github.sh
#
# Required PAT scope: "repo" (classic) or Contents: Read and write (fine-grained).

set -euo pipefail

OWNER="iNAYATechLab"
REPO="iNWebTools"
BRANCH="${BRANCH:-main}"

# Candidate drop-points, in priority order. Plain (non-dot) names are included
# because file-upload dialogs commonly hide or reject dot-prefixed files.
TOKEN_CANDIDATES=(
  "${TOKEN_FILE:-}"
  /home/user/.gh_token
  /home/user/gh_token
  /home/user/gh_token.txt
  /home/user/token.txt
  /home/user/github_token.txt
  /home/user/github-token.txt
  /home/user/PUT_TOKEN_HERE.txt
)

# Pull the first line that actually looks like a GitHub PAT. Scanning per-line
# means an instruction-style template file works untouched: surrounding prose is
# ignored rather than concatenated into the secret.
extract_token() {
  grep -oE '(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|gho_[A-Za-z0-9]{30,})' "$1" \
    | head -1
}

FOUND_TOKEN_FILE=""
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  for candidate in "${TOKEN_CANDIDATES[@]}"; do
    [[ -n "${candidate}" && -f "${candidate}" ]] || continue

    value="$(extract_token "${candidate}" || true)"

    # Fall back to the whole file for a bare token with no recognised prefix
    # (e.g. an enterprise or legacy 40-char hex token).
    if [[ -z "${value}" ]]; then
      stripped="$(tr -d '[:space:]' < "${candidate}")"
      [[ "${stripped}" =~ ^[A-Za-z0-9_]{40,}$ ]] && value="${stripped}"
    fi

    [[ -n "${value}" ]] || continue
    GITHUB_TOKEN="${value}"
    FOUND_TOKEN_FILE="${candidate}"
    echo "==> Token read from ${candidate}"
    break
  done
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: no token found." >&2
  echo "Write the PAT into any one of these (all are gitignored):" >&2
  printf '  %s\n' /home/user/gh_token.txt /home/user/token.txt /home/user/.gh_token >&2
  echo "or run: GITHUB_TOKEN=<pat> bash $0" >&2
  exit 1
fi

# Catch a pasted placeholder before it produces a confusing auth error.
if [[ "${GITHUB_TOKEN}" == *"আপনার"* || "${GITHUB_TOKEN}" == *"your_"* ]]; then
  echo "ERROR: the token file still contains placeholder text." >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

# Guard: never push a working tree containing an uncommitted .env.
if git status --porcelain | grep -qE '^\?\? .*\.env$'; then
  echo "ERROR: an untracked .env is present. Refusing to push." >&2
  exit 1
fi

# Guard: confirm no .env is tracked in the index.
if git ls-files | grep -qE '(^|/)\.env$'; then
  echo "ERROR: a .env file is tracked by git. Remove it before pushing." >&2
  exit 1
fi

echo "==> Repository: ${OWNER}/${REPO}"
echo "==> Branch:     ${BRANCH}"
echo "==> Commits to push:"
git log --oneline -10 | sed 's/^/    /'

# Build the authenticated URL in a variable only — never `git remote set-url`,
# which would persist the secret into .git/config.
AUTH_URL="https://${OWNER}:${GITHUB_TOKEN}@github.com/${OWNER}/${REPO}.git"

echo "==> Pushing ${BRANCH}..."
# 2>&1 is filtered so a failure message can never echo the token back.
if git push "${AUTH_URL}" "${BRANCH}:${BRANCH}" 2>&1 | sed "s|${GITHUB_TOKEN}|<redacted>|g"; then
  echo "==> Push complete."
else
  echo "==> Push FAILED (see message above)." >&2
  exit 1
fi

# Keep the stored remote token-free.
git remote set-url origin "https://github.com/${OWNER}/${REPO}.git" 2>/dev/null || \
  git remote add origin "https://github.com/${OWNER}/${REPO}.git"

echo "==> Remote left token-free:"
git remote -v | sed 's/^/    /'
