# Johnny 5 Companion - Projekt-Kontext (v4)

> **Zweck:** Vollständiger Übergabe-Kontext für Claude Code / Claude Cowork. Bei jeder neuen Session als erstes lesen.
>
> **Status:** Konzeptphase, Start Mai 2026
>
> **Version:** 4.0 (nach zweitem wissenschaftlichem Review durch Claude Opus 4.7)
>
> **Eigentümer:** Darius Matuszak
>
> **Philosophie:** LEAP-71-Prinzip - existierende, etablierte Bausteine intelligent verbinden statt neu erfinden. Software-First, Hardware später. Aber mit kalibrierter Erwartung: Simulation deckt 60-70% der Verhaltensentwicklung ab, der Rest erfordert reale Sensoren und Menschen.

---

## 1. Projekt-Vision

Bau eines humanoiden Companion-Roboters (Codename "Johnny 5"), der natürlich menschliche Interaktionsmuster zeigt: Begrüßt morgens, plaudert über das Wetter, fragt proaktiv nach Terminen. Erkennt Stimmungen und reagiert angemessen. Folgt mit der Kamera Personen, hält Augenkontakt. Winkt zur Begrüßung, drückt mit Bewegung Emotionen aus. Lebt im Wohnzimmer als Familienmitglied (auch für das Kind).

**Wichtig:** Kein "smart speaker", sondern eine **gestaltete physische Präsenz**.

---

## 2. Kernprinzipien

### Software-First, Hardware-Later

Wie LEAP-71: Erst die "Physik" (hier: die Verhaltenslogik) in Simulation perfektionieren. Erst dann mechanische Hardware bauen. Iterieren in Sim ist 100x schneller als mit echten Servos.

**Kalibrierte Erwartung:** Im Gegensatz zu rein physikalischer Simulation gibt es bei sozialen Robotern einen substantiellen Sim-to-Real-Gap. Verhalten ist nicht-deterministisch, sozial konstruiert und kontextabhängig. Simulation deckt ~60-70% der Verhaltensentwicklung ab, der Rest erfordert echte Sensoren und reale Menschen.

### Verbinden statt Neuentwickeln

Wir bauen kein neues KI-System, sondern integrieren etablierte Forschung und Open-Source-Komponenten zu einem funktionierenden Ganzen.

### Modulare Architektur mit klaren Schnittstellen

Jede Komponente ist austauschbar. Dummy-Implementationen heute, echte Hardware morgen, ohne den Rest umzuschreiben.

### Zwei Geschwindigkeitsklassen

- **Fast Loop (30 Hz, lokal):** Tracking, Servo-Kontrolle, Bewegungsroutinen, Backchanneling, VAD-Reaktion, Safety-Watchdog
- **Slow Loop (0.1-1 Hz, Cloud + lokal):** Stimmungserkennung, Konversation, Entscheidungen, Memory-Reflection

Diese Trennung entspricht konzeptionell Kahnemans System-1/System-2-Modell (Kahneman 2011) als didaktische Analogie, nicht als kognitionswissenschaftliches Fundament.

### Deterministische Grundlagen + LLM-Reasoning

Das LLM ist nicht der Entscheider, sondern das Sprach-/Verständnis-Frontend und der Orchestrator für definierte Tool-Calls. Die Verhaltenslogik bleibt explizit kodiert in der Behavior-Engine. Tool-Use ist Verstärkung, nicht Ersatz der Entscheidungslogik.

### LLM als Orchestrator (ReAct-Pattern)

Das LLM kann strukturierte Aktionen via Function-Calling aufrufen, statt nur Text zu generieren. Aber:

- Die Behavior-Engine bleibt das Rückgrat. Sie entscheidet welche Tools dem LLM in welchem Kontext angeboten werden.
- LLM-Tool-Calls werden vom Safety-Layer geprüft bevor sie ausgeführt werden.
- Bei Tool-Call-Fehlern fällt das System auf regelbasierte Reaktionen zurück.
- Token-Budget pro Konversation ist hard-limitiert.

Konzeptuelle Grundlage: **Yao et al. (2022) - ReAct: Synergizing Reasoning and Acting in Language Models**.

### Generative Backchanneling & Latenz-Kompensation

Da der Slow Loop (LLM/STT/TTS) konstruktionsbedingt Latenzen >1.5s aufweist, steuert der Fast Loop autonome, non-verbale Reaktionen (Nicken, Blickzuwendung, auditive Bestätigungen wie "Mhm"), um die soziale Präsenz während der Denkpausen aufrechtzuerhalten. Sobald VAD User-Sprache erkennt, stoppt der Fast Loop sofort laufende Bewegungen und baut Blickkontakt auf.

**Konkrete Latenz-Targets** (basierend auf Heldner & Edlund 2010):

- **Reaktionssignal (Backchannel, Blickzuwendung):** <250 ms ab Erkennung eines Sprecher-Yield-Cues
- **Erste hörbare TTS-Ausgabe:** <1500 ms (durch Backchanneling kaschiert)
- **Bewegungs-Interrupt bei User-Sprache:** <100 ms ab VAD-Trigger
- **Saccadische Blickbewegung zur Sprachquelle:** <300 ms

Natürliche Pausen zwischen Sprecherwechseln in menschlicher Konversation liegen bei 200-400 ms. Diese Zahl ist nicht die Zielmetrik für die vollständige Antwort, sondern für das Reaktionssignal das die Lücke füllt.

### Lokale Feature-Reduktion vor Netzwerk-Versand

Rohe Landmark-Daten (468 Punkte pro Gesicht × 30 FPS) sprengen jeden MQTT-Broker. Das Perception-Modul läuft direkt auf der Kamera-Hardware und reduziert auf max. ~20 Feature-Vektoren (Kopfpose, Blickrichtung, geometrische Schlüssel-Abstände, PAD-Werte) vor dem Versand.

### Fallback-Verhalten bei Komponenten-Ausfall

Bei Ausfall von Cloud-LLM oder anderen externen Services: Graceful Degradation auf lokale Modelle und vordefinierte Konversations-Patterns. Niemals "tote" Phasen ohne jede Reaktion. Circuit-Breaker-Pattern für alle externen Dienste.

### Privacy & Local-First (NEU)

Datenfluss ist in drei Klassen organisiert, unabhängig von rechtlicher Pflicht:

- **Klasse A (immer lokal, nie an Cloud):** Roh-Audio, Roh-Video, Face-Embeddings, Speaker-Embeddings, Kinder-Sprachaufnahmen
- **Klasse B (lokal bevorzugt, Cloud nur als Notfall-Fallback):** STT-Transkripte, PAD-Werte, FACS-AUs, Memory-Inhalte
- **Klasse C (Cloud akzeptabel):** Aggregierte Semantik, abstrakte Gesprächs-Themen, anonymisierte Memory-Snippets

Sanitization-Stufe zwischen STT-Output und LLM-Input filtert Klasse-A-Inhalte heraus bevor sie an Cloud-LLM gehen.

### Safety-First für physische Aktion (NEU)

Bei einem physischen Roboter im Haushalt mit Kind sind Sicherheitsanforderungen nicht optional - auch ohne kommerzielle Compliance-Pflicht. Siehe Modul 7 (Safety Layer).

---

## 3. Hardware-Setup

### Entwicklungsrechner (Hauptmaschine)

- ASRock Z790 Pro RS (LGA1700)
- Intel Core i9-14900K (24 Kerne, Turbo 6.0 GHz)
- 2x 16 GB Kingston DDR5-5200
- Zotac RTX 4070 Ti (12 GB GDDR6X)
- **Zweck:** Entwicklung, Faster-Whisper STT, lokale LLM-Inferenz, Simulation, schwere Vision-Modelle

### Backend-Server (24/7-Betrieb)

- Fujitsu Esprimo Q958
- Intel Core i5-9500T (6 Kerne, 35W TDP)
- 16 GB RAM (2x 8 GB)
- 512 GB NVMe SSD
- **Zweck:** Proxmox-Host für Mosquitto, PostgreSQL+pgvector, Behavior-Engine, Dashboard, TTS, Safety-Watchdog
- **Watchpoint:** Bei voller Last (alles parallel inkl. lokale Embeddings) wird die CPU knapp. Profiling in Phase 1 zwingend.

### Zusätzlich vorhanden

- Synology NAS (optional als Backup-Storage)
- LilyGO T-Display-S3 (für spätere Edge-Komponenten)

### Johnny 5 Physische Hardware (später)

