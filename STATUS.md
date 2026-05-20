# STATUS.md

Aktueller Stand des Johnny-5-Companion-Projekts. Wird bei jedem signifikanten Fortschritt aktualisiert.

> **Format-Regel:** Eine Sektion pro Phase. Erledigtes mit `[x]`, in Arbeit mit `[~]`, offen mit `[ ]`.

---

## Aktuelle Phase: **Phase 0 — Konzept & Setup**

**Start:** Mai 2026
**Geplante Dauer:** 1–2 Wochen
**Beschäftigung:** 5–10 h/Woche (Hobby)

### Letztes Update

2026-05-20 — Initial-Setup des Repos durch Claude Code:
Doku-Fundament gelegt (CLAUDE.md, PROJECT_CONTEXT v4, CLAUDE_CODE_GUIDELINES, STATUS, TODO, LESSONS_LEARNED).
Noch kein Code, noch keine eingerichtete Infrastruktur.

---

## Phasen-Übersicht

### Phase 0 — Konzept & Setup `[~]` IN ARBEIT

- [x] `PROJECT_CONTEXT.md` v4 finalisiert (vorab durch Darius erstellt)
- [x] `CLAUDE_CODE_GUIDELINES.md` v1.0 erstellt
- [x] Git-Repo aufgesetzt
- [x] `CLAUDE.md` mit Projekt-Spezifika ausgefüllt
- [x] `STATUS.md`, `TODO.md`, `LESSONS_LEARNED.md` angelegt
- [x] `.gitignore` für Python-Stack
- [ ] Proxmox auf Esprimo Q958 installieren *(durch Darius, manuell)*
- [ ] PostgreSQL + pgvector im LXC einrichten *(durch Darius, manuell)*
- [ ] Mosquitto-LXC einrichten *(durch Darius, manuell)*
- [ ] Claude Code lokal auf Hauptrechner einrichten *(durch Darius, manuell)*
- [x] Architektur-Diagramm als Mermaid in `docs/architecture.mmd`

### Phase 1 — Skelett, Safety, Simulation `[ ]` GEPLANT

3–4 Wochen. Erste Aufgaben in `TODO.md`. Wichtig: **Safety-Layer-Stub als allererstes**, bevor irgendein Aktor-Code entsteht.

### Phase 2 — Reale Wahrnehmung `[ ]`

4–6 Wochen. MediaPipe, Audio-Stack, Late-Fusion.

### Phase 3 — Interpretation & Memory `[ ]`

4–5 Wochen. pgvector-Schema, Importance-Scoring, Reflection-Loop, Retrieval-Score.

### Phase 4 — Verhalten, Sprache & Latenz `[ ]`

5–7 Wochen. Behavior-Tree (py_trees), Turn-Taking, Interrupt-Coordinator, LLM-Tool-Use, TTS.

### Phase 5 — Bewegungs-Choreografie `[ ]`

3–4 Wochen. Easing, Jerk-Limiting, LMA-Mapping empirisch kalibrieren.

### Phase 6 — Dashboard & Polish `[ ]`

2–3 Wochen. Web-Dashboard, PAD-Live-Viz, Eval-Suite.

### Phase 7 — Hardware-Migration `[ ]`

Mehrere Monate, offen. Mechanik, Servos (Dynamixel bevorzugt), Mikrocontroller, Safety mit echter Hardware.

---

## Bekannte Engpässe / Risiken (Stand jetzt)

- **Esprimo Q958 CPU-Last** unter Volllast unklar — Profiling in Phase 1 zwingend.
- **Faster-Whisper-Latenz** modellabhängig — selbst benchmarken (siehe Guidelines §13).
- **Sim-to-Real-Gap** bei sozialer Robotik ~30–40 % — Hardware-Phase wird Iterationen brauchen.
- **PC noch nicht eingerichtet** — KI-Assistenten schreiben aktuell nur Code, führen nichts aus.

---

## Nächste konkrete Schritte (nach Phase 0)

Siehe `TODO.md` für die ausführliche Liste. Top 3:

1. Phase-0 abschließen: Architektur-Diagramm als Mermaid, dann Übergang zu Phase 1.
2. `src/johnny5/topics.py` mit MQTT-Topic-Konstanten und QoS-Levels.
3. `src/johnny5/models/` mit Pydantic-Modellen für alle MQTT-Payloads (PADVector, PerceptionFaceEvent, …).
