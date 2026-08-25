# Security Policy

## Supported versions

| Version | Supported                            |
| ------- | ------------------------------------ |
| 0.x     | ✅ (pre-release, active development) |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.
Email the maintainers or use GitHub's **Security → Report a vulnerability** flow.
We aim to acknowledge within 72 hours.

## Security practices in this project

- The Hugging Face API token is server-side only and never shipped to the browser bundle.
- `.env` is git-ignored; `WebApplication/.env.example` contains placeholders only.
- Uploads are constrained by size (`MAX_UPLOAD_SIZE_MB`), MIME allow-list and magic-byte sniffing.
- Temporary files are written with random names and deleted after inference.
- `helmet` hardens HTTP headers; CORS uses an explicit origin allow-list.
- `express-rate-limit` protects the inference endpoint from abuse.
- Error responses hide stack traces and internal details in production.

## If a token leaks

1. Revoke it immediately at <https://huggingface.co/settings/tokens>.
2. Generate a new token and update `.env` / GitHub Actions secrets.
3. Purge it from git history (`git rm --cached`, or `git filter-repo` for old commits).