- Status: Noch nicht gebaut
- Wird in Simulation entwickelt, dann gefertigt
- Vorbehalt: Disney baut 2024 BDX-Droiden noch teleoperiert - expressive Bewegung in Echtzeit ist ein hartes Problem
- Servo-Wahl: Dynamixel mit Force/Torque-Feedback bevorzugt (nicht Hobby-Servos ohne Stromsensor)

---

## 4. Architektur-Übersicht

```
+------------------------------------------------------------------+
| ENTWICKLUNGSRECHNER (i9 + RTX 4070 Ti)                           |
| Bei Bedarf an                                                    |
+------------------------------------------------------------------+
| - Claude Code (primäre Entwicklungsumgebung)                     |
| - Faster-Whisper STT (GPU-beschleunigt, modellabhängig:          |
|   tiny ~50ms, base ~80ms, medium ~200ms, large ~500ms+,          |
|   exakte Werte selbst benchmarken)                               |
| - Lokale LLM-Inferenz (Ollama: Llama 3.1, Qwen)                  |
| - Vision-LLM Tests (LLaVA, Qwen-VL)                              |
| - Simulation (PyBullet/MuJoCo/Unreal)                            |
| - Training/Fine-Tuning lokaler Modelle                           |
+------------------------------------------------------------------+
                              |
                              | MQTT (Events) + gRPC/REST (Queries)
                              | nur reduzierte Features
                              |
+------------------------------------------------------------------+
| ESPRIMO Q958 - PROXMOX HOST (24/7)                               |
| ~25-35W Idle-Verbrauch                                           |
+------------------------------------------------------------------+
| LXC: Mosquitto MQTT Broker                                       |
| LXC: PostgreSQL + pgvector (eine DB statt SQLite+ChromaDB)       |
| LXC: Memory-Service (REST + Reflection-Loop)                     |
| LXC: Behavior-Engine (Python, py_trees)                          |
| LXC: Safety-Watchdog (eigene Privilegienebene)                   |
| LXC: Dashboard (Flask/Streamlit + Chart.js)                      |
| LXC: TTS-Service (Piper, lokal)                                  |
| LXC: Interrupt/Backchanneling-Coordinator                        |
| LXC: LLM-Orchestrator (Tool-Use-Gateway)                         |
| LXC: Sanitization-Gateway (Klasse-A-Filter)                      |
+------------------------------------------------------------------+
                              |
                              | MQTT (Identische Topics in Sim und Real)
                              |
+------------------------------------------------------------------+
| PERCEPTION-LAYER (auf Kamera-/Mikro-Hardware lokal)              |
+------------------------------------------------------------------+
| - MediaPipe Face Mesh + Pose (30 FPS)                            |
| - Lokale Feature-Extraktion (Kopfpose, Gaze, PAD)                |
| - Silero VAD für Audio-Aktivität                                 |
| - openWakeWord für Wake-Word-Detection                           |
| - pyannote.audio + ECAPA-TDNN für Speaker-Identification         |
| - Sendet nur ~20 Feature-Vektoren via MQTT                       |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
| SAFETY LAYER (querschnittlich, blockiert Aktor-Befehle)          |
+------------------------------------------------------------------+
| - Force/Torque-Monitoring                                        |
| - Geofencing (Bewegungs-Bounds)                                  |
| - Watchdog-Timer (Software-Hang-Detection)                       |
| - Hardware-E-Stop-Interface                                      |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
| SIMULATION-LAYER / HARDWARE-LAYER                                |
| Phase 1: Virtuell. Phase 2: Real.                                |
+------------------------------------------------------------------+
| - Virtuelle Aktuatoren (Log/3D-Visualisierung)                   |
| - Bzw. später: Jetson + ESP32 + Dynamixel                        |
| - Identische Schnittstelle in beiden Modi                        |
+------------------------------------------------------------------+
```

---

## 5. Module und Verantwortlichkeiten

### Modul 1: Perception (Wahrnehmung)

**Aufgabe:** Sensordaten → strukturierte, reduzierte Beobachtungen

#### Visuelle Wahrnehmung

- **MediaPipe Face Mesh** (468 Landmarks, Reduktion vor MQTT-Versand)
- **MediaPipe Pose** (Körperhaltung)
- **MediaPipe Hands** (Gestik, später für Wink-Erkennung)
- **face_recognition** Library (Personen-Identifikation visuell)
- **OpenCV** (Bewegungserkennung, optical flow)
- **Gaze Vector Tracking** (Blickrichtung via MediaPipe Iris)
- **Head Pose Estimation** (Pitch, Yaw, Roll aus Face Mesh)

#### Auditive Wahrnehmung

- **Silero VAD** (Voice Activity Detection - Trigger für Audio-Pipeline)
- **openWakeWord** (Wake-Word-Erkennung als erste Stufe, verhindert kontinuierliches STT)
- **pyannote.audio + ECAPA-TDNN** (Speaker Identification für Familienmitglieder)
- **Faster-Whisper** auf RTX 4070 Ti (Speech-to-Text)
- **Wav2Vec2-Emotion** primär, openSMILE eGeMAPS als optionaler Fallback

#### FACS / PAD

**Hinweis FACS-AU-Berechnung:** Die geometrische Ableitung von FACS Action Units aus MediaPipe-Landmarks ist eine substanzielle Eigenimplementierung. Es gibt keine direkte 1:1-Entsprechung - das Mapping muss aus dem OpenFace 2.0-Quellcode (Baltrusaitis et al. 2018) abgeleitet werden, auch wenn MediaPipe statt OpenFace als Tracking-Backend genutzt wird.

#### Wahrnehmungs-Robustheit (NEU)

MediaPipe und face_recognition haben dokumentierte Grenzen unter realen Bedingungen:

- **Beleuchtungsänderung:** Sonnenuntergang/Gegenlicht reduziert Landmark-Präzision deutlich. Fallback-Strategie: bei Confidence <0.7 → kein PAD-Update, nur Position behalten.
- **Partielle Verdeckung:** Hand vor Gesicht, Kind hinter Möbeln. Detection-Confidence prüfen, nicht stumpf interpolieren.
- **Distanz:** Ab >2 m wird FACS-AU aus MediaPipe-Landmarks unzuverlässig. Bei Großer Distanz nur Pose+Position, keine Emotionsanalyse.
- **Mehrere Gesichter:** Multi-Face muss explizit aktiviert sein, kostet Performance. Bei >3 Personen im Bild auf Frame-Skipping zurückfallen.

#### Out of Scope (explizit)

- Hjorth-Parameter (EEG-Konstrukt, gehört nicht zu Vision)
- Sakkaden-Analyse (braucht 100+ Hz Eye-Tracker, nicht möglich mit Standard-Kamera)

#### Output an MQTT (reduziert, nicht roh)

```
topic: perception/face/{person_id}
payload: {
  timestamp,
  position_xyz,
  head_pose: {pitch, yaw, roll},
  gaze_vector: {x, y, z},
  pad: {valence: 0.3, arousal: 0.6, dominance: 0.4},
  perclos: 0.15,
  attention: 0.85,
  confidence: 0.85
}

topic: perception/audio/speaker
payload: {
  timestamp,
  speaker_id,
  speaker_confidence,
  vad_active,
  wake_word_detected
}
```

---

### Modul 2: Interpretation (Verstehen)

**Aufgabe:** Beobachtungen → Bedeutung im Kontext

**Mathematische Grundlage - Auflösung Ekman vs. Barrett:**

- Perception extrahiert FACS Action Units (Ekman-Ebene, geometrisch messbar)
- Mapping in kontinuierlichen **3D-PAD-Raum** (Pleasure-Arousal-Dominance) als interner Common Ground
- LLM/Bayes-Inferenz konstruiert kontextuell die finale Emotion (Barrett-Ebene)

**Hinweis AffectNet/Dominance:** AffectNet (Mollahosseini et al. 2017) annotiert Valence und Arousal (2D), enthält aber keine Dominance-Labels. Der interne PAD-Raum wird daher praktisch auf Valence-Arousal (VA) reduziert; Dominance wird heuristisch aus FACS-AUs abgeleitet (z.B. AU23 Lippen zusammenpressen → niedrige Dominance) oder via LLM-Layer aus Kontext ergänzt.

Komponenten:

