# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working in this repository.

---

## Repository Status

This repository contains **RAVENSMOOR - STIMMUNGSTEST**, a deliberately tiny
throwaway project (Phaser 3 + TypeScript + Vite). It is NOT a game: its only
purpose is to validate a dark tint/light mood layer over the real pixel-art
assets before the actual RPG is built. Do not extend it beyond that scope.

---

## Project Overview

Three tiny connected areas (Wald, Haus, Gruft) walkable with WASD, joined by
E-doors. The deliverable is `src/mood.ts`: all tuning values of the mood layer
(per-area tint, darkness layer with soft light holes, flicker, desaturation/
contrast, particles) live at the top of that file and will later be carried
over into the real game. Before/after screenshots live in `BILDER/`.

---

## Repository Structure

```
/
├── assets/        # CC0/itch-licensed art, sounds (see assets/ASSETS-LIESMICH.txt)
├── src/
│   ├── main.ts    # Phaser game config (640x360, pixelArt, FIT scaling)
│   ├── boot.ts    # Asset loading, tileset frame cutting, animations
│   ├── mood.ts    # THE RESULT: all mood-layer values + Stimmung class
│   ├── spieler.ts # WASD player with directional anims + footstep sounds
│   └── gebiete.ts # Base area scene + Wald/Haus/Gruft scenes
├── tools/         # Dev helpers: crop/blob asset inspection, screenshot runner
├── BILDER/        # Acceptance screenshots (vorher/nachher per area)
└── CLAUDE.md      # This file
```

---

## Development Environment

### Prerequisites

- Node.js 20+

### Setup

```bash
npm install
npm run dev          # Vite dev server on http://localhost:5190
```

Useful URL parameters (combinable, shown in the UI when active):

| Parameter | Effect |
|---|---|
| `szene=wald\|haus\|gruft` | start area |
| `mood=0` | disable the whole mood layer ("vorher" screenshots) |
| `glatt=1` | bilinear filtering instead of hard pixels (Voodoo-style softness) |
| `fog=0` | disable fog of war (skeletons always visible) |
| `dunkel=0..1` | override darkness-layer alpha of the area |
| `toenung=0..1` | override tint alpha |
| `farbe=0e3a32` | override tint color (hex) |
| `sat=-1..0` / `kontrast=0..1` | override saturation / contrast |
| `sicht=px` | player light radius (also scales fog-of-war sight range) |
| `licht=1.5` | multiply all light-source radii |

Screenshots (needs a Chrome/Chromium binary, dev server running):

```bash
node tools/screenshots.cjs [chrome-pfad]   # writes BILDER/*.png
node tools/durchlauf.cjs [chrome-pfad]     # functional door/walk check
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
