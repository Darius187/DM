# LESSONS_LEARNED.md

Sammelort für Sackgassen, Entscheidungs-Begründungen, offene Unsicherheiten.

> **Zweck:** Wenn das Projekt nach 3 Monaten Pause wieder aufgenommen wird, soll jeder hier nachlesen können _warum_ Dinge so sind wie sie sind.
>
> **Format-Regel:** Datum-Header + Kontext + Entscheidung + Begründung.

---

## 2026-05-20 — Doku-Stack statt Code-First-Bootstrap

**Kontext:** Erste Session, noch kein PC eingerichtet, kein Proxmox installiert.

**Entscheidung:** Phase 0 beginnt mit Doku-Setup (`CLAUDE.md`, `STATUS.md`, `TODO.md`, `LESSONS_LEARNED.md`) statt direkt Python-Code zu schreiben. Code-Skelett kommt in Phase 1.

**Begründung:**
- KI-Assistenten brauchen die Doku als Kontext-Anker (PROJECT_CONTEXT.md + Guidelines).
- Ohne `TODO.md`/`STATUS.md` ist die Aufgaben-Reihenfolge bei Wiederaufnahme unklar.
- Code ohne Infrastruktur (Mosquitto, pgvector) lässt sich nicht testen — also erst Doku, dann Code, dann Darius richtet Infrastruktur ein, dann Integration.

---

## Offene Unsicherheiten (zu klären bevor implementiert wird)

### U-001 — Simulationsumgebung

**Frage:** PyBullet, MuJoCo, Unreal Engine 5 oder Isaac Sim für Phase 1?

**Stand:** PROJECT_CONTEXT empfiehlt PyBullet für schnellen Start, Unreal/Isaac als zweite Iteration.

**Risiko bei zu früher Entscheidung:** UE5 hat steile Lernkurve aber bessere Visualisierung; PyBullet ist Python-nativ aber visuell minimalistisch.

**Vorgehen:** Phase 1 mit PyBullet starten. Wenn nach Phase 1 die Visualisierung nicht reicht, in Phase 2 evaluieren.

### U-002 — LLM-Backend-Routing

**Frage:** Wann lokales LLM (Ollama), wann Claude API?

**Stand:** Hybrid geplant, aber konkrete Routing-Regeln offen.

**Vorgehen:** In Phase 4 (LLM-Tool-Orchestrator) entscheiden, anhand realer Latenz-/Qualitäts-Messungen.

### U-003 — Faster-Whisper Modellgröße auf Esprimo

**Frage:** Welche Whisper-Modellgröße passt auf den i5-9500T ohne GPU?

**Stand:** Whisper läuft auf dem Hauptrechner (RTX 4070 Ti), nicht auf dem Esprimo. Trotzdem klären falls Fallback-Szenario.

**Vorgehen:** In Phase 2 benchmarken (`scripts/benchmark_whisper.py`).

### U-004 — FACS-AU-Berechnung

**Frage:** Wie genau leiten wir FACS Action Units aus MediaPipe Face Mesh ab?

**Stand:** PROJECT_CONTEXT §5 weist explizit darauf hin, dass das eine substanzielle Eigenimplementierung ist. OpenFace 2.0 als Referenz.

**Risiko:** Falsches Mapping → falsche PAD-Werte → falsche Behavior-Entscheidungen.

**Vorgehen:** In Phase 2 mit Tian et al. 2001 + OpenFace-Quellcode als Referenz arbeiten. Snapshot-Tests gegen bekannte Test-Bilder.

### U-005 — pyannote.audio Lizenz / HuggingFace-Token

**Frage:** Braucht pyannote ein HuggingFace-Token mit Lizenz-Akzeptanz für Speaker-Embedding?

**Stand:** Ja (mindestens für `pyannote/speaker-diarization-3.x`). Token in `.env`, nicht ins Repo.

**Vorgehen:** In Phase 2 dokumentieren.

---

## Anti-Patterns die wir schon vermieden haben

> Wird in Phase 1+ gefüllt. Beispiele aus Guidelines §14 als Referenz: f-string in Log-Calls, Mutable Default Args, naive datetime, synchrone Calls in async-Funktionen, dict-Mutation während Iteration, GPU-Tensoren auf Device-Memory belassen, pgvector-Index für falsche Distanz-Operator, MediaPipe BGR/RGB-Verwechslung, Whisper-Audio-Format-Fehler, Pydantic v1/v2-Mix.

---

## Wenn du als KI-Assistent hier landest

1. Lies die offenen Unsicherheiten (`U-XXX`) bevor du Code schreibst, der eine davon berührt.
2. Wenn du eine Entscheidung triffst, die hier nicht steht: trag sie ein.
3. Wenn du in eine Sackgasse läufst: trag sie ein, beschreibe was du probiert hast, was nicht ging, warum.
4. Format: Datum-Header → Kontext → Entscheidung/Beobachtung → Begründung.