- **Personalisierte Baseline-Datenbank** (individuelle Normalwerte pro Person)
- **FACS-zu-PAD-Mapping** als YAML-Konfigurationsdatei
- **VA-Klassifikator** (kleines MLP, vortrainiert auf AffectNet; Dominance heuristisch)
- **Bayesianische Inferenz** (P(Stimmung | PAD, Kontext, Historie)) - skaliert bis ~10-15 Variablen, danach LLM-Layer übernimmt
- **Temporal Smoothing** (Kalman-Filter / EWMA - konkrete Parameter in Code-Guidelines)
- **LLM-Layer** (Claude API oder lokal) für semantisches Verständnis
- **Multimodale Fusion** (Late Fusion: Audio-PAD + Video-PAD → kombinierter PAD-Vektor)

**Multimodale Fusionsstrategie (Late Fusion):**

Audio- und Video-Kanal werden unabhängig zu PAD-Vektoren ausgewertet, dann kombiniert:

- Wenn VAD aktiv (Sprache erkannt): Audio-Gewicht 0.6, Video 0.4
- Wenn kein Audio-Signal: 100% Video
- Gewichtetes Mittel als Standard; Widersprüche (z.B. Lächeln + angespannte Stimme) werden als eigenes Feature an LLM-Layer übergeben, nicht weggemittelt

Quellen für moderne Fusion-Erweiterungen falls Late Fusion nicht ausreicht: **Baltrusaitis et al. (2019)**, **Tsai et al. (2019) - MulT**.

---

### Modul 3: Memory (Gedächtnis) - überarbeitet

**Aufgabe:** Persistente Erinnerung über Zeit, mit LLM-spezifischen Patterns

#### Klassische Gedächtnistypen (nach Tulving 1972/1985)

- **Episodic Memory:** Was ist wann passiert (PostgreSQL Append-Only-Log + Volltextsuche)
- **Semantic Memory:** Fakten über Personen, Vorlieben, Geschichte
- **Procedural Memory:** Gelernte Routinen und Reaktionen
- **Schedule Memory:** Termine, Trigger, Follow-ups
- **Vector Memory:** Embeddings für semantische Suche (pgvector, eine DB statt zusätzlicher ChromaDB)

#### LLM-spezifische Memory-Patterns (NEU, nach Park et al. 2023 "Generative Agents")

Das klassische Tulving-Schema wird ergänzt um drei Konzepte aus der "Generative Agents"-Arbeit, die für Companion-Roboter direkt anwendbar sind:

**1. Memory Stream als Append-Only-Log**

Statt strukturierter Tabellen wird ein Memory-Stream als Append-Only-Log geführt. Jeder Eintrag hat:

- timestamp
- type (observation, reflection, plan)
- content (natural language description)
- importance_score (1-10, LLM-bewertet)
- embedding (für semantische Suche)
- access_count
- last_accessed_at

**2. Importance Scoring**

Beim Schreiben eines Memory-Eintrags bewertet das LLM selbst die Wichtigkeit auf einer Skala 1-10. Triviales ("ich habe Wasser getrunken") bekommt 1, bedeutsames ("Darius hat seinen Vater erwähnt der gestorben ist") bekommt 9-10. Das ersetzt nicht den Decay-Mechanismus, sondern bestimmt wie schnell etwas zerfällt.

**3. Reflection-Loop**

Periodisch (z.B. einmal pro Tag) generiert der Agent höher-aggregierte Erkenntnisse aus den jüngsten Memories ("Darius war diese Woche dreimal am Abend müde"). Diese Reflections werden selbst als Memories abgelegt und können in Retrieval einfließen. Das ist der Mechanismus durch den der Roboter über Wochen hinweg sinnvoll lernt.

**4. Retrieval Score**

Bei Memory-Abruf wird kombiniert gewichtet:

```
score = α · recency + β · importance + γ · relevance
```

- recency: Zeit-basiertes Decay (Ebbinghaus / Anderson & Milson 1989)
- importance: das gespeicherte Importance-Score
- relevance: Cosine-Similarity zwischen Query und Memory-Embedding

Konkrete Formeln in der Code-Guidelines.

#### Forgetting / Decay

Ohne kontrollierten Gedächtnisverlust wird die Vector-DB mit der Zeit mit irrelevantem Kontext überflutet. Decay-Mechanismus nach Ebbinghaus (1885) / Anderson & Milson (1989):

- Zeitbasiertes Gewicht: ältere Einträge erhalten niedrigeren Retrieval-Score
- Importance modifiziert die Decay-Rate: hochwichtige Memories zerfallen langsamer
- Relevanz-Feedback: häufig abgerufene Einträge behalten hohes Gewicht länger
- Kategorisch löschbar (manuelle Steuerung über Dashboard)

#### Datenbank-Architektur

**Entscheidung v4:** PostgreSQL mit pgvector-Extension als einzige DB. Vorteil:

- Eine DB weniger im Stack (vs. SQLite+ChromaDB)
- Vector-Suche, Volltextsuche und relationale Queries in einer Engine
- Transaktionale Konsistenz zwischen Memory-Schreiben und Index-Update

Trade-off: pgvector hat etwas mehr Setup-Overhead als ChromaDB. Bei einem Hobby-Projekt mit 24/7-System überwiegt die Vereinfachung des Stacks.

#### Externe Wissensquellen (zu integrieren)

- **FACS-Action-Unit-Katalog** als JSON/YAML
- **FACS-zu-PAD-Mapping** als Konfigurationsdatei
- **Plutchik Wheel of Emotions** (als JSON-Schema)
- **PAD-Modell** (Pleasure-Arousal-Dominance Raum)
- **Big Five OCEAN** (Persönlichkeitsmodell)
- **AffectNet/EMOTIC:** nur Embeddings/vortrainierte Gewichte, nicht die Rohdaten
- **HumanML3D, AMASS:** Bewegungsdaten für Animationsbibliothek
- **HRI-Verhaltens-Patterns** (Mensch-Roboter-Interaktion Forschung)

---

### Modul 4: Behavior-Engine (Entscheidung)

**Aufgabe:** Was tun, basierend auf Wahrnehmung + Interpretation + Memory

Komponenten:

- **State Machine** mit Tageszeit-Awareness
- **Behavior Tree** für strukturierte Reaktionsmuster (nach Colledanchise & Ögren 2018) - konkrete Bibliothek: **py_trees** (ROS2-kompatibel)
- **Cron-Scheduler** für proaktive Trigger (Termin-Follow-ups)
- **Rule Engine** (deklarative Regeln in YAML/JSON)
- **Conflict Resolution** (welche Aktion priorisieren?)
- **Interrupt-Coordinator:** bricht laufende Aktionen ab wenn User spricht
- **Engagement Estimation:** bewertet ob und wann eine Reaktion angemessen ist
- **LLM-Tool-Orchestrator:** ReAct-Pattern, das LLM kann definierte Tools aufrufen

#### "Wann reagieren" - Engagement Estimation

Das ist ein ungelöstes Problem in HRI (Rich et al. 2010, Bohus & Horvitz 2009, Sidner et al. 2004). Pragmatischer Ansatz: Regelbasierte Heuristiken auf Basis von Attention-Score, PERCLOS und Proximity, kombiniert mit LLM-basierter Situations-Einschätzung im Slow Loop. Kein formales POMDP - das wäre für dieses Projekt overengineered.

#### Turn-Taking-Awareness

Turn-Taking ist eine der zentralen Herausforderungen in HRI und geht über reines Backchanneling hinaus. Wissenschaftliche Fundamente:

- **Sacks, Schegloff & Jefferson (1974)** - "A Simplest Systematics for the Organization of Turn-Taking" - Grundlage aller späteren Forschung
- **Duncan (1972)** - Yield-Cues, Hold-Cues, Back-channel-Cues als Signale
- **Heldner & Edlund (2010)** - empirische Timing-Daten (Pausen 200-400ms typisch)
- **Skantze (2021)** - Turn-Taking im HRI-Kontext, modernste Review

Implementierung:

- **Yield-Cues:** primär über VAD-Signale (Sprecher hört auf) + fallender Tonfall (Audio-Features) + Augenkontakt (Gaze)
- **Hold-Cues:** primär durch Pause-Länge-Tracking. Pause <500ms = Sprecher hält wahrscheinlich
- **Back-channel-Cues:** Zuhörer-Signale ("Mhm", Nicken) bedeuten nicht Übernahme

Reaktionssignal (Backchannel, Blickzuwendung) muss <250 ms ab Yield-Cue ausgelöst werden, sonst wirkt es unnatürlich.

#### LLM-Tool-Orchestrierung (NEU)

Das LLM erhält über das ReAct-Pattern Zugriff auf definierte Tools:

