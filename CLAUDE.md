# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working in this repository.

---

## Pending Changes (Backlog — NICHT ohne Freigabe umsetzen)

Sammelstelle für Änderungswünsche, die in einer späteren Session in einem Rutsch umgesetzt werden:

- [ ] **"Made in Villingen-Schwenningen" entfernen.** Produkte werden in China gefertigt, nicht in DE. Aktuelle Vorkommen:
  - `app/views/components/footer.php` — Footer-Untertext: `<p>Made in Villingen-Schwenningen · Deutschland</p>`
  - Eventuell weitere Stellen prüfen (Hero, Marketing-Texte) bevor entfernt wird.
- [ ] Weitere Änderungen folgen — vor Umsetzung **alle gesammelten Punkte zusammen** mit dem User durchgehen.

### Auftrag-Pakete vom User (Mai 2026)
User hat 5 detaillierte MD-Dateien geliefert mit Aufträgen:
- `01-rechtstexte-final.md` — komplette finale Rechtstexte (6 Seiten: Impressum, Datenschutz, AGB, Widerruf, Produktsicherheit, Barrierefreiheit). USt-IdNr. DE 297660440 ist drin. 1:1 übernehmen.
- `02-produkte-gpsr-bestand.md` — GPSR-Box + Mindestabnahme-Hinweis auf jeder Produktseite. ⚠️ **Zwei offene Fragen**: PLA300-T2 (2+1 doppelt erfasst?) und TB300P-DX (aufnehmen?).
- `03-design-und-content.md` — Reihenfolge: (1) Made-in-VS überall raus, (2) Cookie-Banner "Statistik"-Option ausblenden, (3) Farbschema (Orange weg → Stahlgrau #64748b), (4) Blau/Weiß-Konflikt bei Produktfotos lösen, (5) Datenschutz-Pflicht-Checkbox im Anfrage-Formular, (6) Footer-Links: Produktsicherheit + Widerruf ergänzen, (7) Markenbezeichnung vereinheitlichen.
- `04-bedienungsanleitung.md` — PDF unter `public/downloads/unisilent-bedienungsanleitung.pdf` ✅ **bereits abgelegt** (Rev. 03/2026-05-17, 7 S., 552 KB).
- `00-uebersicht.md` — Reihenfolge: 03 → 01 → 02 → 04.

### Brand-Stripes vom User (Mai 2026)
Zusätzlicher Wunsch: Zwei dünne Streifen direkt unter dem Header — **gelb `#f6e303` über rot `#a70000`** (je 3 px). Sehr dezent als Markenakzent. Funktionsakzent bleibt Stahlgrau (siehe 03-MD). User noch unsicher → vor Umsetzung bestätigen lassen.

### Offene Klärungen vor Umsetzung
1. PLA300-T2: doppelt erfasst oder zwei Varianten?
2. TB300P-DX: aufnehmen, weglassen, oder als „auf Anfrage" verlinken?
3. „Mindestabnahme 50 Stück" hart oder weicher („üblich ab 50 Stk., kleinere Mengen aus Lager auf Anfrage")?
4. AGB-Geltungsbereich: nur B2B oder auch B2C (Widerrufsrecht etc.)?
5. Brand-Stripes gelb/rot — wirklich, oder doch weglassen?
6. eBay-Bilder für PLA300-DX-SF / ST300-DX / PLA300-DX → User soll lokale Kopien hochladen (Hotlinken nicht OK).
7. Admin-User auf Server — wie anlegen? (SSH/phpMyAdmin/Browser-Skript)

---

## Repository Status

**Session 1 abgeschlossen** — siehe `README.md` für Detail-Status. Session 2 (Admin-Panel + Formular-Versand) steht aus.

---

## Project Overview

B2B-Webseite für **uni-silent / db-bas** (Inhaber: Darius Matuszak, Villingen-Schwenningen).
Produkte: Industrie-Plattformwagen (geräuscharm, 150–300 kg Tragkraft).
Zielgruppe: Logistik, Krankenhäuser, Lebensmittel, Pharma, Produktion.

**Hosting**: Alfahosting Shared Hosting, PHP 8, MySQL, SFTP-Deployment.
**Domain**: unisilent.de (uni-silent.de → 301-Redirect).

**Stack**:
- PHP 8.0+ (OOP, PDO Prepared Statements only)
- MySQL / utf8mb4
- Tailwind CSS 3 (lokal gebaut, kein CDN)
- Vanilla JS (kein Framework)
- Inter-Font (lokal gehostet, DSGVO)

**KEIN Node.js auf Server** — Tailwind wird lokal in `build/` gebaut und das fertige CSS (`public/assets/css/tailwind.min.css`) committed.

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
