# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working in this repository.

---

## Repository Status

This repository is currently in its **initial state** — no source files or commits exist yet.
Update this document as the project evolves.

---

## Project Overview

> **TODO**: Add a short description of what this project does, its purpose, and its primary users.

---

## Repository Structure

> **TODO**: Document the directory layout once source files are added. Example template:

```
/
├── src/           # Application source code
├── tests/         # Test suites
├── docs/          # Documentation
└── CLAUDE.md      # This file
```

---

## Development Environment

### Prerequisites

> **TODO**: List required tools, runtimes, and versions (e.g., Node.js 20+, Python 3.11+, Docker).

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd DM

# TODO: Add install / bootstrap steps
```

---

## Git Workflow

### Branch Naming

| Purpose | Pattern | Example |
|---|---|---|
| Features | `feature/<short-description>` | `feature/user-auth` |
| Bug fixes | `fix/<short-description>` | `fix/login-crash` |
| AI/automated work | `claude/<task-id>` | `claude/claude-md-mmcmhxg8rrjfqvg8-cUuiT` |
| Releases | `release/<version>` | `release/1.2.0` |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

Examples:
- `feat(auth): add JWT refresh token support`
- `fix(api): handle null user response gracefully`
- `docs: update setup instructions in CLAUDE.md`

### Pull Requests

- Keep PRs focused on a single concern.
- Include a clear description of *what* changed and *why*.
- Reference related issues: `Closes #42`.
- Ensure CI passes before requesting review.

---

## Coding Conventions

> **TODO**: Fill in language/framework-specific conventions once the tech stack is decided.

### General Principles

- **Clarity over cleverness**: Write code that is easy to read and understand.
- **Minimal surface area**: Only add what is necessary for the current task.
- **No premature abstraction**: Duplicate code twice before extracting a helper.
- **Fail loudly**: Prefer explicit errors over silent fallbacks.

### Security

- Never commit secrets, credentials, or API keys. Use environment variables.
- Validate all external input at system boundaries (user input, API responses).
- Follow OWASP Top 10 guidelines when building web-facing code.

---

## Testing

> **TODO**: Document testing framework and conventions once chosen.

### Guidelines

- Write tests for new behaviour before (or alongside) implementing it.
- Tests should be deterministic — no random sleeps, no external network calls.
- Name tests to describe observable behaviour: `should return 404 when user not found`.

---

## CI / CD

> **TODO**: Document the CI pipeline once configured (GitHub Actions, etc.).

---

## AI Assistant Instructions

When working in this repository, AI assistants should:

1. **Read before editing** — always read a file before modifying it.
2. **Stay minimal** — only change what the task requires; avoid unsolicited refactors.
3. **Update this file** — keep CLAUDE.md current whenever project structure or conventions change.
4. **Branch discipline** — develop on the designated feature branch; never push to `main`/`master` without explicit permission.
5. **Verify before destructive actions** — confirm with the user before deleting files, force-pushing, or modifying CI pipelines.
6. **No invented URLs** — do not fabricate links; only use URLs found in the codebase or provided by the user.
7. **Commit incrementally** — make small, focused commits with descriptive messages rather than one large dump.
8. **Do not add unnecessary comments** — only comment where logic is non-obvious.