- `query_memory(person, topic, limit)` → Memory-Service
- `log_observation(content, importance_hint)` → Memory-Stream
- `schedule_followup(person, time, topic)` → Schedule-Memory
- `request_motion(emotion_pad, type, duration)` → Action-Modul
- `request_backchannel(type)` → sofortige Mini-Reaktion
- `update_baseline(person, metric, value)` → Baseline-Update

Wichtig:

- Tool-Calls passieren durch den **LLM-Orchestrator-LXC**, nicht direkt zwischen LLM und Modulen.
- Der Safety-Layer prüft jeden Tool-Call vor Ausführung.
- Tool-Definitionen sind in YAML versionierbar.
- Bei Tool-Call-Fehler oder Timeout → Fallback auf regelbasierte Reaktion.

#### Beispiel-Regel

```yaml
- name: "Erste Begegnung am Tag"
  bedingung:
    - person_recognized: true
    - last_interaction:
        same_day: false
    - person_state: "approached"
  aktion:
    - acknowledge: "greeting"
    - parameter:
        tageszeit: auto
        intensity: 0.7
    - duration: 3s
    - follow_up_possible: true
    - interruptible: true
```

---

### Modul 5: Action (Ausführung)

**Aufgabe:** Entscheidung → physische/sprachliche Aktion

Komponenten:

- **Speech Output:** TTS via Piper (lokal) oder ElevenLabs (cloud)
- **Motion Controller:** Servo-Bewegungen via Aktuator-Interface
- **LMA-Layer:** Übersetzung von PAD-Werten in Laban Motion Factors (Weight, Space, Time, Flow) als Zwischenschicht vor der Servo-Parametrisierung
- **Emotion Animator:** Vorgefertigte Bewegungs-Choreografien aus AMASS/HumanML3D
- **Easing Library:** Natürliche Bewegungskurven (Penner Equations) als Basis-Tool
- **Jerk-Limiting & S-Curve Trajectories:** Mathematische Begrenzung der Beschleunigungsänderung (Ruck) für organische Bewegungsabläufe. Verhindert mechanisches Wirken und Uncanny-Valley-Effekt
- **Backchanneling Generator:** Non-verbale Mini-Reaktionen während LLM rechnet

#### LMA-Mapping (PAD → Servo-Parameter)

Laban Movement Analysis definiert vier Motion Factors, die direkt auf Servo-Steuerungsparameter abgebildet werden:

| LMA Factor | Ausprägung | Servo-Parameter |
|---|---|---|
| Weight | leicht / schwer | Jerk-Limit niedrig / hoch |
| Space | direkt / indirekt | Trajektorie gerade / kurvig |
| Time | plötzlich / nachhaltig | Beschleunigung hoch / niedrig |
| Flow | gebunden / frei | S-Curve straff / locker |

PAD-zu-LMA-Heuristik (Ausgangspunkt, empirisch anzupassen):

- Hohe Valence + hohe Arousal → leicht, direkt, plötzlich, frei (Freude)
- Niedrige Valence + niedrige Arousal → schwer, indirekt, nachhaltig, gebunden (Trauer)
- Hohe Arousal + niedrige Valence → schwer, direkt, plötzlich, gebunden (Ärger)

Vertiefende Quellen:

- **Knight & Simmons (2014)** - direkter als Nakata 2002, mit konkreten Mappings auf Roboter-Parameter
- **Chi et al. (2000)** - EMOTE-System
- **Takayama et al. (2011)** - Disney-Animationsprinzipien auf Robotik angewendet

#### Abstrakte Interfaces

```python
class ActuatorInterface:
    def point_camera_at(x, y, z, jerk_limit: float) -> None
    def wave_hand(duration, intensity, easing: str) -> None
    def express(emotion: PAD, intensity: float) -> None
    def speak(text: str, emotion: PAD = neutral) -> None
    def backchannel(type: str) -> None
    def interrupt_current_action() -> None
    def get_status() -> ActuatorStatus
```

Implementierungen:

- `DummyActuator`: Console-Logs (für Tests ohne Hardware)
- `VirtualActuator`: 3D-Visualisierung in Simulation
- `ServoActuator`: Echte Hardware (später) - immer durch Safety-Layer gefiltert

---

### Modul 6: Dashboard & Tools

**Aufgabe:** Beobachtung, Debugging, Konfiguration

- Web-UI (Streamlit oder Flask + Chart.js) für Live-Metriken
- Memory-Browser (was hat das System gespeichert?)
- Behavior-Replay (Aktionen nachvollziehen)
- Regel-Editor (Behavior Rules anpassen)
- Baseline-Status (wie weit ist die Personalisierung?)
- PAD-Live-Visualisierung (aktuelle Stimmung im 3D-Raum)
- Memory-Reflection-Browser (welche Reflections hat der Agent generiert?)
- Safety-Status-Panel (Watchdog, Force-Limits, E-Stop)

---

### Modul 7: Safety Layer (NEU)

**Aufgabe:** Querschnittliche Sicherheits-Schicht zwischen Behavior-Engine und Action-Modul. Blockiert oder modifiziert Aktor-Befehle die Sicherheitsanforderungen verletzen würden.

#### Anforderungen

**Hardware-Ebene:**

- Physischer Emergency-Stop-Knopf (unabhängig vom Software-Stack)
- Force/Torque-Limits an allen Servos
- Dynamixel-Servos haben native Stromsensor-Limits (bevorzugt vor Hobby-Servos)
- Akustische und visuelle Signalisierung von Aktivität ("Roboter denkt", "Roboter wird sich bewegen")

**Software-Ebene:**

- **Watchdog-Timer:** wenn Behavior-Engine nicht innerhalb von 500ms ein Heartbeat sendet, geht der Roboter in einen passiven sicheren Zustand
- **Geofencing:** definierte Bewegungs-Bounds pro Servo, Hard-Limits werden nicht überschritten
- **Tool-Call-Validation:** jeder LLM-Tool-Call wird gegen Whitelist und Parameter-Grenzen geprüft
- **Rate-Limiting:** maximal X Bewegungs-Befehle pro Sekunde, Schutz gegen Software-Bugs die Schleifen produzieren
- **Circuit-Breaker:** bei wiederholten Fehlern eines Subsystems wird es deaktiviert, statt das ganze System zum Absturz zu bringen

#### Standards

- **ISO 13482:2014** - Personal Care Robotics Safety Standard (Referenz, keine zwingende Compliance bei Hobby)
- **ISO 10218** - Industrierobotik-Sicherheit, teilweise übertragbar

#### Architektur

Der Safety-Layer läuft als eigenständiger LXC-Container mit erhöhten Privilegien. Alle Action-Befehle gehen durch ihn. Er kann blockieren, modifizieren (z.B. Jerk-Limit reduzieren) oder durchlassen.

```python
class SafetyLayer:
    def validate_motion(cmd: MotionCommand) -> SafetyVerdict:
        # Geofencing-Check
        # Velocity/Jerk-Check
        # Force-Prediction (vor Ausführung)
        # Rate-Limit-Check
        ...
    
    def heartbeat() -> None:
        # alle 100ms; bei Ausbleiben → Passive Mode
        ...
    
    def emergency_stop() -> None:
        # Hard-Stop aller Aktoren, akustische Warnung
        ...
```

---

## 6. Wissenschaftliche Grundlagen (zu integrieren)

### Gesichtsanalyse

- **FACS** (Facial Action Coding System, Ekman & Friesen 1978) - 46 Action Units
- **Tian et al. (2001)** - systematisches AU-Landmark-Mapping als Implementierungsreferenz
- **OpenFace 2.0 (Baltrusaitis et al. 2018)** - Alternative und Quellcode-Referenz für FACS-AU-Berechnung aus Landmarks
- **MediaPipe Face Mesh** - 468 Landmarks
- **MediaPipe Iris** - für präzise Blickrichtung
- **Martinez et al. (2017)** - aktueller Survey zu Automatic Analysis of Facial Actions

### Emotionserkennung (Hybrid-Ansatz)

- **Untere Ebene:** Ekman/FACS - geometrisch messbare Action Units
- **Mittlere Ebene:** PAD-Modell (Mehrabian 1974, Russell 1980) - kontinuierlicher 3D-Raum als Common Ground. Praktisch auf VA reduziert, Dominance heuristisch ergänzt.
- **Obere Ebene:** Barrett Theory of Constructed Emotion (2017) - kontextuelle Interpretation durch LLM
- **Klassifikation:** Russell Circumplex Model (1980), Plutchik's Wheel (1980), OCC-Modell (Ortony, Clore & Collins 1988)
- **Empirische Validierung PAD:** Russell & Mehrabian (1977) "Evidence for a three-factor theory of emotions"
- **Moderne Zusammenfassung:** Posner et al. (2005)
- **Brückenarbeit kategorial/dimensional:** Cowen & Keltner (2017) "27 distinct categories bridged by continuous gradients"
- **Komponentenmodell als Alternative:** Scherer (2009)
- **Semantische Verortung:** Bradley & Lang (1994) - ANEW

### Multimodale Fusion

- **Baltrusaitis, Ahuja & Morency (2019)** - "Multimodal Machine Learning: A Survey and Taxonomy" - Hauptreferenz
- **Poria et al. (2017)** - älterer Survey, weiterhin nützlich für Affective-Specifics
- **Soleymani et al. (2012)** - emotion recognition in response to videos
- **Tsai et al. (2019)** - MulT, state-of-the-art bei nicht-synchronen Modalitäten
- **Zadeh et al. (2017)** - Tensor Fusion Network
- **Liang et al. (2022)** - Foundations and Recent Trends in Multimodal ML
- **Strategie:** Late Fusion als Einstieg (einfacher zu implementieren, leichter zu debuggen, Modalitäten unabhängig optimierbar)

### Aufmerksamkeit / Müdigkeit

- **PERCLOS** (Wierwille et al. 1994, NHTSA-Standard) - Percentage of Eye Closure. Schwellenwert >15% gilt als Müdigkeitsindikator.
- **Dinges & Grace (1998)** - empirische Validierung von PERCLOS
- **Gaze Vector Tracking** (über MediaPipe Iris)
- **Head Pose Estimation** (Pitch/Yaw/Roll)
- **NASA TLX** (Task Load Index) als Bewertungsschema

### Persönlichkeit

- **OCEAN / Big Five** (Costa & McCrae 1992)
- **HEXACO-Modell** (alternativ)

### Mensch-Roboter-Interaktion

- **Mori (1970)** - Uncanny Valley
- **Disney Animation Principles** angewendet auf Roboter (Thomas & Johnston 1981)
- **Takayama et al. (2011)** - "Expressing Thought: Improving Robot Readability with Animation Principles"
- **Backchanneling in HRI** (Sidner, Lee et al. 2005)
- **Sidner et al. (2004)** - "Where to look: a study of human-robot engagement"
- **Castellano et al. (2009)** - "Detecting User Engagement with a Robot Companion"
- **HRI-Forschung MIT Media Lab** (Breazeal 2002)
- **Nonverbal Leakage in Robots** (Mutlu et al. 2009)
- **Bohus & Horvitz (2009)** - "Open-World Dialog"
- **Rich et al. (2010)** - "Recognizing Engagement in Human-Robot Interaction"

### Turn-Taking

- **Sacks, Schegloff & Jefferson (1974)** - "A Simplest Systematics for the Organization of Turn-Taking" - Grundlage
- **Duncan (1972)** - "Some signals and rules for taking speaking turns in conversations"
- **Stivers et al. (2009)** - kulturelle Variation im Turn-Taking
- **Heldner & Edlund (2010)** - empirische Pausen/Gaps/Overlaps
- **Skantze (2021)** - "Turn-taking in Conversational Systems and HRI: A Review"

### Engagement Estimation

- **Sidner et al. (2004)** - Vorarbeit zu Sidner 2005
- **Sidner et al. (2005)** - bereits unter HRI referenziert
- **Castellano et al. (2009)** - direkt im Companion-Kontext
- **Rich et al. (2010)**
- **Bohus & Horvitz (2009)** - Entscheidungsmodell für Initiations-Timing

### Audio-Verarbeitung

- **Silero VAD** für Sprach-Aktivität
- **openWakeWord** für Wake-Word-Detection (Open Source, MIT)
- **Faster-Whisper** für STT. Latenz modellabhängig.
- **pyannote.audio** (Bredin et al. 2020) für Speaker Diarization
- **ECAPA-TDNN** (Desplanques et al. 2020) für Speaker-Embedding
- **Wav2Vec2-Emotion** für akustische Emotionserkennung
- **Schneider et al. (2019)** und **Baevski et al. (2020)** - Wav2Vec / Wav2Vec2 Grundlage
- **eGeMAPS** (openSMILE-Feature-Set, Eyben et al. 2010) optional
- **openSMILE** als Feature-Extraktions-Framework

### Gedächtnis

- **Tulving (1972, 1985)** - Episodic Memory / Semantic Memory Unterscheidung
- **Ebbinghaus (1885)** - Vergessenskurve als Basis für Decay-Mechanismus
- **Anderson & Milson (1989)** - "Human memory: An adaptive perspective"
- **Park et al. (2023)** - "Generative Agents: Interactive Simulacra of Human Behavior" - LLM-spezifische Memory-Architektur, direkt übertragbar (Importance Scoring, Reflection)
- **Packer et al. (2023)** - "MemGPT: Towards LLMs as Operating Systems" - hierarchisches Memory falls Context-Window-Probleme auftreten

### Bewegung / Animation

- **S-Curve Trajectories** und **Jerk-Limiting** (ISO 9283 für Roboter-Performance-Charakterisierung)
- **Penner Easing Equations** aus Web-Animation als Easing-Basis
- **HumanML3D, AMASS** - Bewegungsdatenbanken als Referenz
- **Disney 12 Principles of Animation** (Thomas & Johnston 1981)
- **Clavet (2016)** - "Motion Matching and The Road to Next-Gen Animation" - falls Easing+AMASS-Snippets nicht reichen
- **Henter et al. (2020)** - MoGlow - probabilistische Motion Generation, Phase-7-Option

### Expressive Bewegung (Laban Movement Analysis)

- **Laban (1960)** - "The Mastery of Movement" - vier Motion Factors: Weight, Space, Time, Flow
- **Zhao (2001)** - "Synthesis and Acquisition of LMA Qualitative Parameters for Physical Agents"
- **Nakata et al. (2002)** - "Expression of emotion and intention by a robot's motion"
- **Knight & Simmons (2014)** - "Expressive Motion with X, Y and Theta" - direkter auf Mobile-Robotik anwendbar
- **Chi et al. (2000)** - EMOTE-System
- **Camurri et al. (2003)** - EyesWeb-Plattform

### Behavior Trees

- **Colledanchise & Ögren (2018)** - "Behavior Trees in Robotics and AI" - Open Access, Standardreferenz
- **Millington & Funge (2009)** - "Artificial Intelligence for Games"
- **Bibliothek:** py_trees (Splintered Reality, Python, ROS2-kompatibel)

### LLM-Agentik (NEU)

- **Yao et al. (2022)** - "ReAct: Synergizing Reasoning and Acting in Language Models"
- **Schick et al. (2023)** - "Toolformer: Language Models Can Teach Themselves to Use Tools"
- **Park et al. (2023)** - bereits unter Memory

### Safety & Ethik (NEU)

- **ISO 13482:2014** - Personal Care Robotics Safety Standard
- **Sharkey & Sharkey (2010)** - "The crying shame of robot nannies" - Ethik-Skepsis
- **Turkle (2011)** - "Alone Together"
- **Breazeal (2002)** - positive Position

### ML-Engineering (NEU)

- **Sculley et al. (2015)** - "Hidden Technical Debt in Machine Learning Systems"
- **Breck et al. (2017)** - "The ML Test Score"

---

## 7. Geplante Entwicklungsphasen

**Realistische Zeitplanung bei 5-10h/Woche:** Gesamtdauer 6-7 Monate für vorzeigbare Simulation, plus Hardware-Phase. Die folgenden Wochen-Angaben sind als grobe Orientierung zu verstehen, mit Puffer einplanen.

### Phase 0: Konzept & Setup (1-2 Wochen)

- [ ] PROJECT_CONTEXT.md finalisieren (dieses Dokument)
- [ ] CLAUDE_CODE_GUIDELINES.md erstellen (Code-Patterns, Formeln, Anti-Patterns)
- [ ] Proxmox auf Esprimo installieren
- [ ] PostgreSQL + pgvector im LXC einrichten
- [ ] Claude Code/Cowork auf Hauptrechner einrichten
- [ ] Git-Repo aufsetzen, CLAUDE.md schreiben
- [ ] Architektur-Diagramm in Mermaid finalisieren

### Phase 1: Skelett, Safety, Simulation (3-4 Wochen)

- [ ] Docker-Compose / Proxmox-LXCs mit Mosquitto, PostgreSQL, alle Services
- [ ] MQTT-Topic-Schema mit QoS-Levels definieren
- [ ] **Safety-Layer als Stub:** Watchdog-Heartbeat-Loop, Validation-Interface, auch ohne echte Hardware
- [ ] DummyActuator + VirtualActuator implementieren
- [ ] Jerk-Limiting und S-Curve Trajectories als Basis-Library mit Unit-Tests
- [ ] LMA-zu-Servo-Parameter-Mapping als Konfigurationsdatei anlegen
- [ ] Erste Simulation: 3D-Avatar in PyBullet/Unreal, der "lebt"
- [ ] Mock-Perception: Skript sendet simulierte Beobachtungen (reduzierte Features)
- [ ] Behavior-Engine reagiert mit Aktionen, sichtbar in Avatar
- [ ] Performance-Profiling des Esprimo: was läuft parallel, was wird zum Engpass?

### Phase 2: Reale Wahrnehmung (4-6 Wochen)

- [ ] MediaPipe Face Mesh produktiv
- [ ] Wahrnehmungs-Robustheits-Fallbacks (Confidence-Gates, Distanz-Logik)
- [ ] Lokale Feature-Reduktion (max ~20 Features vor MQTT)
- [ ] Geometrische FACS-AU-Berechnung (OpenFace-Quellcode als Referenz)
- [ ] PAD-Mapping aus AUs (YAML-Config + MLP, VA primär, Dominance heuristisch)
- [ ] PERCLOS für Müdigkeit (Schwellenwert >15%)
- [ ] Gaze Vector + Head Pose
- [ ] Silero VAD + openWakeWord + Faster-Whisper (Modellgröße nach Latenz-Bedarf wählen, eigenes Benchmark)
- [ ] Speaker-Identification via pyannote/ECAPA-TDNN
- [ ] Wav2Vec2-Emotion für Audio-PAD
- [ ] Late-Fusion-Mechanismus Audio + Video
- [ ] Personalisierte Baseline-Aufnahme (7-14 Tage Daten sammeln, parallel zur weiteren Entwicklung)
- [ ] face_recognition für Personen-ID visuell
- [ ] Sanitization-Gateway zwischen STT und Cloud-LLM (Klasse-A-Filter)

### Phase 3: Interpretation & Memory (4-5 Wochen)

- [ ] PostgreSQL-Schema für Memory-Stream (Append-Only-Log mit Embeddings)
- [ ] **Importance-Scoring via LLM-Call beim Schreiben**
- [ ] **Reflection-Loop (täglich generierte Aggregat-Erkenntnisse)**
- [ ] **Retrieval-Score (recency, importance, relevance kombiniert)**
- [ ] Decay-Mechanismus mit Importance-Modulation
- [ ] FACS→PAD-Konfigurationsdatei finalisieren
- [ ] VA-Klassifikator (vortrainiert auf AffectNet)
- [ ] Bayesianische Stimmungs-Inferenz
- [ ] Kalman-Filter für temporale Glättung
- [ ] LLM-Integration (Claude API oder lokal) mit Tool-Use-Schema
- [ ] Externe Wissensdatenbanken als pgvector-Embeddings einbinden

### Phase 4: Verhalten, Sprache & Latenz-Management (5-7 Wochen)

- [ ] Behavior-Rule-Engine mit YAML-Definitionen (py_trees als Bibliothek)
- [ ] Turn-Taking-Signale implementieren (Yield-/Hold-/Back-channel-Cues nach Duncan/Sacks)
- [ ] Engagement-Estimation-Heuristiken (wann reagieren?)
- [ ] Interrupt-Coordinator: VAD löst sofortige Bewegungs-Stops aus (<100ms)
- [ ] Backchanneling-Generator: non-verbale Mini-Reaktionen (<250ms ab Yield-Cue)
- [ ] LLM-Tool-Use-Orchestrator (Tool-Schema, Safety-Validation, Fallback)
- [ ] Termin-Tracking mit Follow-up-Triggers
- [ ] TTS-Integration (Piper)
- [ ] Fallback-Verhalten bei Service-Ausfällen (Circuit-Breaker)
- [ ] Erste echte Konversationen mit Reaktionssignal <250ms

### Phase 5: Bewegungs-Choreografie (3-4 Wochen)

- [ ] Easing-Library für natürliche Bewegungen (Penner Equations)
- [ ] Jerk-limitierte Trajektorien-Planung mit Unit-Tests
- [ ] LMA-Mapping-Tabelle PAD → Motion Factors → Servo-Parameter empirisch kalibrieren
- [ ] Vorgefertigte Sequenzen (winken, nicken, schauen) aus AMASS abgeleitet
- [ ] PAD-zu-LMA-zu-Bewegung-Pipeline testen
- [ ] Live-Test in Simulation

### Phase 6: Dashboard & Polish (2-3 Wochen)

- [ ] Web-Dashboard für alle Metriken
- [ ] PAD-Live-Visualisierung
- [ ] Regel-Editor
- [ ] Memory-Browser mit Decay-Status und Reflection-Liste
- [ ] Safety-Status-Panel
- [ ] Replay-System
- [ ] Eval-Suite (Golden-Path-Tests, Snapshot-Tests für ML-Outputs)

### Phase 7: Hardware-Migration (offen, mehrere Monate)

- [ ] Mechanik konstruieren (CAD)
- [ ] 3D-Druck (PETG, nicht PLA wegen Hitze)
- [ ] Servo-Auswahl (Dynamixel bevorzugt wegen Force/Torque-Feedback)
- [ ] Mikrocontroller-Integration (ESP32/Arduino)
- [ ] Migration: VirtualActuator → ServoActuator
- [ ] Safety-Layer mit echter Hardware testen (Force-Limits, E-Stop, Watchdog)
- [ ] Jerk-Limits und LMA-Mapping an reale Servo-Spezifikationen anpassen

---

## 8. Bekannte Constraints und Risiken

### Soziale Constraints

- **Wohnzimmer-Setting:** Roboter wird von Familie und Kind wahrgenommen
- **Kind im Haushalt:** Soll mit Johnny interagieren können, altersgerecht
- **Keine Anthropomorphisierung in Richtung Freundschaft beim Kind:** Roboter wird klar als Maschine kommuniziert
- **Eltern-Override:** alle Funktionen müssen für Erwachsene überschreibbar/abschaltbar sein

### Technische Constraints

- **LLM-Kosten:** Kontinuierliche Cloud-Calls sind nicht bezahlbar. Lokale Modelle für Standard, Cloud nur für komplexe Situationen.
- **Latenz:** Reaktionssignal-Latenz <250ms erfordert Backchanneling-Trick und Fast-Loop-Architektur. Faster-Whisper-Latenz hängt von Modellgröße ab.
- **MQTT-Bandbreite:** Rohe Landmarks würden Bus überlasten, Reduktion auf Edge zwingend.
- **Hardware-Limits Esprimo:** i5-9500T mit 35W TDP kann nicht alles parallel. Profiling in Phase 1 zwingend.
- **Uncanny Valley:** Mechanische Bewegung wirkt schnell gruselig, Jerk-Limiting + LMA Pflicht.
- **Single Point of Failure:** Nur Darius kann das System bedienen.

### Wissenschaftliche Constraints

- **Emotionserkennung in echten Settings:** 50-70% Genauigkeit. Personalisierte Baseline (7-14 Tage) kann das verbessern, aber externe Validierung fehlt. Der "lab-to-real gap" ist bekannt und dokumentiert.
- **AffectNet enthält keine Dominance-Labels:** PAD-Raum intern auf VA reduziert, Dominance heuristisch.
- **Barrett vs. Ekman:** PAD-Raum als pragmatischer Kompromiss.
- **Personalisierung braucht Zeit:** 7-14 Tage Baseline-Daten minimum.
- **"Wann reagieren" ist ungelöstes Problem:** Heuristiken über Engagement Estimation, kein formales POMDP.
- **Turn-Taking in realen Settings:** Yield-/Hold-Cues sind kulturell variabel und kontextabhängig.
- **Multimodale Fusion:** Late Fusion als Einstieg praktisch, aber Widersprüche zwischen Modalitäten bleiben schwierig.
- **Sim-to-Real-Gap:** bei sozialer Robotik substantiell, ~30-40% der Verhaltensentwicklung erfordert reale Sensoren und Menschen.

### Safety-Constraints (NEU)

- **Kind im Bewegungsradius:** Force-Limits, weiche Bewegungen, geringe Trägheit Pflicht.
- **Watchdog notwendig:** Software-Hang darf nicht zu unkontrollierten Bewegungen führen.
- **Hardware-E-Stop:** physischer Knopf, unabhängig vom Software-Stack.

### Projekt-Constraints

- **Hobby-Projekt:** Realistisch 5-10h/Woche.
- **Erwartete Dauer:** 6-7 Monate für vorzeigbare Simulation, +mehrere Monate für Hardware.
- **Pausen einplanen:** Dokumentation muss "3 Monate Pause"-tauglich sein.

---

## 9. Offene Entscheidungen

### Simulationsumgebung

- **PyBullet:** Python-nativ, einfach, gut für Start
- **MuJoCo:** Präziser, Forschungsstandard
- **Unreal Engine 5:** Darius hat UE5-Erfahrung, hervorragende Visualisierung
- **Isaac Sim:** NVIDIA, GPU-beschleunigt, eher production-ready für Robotik
- **Gazebo + ROS2:** Robotik-Standard

**Empfehlung:** PyBullet für schnellen Start, Unreal oder Isaac Sim als zweite Iteration.

### LLM-Backend

- **Claude API** (cloud): Beste Qualität, kostet pro Call. Tool Use nativ.
- **Lokale Modelle via Ollama:** Kostenfrei, weniger gut. Tool Use je nach Modell.
- **Hybrid:** Lokal für Standard, Claude für komplexe Situationen.

**Empfehlung:** Hybrid, mit klarer Trennung in der Architektur. Lokale Modelle für Routine-Tool-Calls, Cloud für tiefere Konversation.

### TTS-Engine

- **Piper** (lokal): Empfohlen für Start, gute Qualität, schnell
- **ElevenLabs:** Cloud, hohe Qualität, kostenpflichtig
- **Coqui TTS / Chatterbox:** Voice Cloning möglich, lokal

### Faster-Whisper Modellgröße

Tradeoff Latenz vs. Qualität muss empirisch entschieden werden. Empfehlung: mit `base` starten, auf `medium` wechseln wenn Qualität nicht ausreicht. `large` nur wenn Latenz durch Backchanneling ausreichend kaschiert wird. Die im v3/v4 zitierten Latenzwerte sind grobe Orientierung - selbst benchmarken.

### Wake-Word-Strategie

- **openWakeWord:** Open Source, MIT, läuft auf Edge-Geräten - empfohlen
- **Porcupine:** kommerziell, sehr robust, kostenpflichtig nach Free-Tier
- **Always-On VAD ohne Wake-Word:** funktional, aber Privacy-Problem wenn Cloud-LLM dahinter

**Empfehlung:** openWakeWord als erste Stufe, dann VAD, dann STT. Cloud-LLM nur bei klarer Konversations-Initiation.

### Mathematischer Kulturkampf: Ekman vs. Barrett (gelöst)

**Lösung:** Drei-Schicht-Architektur

- Sensorik: FACS Action Units (Ekman, geometrisch messbar)
- Repräsentation: VA-Raum primär / PAD mit heuristischer Dominance (kontinuierlich, mathematisch behandelbar)
- Interpretation: Kontextuelle Konstruktion durch LLM (Barrett)

### Multimodale Fusion (gelöst als Einstieg)

Late Fusion mit VAD-abhängigem Gewicht. Kann später durch Tensor Fusion (Zadeh et al. 2017) oder MulT (Tsai et al. 2019) ersetzt werden wenn die Qualität nicht ausreicht.

### Datenbank (NEU, gelöst)

PostgreSQL + pgvector als einzige DB statt SQLite + ChromaDB parallel. Vereinfacht den Stack, transaktionale Konsistenz zwischen Memory und Index.

### MQTT-Topic-Schema mit QoS

Konkrete Topic-Struktur und QoS-Levels in Phase 1 zu definieren. Vorab-Empfehlung:

- Perception-Stream: QoS 0 (verlustfrei nicht nötig, Echtzeit zählt)
- Behavior-Aktionen: QoS 1 (mindestens einmal)
- Memory-Writes: QoS 2 (exakt einmal)
- Safety-Heartbeats: QoS 1 + Last-Will-Message bei Disconnect

Konkrete Topic-Struktur in CLAUDE_CODE_GUIDELINES.md.

### Mechanik (Hardware-Phase)

- Servo-Typ: Dynamixel bevorzugt (Force/Torque-Feedback nativ)
- Anzahl Freiheitsgrade, Augen-System - offen
- Aus April-Analyse: Dynamixel als pragmatische Wahl

---

## 10. Datenfluss-Klassen (NEU)

Konkrete Klassifizierung wer welche Daten sehen darf:

| Datentyp | Lokal | Cloud-LLM | Backup |
|---|---|---|---|
| Roh-Audio | ✓ | ✗ | nur verschlüsselt lokal |
| Roh-Video | ✓ | ✗ | nur verschlüsselt lokal |
| Face-Embeddings | ✓ | ✗ | lokal |
| Speaker-Embeddings | ✓ | ✗ | lokal |
| Kinder-Sprachaufnahmen | ✓ | ✗ niemals | nur verschlüsselt lokal |
| STT-Transkripte | ✓ | ✓ (mit Sanitization) | lokal |
| PAD-Werte | ✓ | ✓ | lokal |
| FACS-AUs | ✓ | ✓ | lokal |
| Memory-Inhalte | ✓ | ✓ (kontextuell) | lokal |
| Aggregierte Reflections | ✓ | ✓ | lokal |

Sanitization-Gateway zwischen STT und Cloud-LLM:

- Entfernt Eigennamen wenn nicht relevant
- Reduziert Kinder-Äußerungen auf abstrakte Zusammenfassung
- Konfigurierbare Filter-Liste

---

## 11. Externe Wissens-/Datenquellen zum Einbinden

### Frei verfügbar

- **MediaPipe:** https://github.com/google/mediapipe
- **face_recognition:** https://github.com/ageitgey/face_recognition
- **Silero VAD:** https://github.com/snakers4/silero-vad
- **openWakeWord:** https://github.com/dscripka/openWakeWord
- **pyannote.audio:** https://github.com/pyannote/pyannote-audio
- **Faster-Whisper:** https://github.com/SYSTRAN/faster-whisper
- **Wav2Vec2-Emotion:** HuggingFace-Modelle verfügbar
- **AffectNet, EMOTIC, FER2013:** akademisch frei
- **HumanML3D:** 3D-Bewegungsdaten
- **AMASS Dataset:** Motion Capture
- **OpenFace 2.0** (als Referenz für FACS-Landmark-Mapping)
- **Colledanchise & Ögren (2018):** Open Access verfügbar
- **py_trees:** https://github.com/splintered-reality/py_trees

### Etablierte Bibliotheken (Python)

- `mediapipe`, `opencv-python`, `face_recognition`, `dlib`
- `silero-vad`, `openwakeword`, `faster-whisper`, `librosa`
- `pyannote.audio`, `speechbrain`
- `paho-mqtt`, `psycopg`, `pgvector`, `sqlalchemy`
- `pybullet`, `mujoco`, `numpy`, `scipy`
- `transformers`, `ollama`, `anthropic`
- `flask`, `fastapi`, `streamlit`
- `py_trees`, `pydantic`, `structlog`
- `pytest`, `hypothesis`, `pytest-asyncio`

### Konzeptuelle Frameworks

- **ROS2** als Option falls Projekt wächst
- **LangChain/LangGraph** für LLM-Workflows
- **Honcho** für User-Modeling (Reifegrad vor Einsatz prüfen)
- **mem0 / Letta** als Memory-Framework-Alternative

---

## 12. Erfolgs-Kriterien

### Phase 1 (Simulation) - Erfolg wenn

- Virtueller Avatar reagiert sichtbar auf simulierte Trigger
- MQTT-Architektur funktioniert mit reduzierten Features
- Erste Behavior-Regeln greifen ("morgens grüßen", "Termin nachfragen")
- Memory persistiert über Neustarts
- Bewegungen wirken nicht ruckartig (Jerk-Limiting bestätigt)
- LMA-Mapping-Tabelle als Konfigurationsdatei vorhanden
- Safety-Watchdog-Heartbeat läuft stabil
- Esprimo-Performance-Profiling abgeschlossen, Engpässe bekannt

### Phase 3 (Interpretation & Memory) - Erfolg wenn

- Personalisierte Baseline ist gelernt
- System erkennt Darius zuverlässig (visuell + akustisch via Speaker-ID)
- VA-Werte (+ heuristische Dominance) sind über Tage konsistent
- Müdigkeits-Erkennung trifft >80%
- Late Fusion Audio + Video funktioniert
- **Memory-Reflection-Loop produziert nach 7 Tagen sinnvolle Aggregat-Erkenntnisse**
- **Importance-Scoring filtert Trivialitäten aus dem Long-Term-Memory**

### Phase 4 (Konversation) - Erfolg wenn

- Reaktionssignal-Latenz <250ms gemessen (nicht nur "gefühlt")
- Interrupt-Verhalten funktioniert: User spricht → Roboter stoppt <100ms
- Turn-Taking-Cues werden erkannt und respektiert
- Konversation läuft natürlich, keine "toten" Phasen
- LLM-Tool-Calls werden korrekt validiert und ausgeführt
- Fallback bei Cloud-Ausfall funktioniert

### Phase 7 (Hardware) - Erfolg wenn

- Johnny 5 physisch existiert
- Bewegung wirkt nicht gruselig (LMA-Parametrisierung kalibriert)
- Safety-Layer mit echter Hardware getestet (Force-Limit-Trigger, E-Stop, Watchdog-Recovery)
- Mein Kind interagiert gerne mit Johnny - und versteht dass er eine Maschine ist
- System läuft ohne Babysitting

---

## 13. Was dieses Dokument NICHT ist

- **Keine fertige Spezifikation:** Wird mit jeder Session weiterentwickelt
- **Keine vollständige Liste:** Sicher fehlt etwas, wird ergänzt
- **Keine harten Versprechen:** Phasen können sich verschieben
- **Kein Produkt-Pitch:** Hobby-Projekt mit Forschungs-Charakter
- **Keine Code-Spezifikation:** konkrete Code-Patterns, Formeln und Anti-Patterns stehen in CLAUDE_CODE_GUIDELINES.md

---

## 14. Anweisungen für Claude Code/Cowork

Bei jeder neuen Session:

1. Dieses Dokument lesen (PROJECT_CONTEXT.md)
2. **CLAUDE_CODE_GUIDELINES.md lesen** für Code-Patterns und Formeln
3. Aktuelle Phase in `STATUS.md` checken
4. Aktive Module/Tasks in `TODO.md` ansehen
5. Bei Architektur-Entscheidungen: erst hier dokumentieren, dann implementieren
6. Bei Fehlern/Sackgassen: in `LESSONS_LEARNED.md` festhalten

Stil-Regeln (Details in CLAUDE_CODE_GUIDELINES.md):

- Python 3.11+
- Type Hints überall (Pydantic-Modelle bevorzugt)
- Docstrings im Google-Style
- Tests mit pytest + Hypothesis für Property-Based-Tests
- Logging via structlog (strukturierte JSON-Logs)
- Konfiguration via Pydantic-Settings + YAML/.env
- Containerisierung via Proxmox-LXC oder Docker-Compose
- Git: Feature-Branches, semantische Commits

Anti-Patterns vermeiden (Details in CLAUDE_CODE_GUIDELINES.md):

- Keine fest verdrahteten Magic-Numbers
- Keine direkten LLM-Calls in Inner-Loops
- Keine Synchron-Calls auf Hardware (immer async)
- Keine ungetesteten Mathematik-Implementierungen (FACS, Kalman, Bayes, PAD-Mapping, Jerk-Limiting, LMA-Mapping - immer Unit-Tests + Property-Based-Tests)
- Keine Vendor-Locks (LLM-Provider austauschbar)
- Keine rohen Landmark-Streams über MQTT (immer vorher reduzieren)
- Keine Aktor-Befehle ohne Safety-Layer-Validation
- Keine Cloud-Calls mit Klasse-A-Daten

---

## 15. Nachschlagewerk (vollständig)

### HRI & Soziale Robotik

- Breazeal (2002), Picard (1997), Mori (1970)
- Sidner et al. (2004, 2005), Mutlu et al. (2009)
- Bohus & Horvitz (2009), Rich et al. (2010)
- Castellano et al. (2009)
- Takayama et al. (2011) - Disney-Prinzipien praktisch
- Sharkey & Sharkey (2010) - Ethik
- Turkle (2011) - Skepsis

### Turn-Taking

- Sacks, Schegloff & Jefferson (1974)
- Duncan (1972)
- Stivers et al. (2009)
- Heldner & Edlund (2010)
- Skantze (2021)

### Emotion & Affekt

- Ekman & Friesen (1978) - FACS
- Plutchik (1980), Russell (1980)
- Mehrabian (1974), Russell & Mehrabian (1977) - PAD
- Barrett (2017) - Constructed Emotion
- Posner et al. (2005), Bradley & Lang (1994)
- Ortony, Clore & Collins (1988) - OCC
- Cowen & Keltner (2017) - 27 categories
- Scherer (2009) - Component Process
- Mollahosseini et al. (2017) - AffectNet

### Multimodale Fusion

- Baltrusaitis, Ahuja & Morency (2019)
- Poria et al. (2017), Soleymani et al. (2012)
- Zadeh et al. (2017), Tsai et al. (2019)
- Liang et al. (2022)

### Gesichtsanalyse & AU-Mapping

- Tian et al. (2001)
- Baltrusaitis et al. (2018) - OpenFace 2.0
- Martinez et al. (2017) - Survey

### Aufmerksamkeit / Müdigkeit

- Wierwille et al. (1994), Dinges & Grace (1998) - PERCLOS

### Gedächtnis

- Tulving (1972, 1985), Ebbinghaus (1885)
- Anderson & Milson (1989)
- Park et al. (2023) - Generative Agents
- Packer et al. (2023) - MemGPT

### Bewegung & Animation

- Thomas & Johnston (1981) - Disney
- Laban (1960), Zhao (2001), Nakata et al. (2002)
- Knight & Simmons (2014)
- Chi et al. (2000) - EMOTE
- Camurri et al. (2003) - EyesWeb
- Clavet (2016) - Motion Matching
- Henter et al. (2020) - MoGlow

### Behavior Trees

- Colledanchise & Ögren (2018)
- Millington & Funge (2009)

### Audio

- Eyben et al. (2010) - eGeMAPS
- Bredin et al. (2020) - pyannote.audio
- Desplanques et al. (2020) - ECAPA-TDNN
- Schneider et al. (2019), Baevski et al. (2020) - Wav2Vec/Wav2Vec2

### LLM-Agentik

- Yao et al. (2022) - ReAct
- Schick et al. (2023) - Toolformer

### Safety & Ethik

- ISO 13482:2014
- Sharkey & Sharkey (2010), Turkle (2011)
- Breazeal (2002)

### ML-Engineering

- Sculley et al. (2015) - Hidden Technical Debt
- Breck et al. (2017) - ML Test Score

### Architektur-Inspiration

- LEAP-71 / Noyron - Computational Engineering
- Kahneman (2011) - System 1/2 als didaktische Analogie

---

**Version 4.0** - Mai 2026, nach zweitem wissenschaftlichem Review

**Änderungen ggü. v3:**

- Memory-Modul um Generative-Agents-Patterns erweitert (Park et al. 2023): Memory Stream, Importance Scoring, Reflection-Loop, kombinierter Retrieval Score
- Safety-Layer als eigenständiges Modul 7 ergänzt (ISO 13482, Watchdog, Geofencing, Force-Limits)
- Privacy/Local-First-Sektion mit Datenfluss-Klassen ergänzt
- Speaker Identification ergänzt (pyannote.audio + ECAPA-TDNN)
- Wake-Word-Strategie ergänzt (openWakeWord)
- Turn-Taking-Fundament erweitert (Sacks/Schegloff 1974, Heldner & Edlund 2010)
- Konkrete Latenz-Targets statt vager "<1.5s"-Aussage (Reaktionssignal <250ms, Interrupt <100ms)
- LLM-Tool-Use-Orchestration als ReAct-Pattern explizit
- DB-Architektur: PostgreSQL + pgvector statt SQLite + ChromaDB
- Wahrnehmungs-Robustheits-Sektion (Beleuchtung, Verdeckung, Distanz)
- Zeitplanung realistischer kalibriert (6-7 Monate für Sim)
- LEAP-71-Analogie mit Sim-to-Real-Gap-Kalibrierung
- Verweis auf separate CLAUDE_CODE_GUIDELINES.md für Code-Spezifika
- Nachschlagewerk vollständig aktualisiert
