# Claude Code Guidelines - Johnny 5 Companion

> **Zweck:** Code-spezifische Patterns, konkrete Formeln, Anti-Pattern-Beispiele, Fehlervermeidung. Ergänzt PROJECT_CONTEXT.md v4. Wird von Claude Code bei jeder Session zusammen mit dem Kontext gelesen.
>
> **Zielgruppe:** Claude Code/Cowork beim Implementieren. Nicht für Konzept-Diskussionen, sondern für "wie schreibe ich diesen Code richtig".
>
> **Version:** 1.0, Mai 2026
>
> **Maxime:** Korrektheit > Lesbarkeit > Performance > Cleverness

---

## 1. Engineering-Grundprinzipien

### Was diesem Projekt am häufigsten kaputt geht

1. **Floating-Point-Vergleiche mit `==`** - bei PAD-Werten, Trajektorien, Cosine-Similarity. Immer `math.isclose` oder `numpy.isclose`.
2. **Numerische Instabilität in Filtern** - Kalman ohne Symmetrie-Erzwingung, EWMA ohne Bounds-Check.
3. **MQTT-Reconnect-Logik fehlt** - Broker neustartet, alle Subscriber sind tot.
4. **Async-Tasks ohne `try/finally`** - Cleanup wird nicht ausgeführt, Sockets bleiben offen.
5. **Mutable Default Arguments** - `def f(x=[])` ist ein Klassiker.
6. **GPU-Memory-Leaks** - PyTorch-Tensoren werden nicht freigegeben, OOM nach Stunden.
7. **Timestamps in lokaler Zeit** - UTC immer, sonst Chaos bei Sommerzeit-Umstellung.
8. **Vector-Embedding-Modell wird inkonsistent verwendet** - mal `all-MiniLM-L6-v2`, mal `multi-qa-mpnet` - Embeddings werden inkompatibel.
9. **MediaPipe-Modelle werden pro Frame geladen** - katastrophale Performance.
10. **LLM-Token-Budget wird nicht getrackt** - Cloud-Rechnung am Monatsende.

Diese zehn Punkte verursachen 80% der Probleme in solchen Systemen.

### Stil-Regeln (Kurzfassung)

- Python 3.11+, alles Type-annotiert
- Pydantic v2 für Validation an Modul-Grenzen
- structlog für strukturiertes JSON-Logging
- pytest + Hypothesis für Tests
- async/await für I/O, threading nur wenn nötig
- Keine Magic Numbers, alles benannt mit Konstanten oder Config
- UTC für alle Timestamps, niemals naive datetime

---

## 2. Type-Safety mit Pydantic

### Modul-Grenzen sind Pydantic-Modelle

Jedes MQTT-Topic, jeder Service-Call, jede Config-Datei wird über Pydantic-Modelle validiert. Das ist die Stelle wo Fehler auftauchen sollen - nicht 50 Aufrufe später.

```python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Literal

class PADVector(BaseModel):
    """Pleasure-Arousal-Dominance Vektor.
    
    Alle Werte in [-1, 1]. Dominance ist heuristisch wenn aus AffectNet.
    """
    valence: float = Field(ge=-1.0, le=1.0)
    arousal: float = Field(ge=-1.0, le=1.0)
    dominance: float = Field(ge=-1.0, le=1.0)
    dominance_source: Literal["measured", "heuristic", "llm"] = "heuristic"
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)

class PerceptionFaceEvent(BaseModel):
    """MQTT-Event vom Perception-Layer.
    
    Topic: perception/face/{person_id}
    """
    timestamp: datetime  # UTC
    person_id: str
    position_xyz: tuple[float, float, float]
    head_pose: tuple[float, float, float]  # pitch, yaw, roll in rad
    gaze_vector: tuple[float, float, float]
    pad: PADVector
    perclos: float = Field(ge=0.0, le=1.0)
    attention: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    
    @field_validator("timestamp")
    @classmethod
    def must_be_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("timestamp must be timezone-aware UTC")
        return v
```

### Konfiguration via Pydantic Settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class PerceptionSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="JOHNNY5_PERCEPTION_",
        env_file=".env",
        env_file_encoding="utf-8",
    )
    
    mediapipe_min_detection_confidence: float = 0.7
    mediapipe_min_tracking_confidence: float = 0.5
    pad_update_min_confidence: float = 0.7  # darunter kein PAD-Update
    pad_update_max_distance_m: float = 2.0  # FACS unzuverlässig
    
    mqtt_host: str = "localhost"
    mqtt_port: int = 1883
    mqtt_qos_perception: int = 0
    
    whisper_model_size: Literal["tiny", "base", "small", "medium", "large"] = "base"
    whisper_compute_type: Literal["int8", "float16", "float32"] = "float16"
```

---

## 3. Logging-Patterns

### structlog statt print/logging

```python
import structlog

log = structlog.get_logger()

# Schlecht
print(f"PAD computed: {pad}")

# Gut
log.info(
    "pad_computed",
    person_id=person_id,
    valence=pad.valence,
    arousal=pad.arousal,
    confidence=pad.confidence,
    fusion_mode="late_fusion_audio_video",
)
```

Vorteil: maschinell parsebar, durchsuchbar, Dashboards können direkt darauf aufbauen.

### Logging-Setup einmal pro Service

```python
import structlog
import logging

def configure_logging(service_name: str, log_level: str = "INFO") -> None:
    """Standardisiertes Logging für alle Services. Einmal beim Start aufrufen."""
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(log_level)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    structlog.contextvars.bind_contextvars(service=service_name)
```

### Sensitive Daten niemals loggen

Klasse-A-Daten (Roh-Audio, Kinder-Sprachaufnahmen) werden nie geloggt. Auch nicht Transkripte mit Kindernamen. Bei Verstoß: Sanitization-Filter im Log-Processor.

---

## 4. MQTT-Patterns

### Topic-Schema-Konvention

Hierarchisch, Wildcards möglich, lowercase, snake_case:

```
perception/face/{person_id}              # QoS 0
perception/audio/speaker                  # QoS 0
perception/audio/vad                      # QoS 0
perception/audio/wake_word                # QoS 1

interpretation/pad/{person_id}            # QoS 0
interpretation/engagement/{person_id}     # QoS 0
interpretation/turn_taking/{person_id}    # QoS 0

memory/observation                        # QoS 2
memory/reflection                         # QoS 2

behavior/decision                         # QoS 1
behavior/heartbeat                        # QoS 1

action/motion/request                     # QoS 1
action/motion/status                      # QoS 1
action/speech/request                     # QoS 1
action/backchannel                        # QoS 0

safety/heartbeat                          # QoS 1, Will-Message
safety/verdict                            # QoS 2
safety/e_stop                             # QoS 2

system/health/{service_name}              # QoS 1
```

### MQTT-Client mit Reconnect

Reconnect-Logik ist Pflicht. Mosquitto-Restarts oder Netzwerk-Hänger dürfen das System nicht töten.

```python
import asyncio
import aiomqtt
import structlog

log = structlog.get_logger()

async def mqtt_publisher_with_reconnect(
    host: str,
    port: int,
    topic: str,
    payload_queue: asyncio.Queue,
    reconnect_interval: float = 5.0,
) -> None:
    """Publisher mit automatischem Reconnect.
    
    Bricht nur ab wenn der Task explizit gecancelt wird.
    """
    while True:
        try:
            async with aiomqtt.Client(host, port) as client:
                log.info("mqtt_connected", host=host, port=port)
                while True:
                    payload = await payload_queue.get()
                    await client.publish(topic, payload, qos=1)
        except aiomqtt.MqttError as e:
            log.warning("mqtt_disconnected", error=str(e), retry_in=reconnect_interval)
            await asyncio.sleep(reconnect_interval)
        except asyncio.CancelledError:
            log.info("mqtt_publisher_cancelled")
            raise
```

### Last-Will-Message für Safety

Safety-Heartbeat-Service nutzt MQTT-Last-Will. Wenn der Client unsauber stirbt, sendet der Broker automatisch eine Status-Nachricht. Andere Services hören diese und gehen in den passiven Zustand.

```python
async with aiomqtt.Client(
    host,
    port,
    will=aiomqtt.Will(
        topic="safety/heartbeat",
        payload=b'{"status": "dead"}',
        qos=1,
        retain=True,
    ),
) as client:
    ...
```

---

## 5. Async-Patterns

### asyncio für I/O, threading nur für CPU-gebunden

- MQTT, HTTP, DB-Queries → asyncio
- MediaPipe-Inferenz, Whisper-Inferenz → threading mit `asyncio.to_thread()` damit der Event-Loop nicht blockiert
- Numpy-Berechnungen → meistens schnell genug für synchronen Aufruf, ansonsten `asyncio.to_thread`

### Cleanup mit try/finally

```python
async def perception_loop(camera, mqtt_client):
    try:
        async for frame in camera.frames():
            features = await process_frame(frame)
            await mqtt_client.publish("perception/face", features.json())
    except asyncio.CancelledError:
        log.info("perception_loop_cancelled")
        raise
    finally:
        await camera.close()
        log.info("perception_loop_cleanup_done")
```

### Niemals naked except

```python
# Schlecht
try:
    ...
except:
    pass

# Schlecht (CancelledError wird verschluckt)
try:
    ...
except Exception:
    log.warning("something_failed")

# Gut
try:
    ...
except asyncio.CancelledError:
    raise
except SpecificError as e:
    log.warning("specific_error", error=str(e))
    # geziehlte Recovery
```

### Concurrent Tasks mit TaskGroup (Python 3.11+)

```python
async def main():
    async with asyncio.TaskGroup() as tg:
        tg.create_task(perception_loop())
        tg.create_task(behavior_loop())
        tg.create_task(safety_heartbeat())
    # bei Exception in einer Task werden andere automatisch gecancelt
```

---

## 6. Numerische Patterns

### Floating-Point-Vergleiche

```python
import math

# Schlecht
if pad.valence == 0.5:
    ...

# Gut
if math.isclose(pad.valence, 0.5, abs_tol=1e-6):
    ...

# Für Arrays
import numpy as np
if np.allclose(pad_history, expected, atol=1e-6):
    ...
```

### Clipping in [-1, 1] - PAD-Werte

```python
def clip_pad(value: float, lo: float = -1.0, hi: float = 1.0) -> float:
    """Niemals Pydantic-Validation für interne Updates umgehen."""
    return max(lo, min(hi, value))
```

### EWMA - Exponentially Weighted Moving Average

Konkrete Formel und Parameter:

```python
def ewma_update(prev: float, new: float, alpha: float = 0.2) -> float:
    """EWMA Update.
    
    alpha = 0.1: sehr stabil, träge (~10 Samples Effekt)
    alpha = 0.2: ausgewogen (Default)
    alpha = 0.3: reaktiv, weniger geglättet
    alpha = 0.5: kaum noch Smoothing
    """
    if not 0.0 < alpha < 1.0:
        raise ValueError(f"alpha must be in (0, 1), got {alpha}")
    return alpha * new + (1.0 - alpha) * prev
```

Für PAD: `alpha=0.15` ist ein guter Startwert. Schnell genug um auf Stimmungswechsel zu reagieren, stabil genug um nicht zu flattern.

### Kalman-Filter (vereinfacht, 1D pro Dimension)

Für PAD ist ein gekoppelter Kalman-Filter overkill. Drei unabhängige 1D-Filter (V, A, D) reichen.

```python
import numpy as np
from dataclasses import dataclass

@dataclass
class KalmanState:
    """1D Kalman-Filter Zustand für eine einzelne Variable."""
    x: float       # geschätzter Wert
    P: float       # Schätzung-Unsicherheit
    Q: float = 1e-4  # Prozess-Rauschen (wie schnell ändert sich PAD?)
    R: float = 0.05  # Mess-Rauschen (wie verlässlich ist die Messung?)

def kalman_update(state: KalmanState, measurement: float, 
                  measurement_confidence: float = 1.0) -> KalmanState:
    """Standard 1D Kalman-Update.
    
    measurement_confidence skaliert R: niedrige Confidence → höheres R.
    """
    # Predict
    x_pred = state.x
    P_pred = state.P + state.Q
    
    # Update mit confidence-adjustiertem R
    R_eff = state.R / max(measurement_confidence, 0.01)
    K = P_pred / (P_pred + R_eff)
    x_new = x_pred + K * (measurement - x_pred)
    P_new = (1 - K) * P_pred
    
    return KalmanState(x=x_new, P=P_new, Q=state.Q, R=state.R)
```

**Wichtig:** Die Werte `Q=1e-4` und `R=0.05` sind Startpunkte. Sie müssen empirisch kalibriert werden anhand realer PAD-Sequenzen. Falsche Verhältnisse machen den Filter entweder zu träge oder zu zappelig.

### S-Curve Trajectories mit Jerk-Limit

Für eine vollständige 7-Phasen-S-Curve braucht es eine Bibliothek. Für den Anfang reicht ein Trapez-Profil mit Jerk-Limit-Approximation. Aber: niemals ungetestete Eigenimplementierung in den Aktor-Pfad.

```python
import numpy as np

def s_curve_position(t: float, t_total: float, 
                     start: float, end: float) -> float:
    """Smoothstep-basierte Position für S-Curve-Approximation.
    
    Nicht jerk-optimal aber jerk-limitiert (keine plötzlichen Sprünge).
    Für produktive Servo-Steuerung: ruckel/trinamic-curves-library nutzen.
    """
    if t <= 0:
        return start
    if t >= t_total:
        return end
    
    # Normalisiert in [0, 1]
    u = t / t_total
    # Quintic Smoothstep: 0 erste und zweite Ableitung an Rändern
    smooth = u * u * u * (u * (u * 6 - 15) + 10)
    return start + (end - start) * smooth
```

Für reale Servo-Steuerung später eine etablierte Library verwenden (z.B. `ruckig` für jerk-optimale Online-Trajektorien). Nicht selbst implementieren ohne Tests.

### Cosine Similarity (für Memory-Retrieval)

```python
import numpy as np

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine Similarity zwischen zwei Vektoren.
    
    Returns 1.0 für identische Richtung, 0.0 für orthogonal, -1.0 für entgegengesetzt.
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-10 or norm_b < 1e-10:
        return 0.0  # nicht NaN
    return float(np.dot(a, b) / (norm_a * norm_b))
```

**Hinweis:** pgvector kann das nativ via `<=>` Operator. Eigene Implementierung nur für Spezialfälle.

---

## 7. Konkrete Formeln (Modul-spezifisch)

### 7.1 PERCLOS

```python
from collections import deque
from datetime import datetime, timedelta

class PERCLOSCalculator:
    """Percentage of Eye Closure in einem Sliding-Window.
    
    Standard nach Wierwille et al. (1994):
    PERCLOS = Anteil der Zeit in dem das Auge zu mehr als 70-80% geschlossen ist
    Schwellenwert >0.15 (15%) gilt als Müdigkeitsindikator.
    """
    
    def __init__(self, window_seconds: float = 60.0, 
                 closure_threshold: float = 0.7):
        self.window = timedelta(seconds=window_seconds)
        self.closure_threshold = closure_threshold
        # (timestamp, is_closed) Paare
        self.samples: deque[tuple[datetime, bool]] = deque()
    
    def add_sample(self, timestamp: datetime, ear: float) -> None:
        """ear = Eye Aspect Ratio. Niedrig = geschlossen."""
        # EAR < 0.2 typisch geschlossen, >0.3 offen
        is_closed = ear < (1.0 - self.closure_threshold) * 0.3
        self.samples.append((timestamp, is_closed))
        self._prune(timestamp)
    
    def _prune(self, now: datetime) -> None:
        cutoff = now - self.window
        while self.samples and self.samples[0][0] < cutoff:
            self.samples.popleft()
    
    def value(self) -> float:
        if not self.samples:
            return 0.0
        closed = sum(1 for _, c in self.samples if c)
        return closed / len(self.samples)
```

### 7.2 Importance Score (Memory)

Zwei Varianten - LLM-bewertet und heuristisch. LLM ist genauer aber teurer.

```python
async def importance_score_llm(content: str, llm_client) -> int:
    """LLM bewertet 1-10. Park et al. 2023.
    
    Prompt-Pattern aus dem Generative-Agents-Paper:
    """
    prompt = (
        "On the scale of 1 to 10, where 1 is purely mundane "
        "(e.g., brushing teeth, making bed) and 10 is "
        "extremely poignant (e.g., a break up, college acceptance), "
        f"rate the likely poignancy of the following piece of memory.\n"
        f"Memory: {content}\n"
        f"Rating: <fill in>"
    )
    response = await llm_client.complete(prompt, max_tokens=5)
    try:
        score = int(response.strip().split()[0])
        return max(1, min(10, score))
    except (ValueError, IndexError):
        log.warning("importance_parse_failed", response=response)
        return 5  # neutraler Default

def importance_score_heuristic(content: str, 
                               emotional_intensity: float = 0.0,
                               mention_count: int = 0,
                               keywords: set[str] | None = None) -> int:
    """Heuristik als Fallback wenn LLM nicht verfügbar.
    
    Grobe Approximation. Sollte primär als Fallback dienen.
    """
    score = 3.0  # Basis
    
    # Emotionale Intensität (PAD-Magnitude)
    score += emotional_intensity * 3.0
    
    # Wiederholte Erwähnung des Themas
    score += min(mention_count, 3) * 0.5
    
    # Schlüsselwörter (Familie, Tod, Job, Gesundheit etc.)
    high_value_keywords = {
        "familie", "kind", "vater", "mutter", "tod", "krank", 
        "job", "geboren", "gestorben", "geschieden", "geheiratet",
    }
    if keywords:
        score += len(keywords & high_value_keywords) * 1.5
    
    return max(1, min(10, round(score)))
```

### 7.3 Retrieval Score (Memory)

Nach Park et al. 2023:

```python
import math
from datetime import datetime

def retrieval_score(
    memory_timestamp: datetime,
    memory_last_accessed: datetime,
    memory_importance: int,
    query_embedding: np.ndarray,
    memory_embedding: np.ndarray,
    now: datetime,
    decay_rate_per_hour: float = 0.99,
    alpha_recency: float = 1.0,
    alpha_importance: float = 1.0,
    alpha_relevance: float = 1.0,
) -> float:
    """Kombinierter Retrieval-Score.
    
    Alle drei Komponenten werden auf [0, 1] normalisiert,
    dann gewichtet summiert.
    
    decay_rate_per_hour = 0.99 bedeutet:
    - nach 1 Tag (24h): recency = 0.99^24 ≈ 0.79
    - nach 1 Woche: ≈ 0.19
    - nach 1 Monat: ≈ 5e-4
    """
    # Recency: Zeit seit letztem Zugriff (nicht Erstellung!)
    hours_since_access = (now - memory_last_accessed).total_seconds() / 3600
    recency = decay_rate_per_hour ** hours_since_access
    
    # Importance: 1-10 → 0-1
    importance_norm = (memory_importance - 1) / 9.0
    
    # Relevance: Cosine Similarity zur Query, von [-1,1] auf [0,1] gemappt
    sim = cosine_similarity(query_embedding, memory_embedding)
    relevance = (sim + 1.0) / 2.0
    
    return (
        alpha_recency * recency +
        alpha_importance * importance_norm +
        alpha_relevance * relevance
    )
```

**Tuning:** Park et al. nutzen alle alphas = 1.0 als Startpunkt. Wenn das Memory zu viele alte Trivialitäten zurückgibt, alpha_importance erhöhen. Wenn es zu themenfremd ist, alpha_relevance erhöhen.

### 7.4 PAD-zu-LMA-Mapping

Konkrete Heuristik als Startpunkt. Wertebereich für LMA-Faktoren: [-1, 1] wobei -1 die eine Extremausprägung ist, +1 die andere.

```python
from dataclasses import dataclass

@dataclass
class LMAFactors:
    weight: float    # -1 leicht, +1 schwer
    space: float     # -1 indirekt/kurvig, +1 direkt/gerade
    time: float      # -1 nachhaltig/langsam, +1 plötzlich/schnell
    flow: float      # -1 gebunden/kontrolliert, +1 frei/locker

def pad_to_lma(pad: PADVector) -> LMAFactors:
    """Heuristisches Mapping PAD → LMA.
    
    Quellen: Nakata 2002, Knight & Simmons 2014.
    Empirische Kalibrierung in Phase 5 zwingend.
    """
    v = pad.valence
    a = pad.arousal
    d = pad.dominance
    
    # Weight: niedrige Valence + hohe Arousal = schwer (Ärger)
    #         hohe Valence = leicht (Freude)
    weight = -v * 0.6 + (a if v < 0 else 0) * 0.4
    weight = max(-1.0, min(1.0, weight))
    
    # Space: hohe Dominance = direkt
    space = d * 0.8
    space = max(-1.0, min(1.0, space))
    
    # Time: hohe Arousal = plötzlich
    time = a * 0.9
    time = max(-1.0, min(1.0, time))
    
    # Flow: hohe Valence + niedrige Dominance = frei
    #       niedrige Valence + hohe Dominance = gebunden
    flow = v * 0.5 - d * 0.3
    flow = max(-1.0, min(1.0, flow))
    
    return LMAFactors(weight=weight, space=space, time=time, flow=flow)

def lma_to_servo_params(lma: LMAFactors, base_speed: float = 1.0,
                       base_jerk: float = 1.0) -> dict:
    """LMA → konkrete Servo-Steuerungsparameter.
    
    Werte sind Multiplikatoren auf Basis-Werte des Servos.
    """
    return {
        # Weight schwer → höhere Jerk-Limits (kantigere Bewegung)
        "jerk_multiplier": 1.0 + lma.weight * 0.5,
        # Space direkt → keine Pfad-Krümmung
        "path_curvature": max(0.0, -lma.space) * 0.3,
        # Time plötzlich → höhere Beschleunigung
        "acceleration_multiplier": 1.0 + lma.time * 0.7,
        # Flow frei → weniger straffe S-Curves
        "smoothing_factor": 0.5 + lma.flow * 0.3,
        "speed_multiplier": base_speed * (1.0 + lma.time * 0.3),
    }
```

### 7.5 Late Fusion für Multimodale PAD

```python
def fuse_pad(
    pad_video: PADVector | None,
    pad_audio: PADVector | None,
    vad_active: bool,
) -> PADVector | None:
    """Late Fusion für PAD aus Video und Audio.
    
    VAD-abhängig gewichtet. Bei Widersprüchen wird ein Konfidenz-Penalty
    angewendet aber nicht weggemittelt.
    """
    if pad_video is None and pad_audio is None:
        return None
    if pad_video is None:
        return pad_audio
    if pad_audio is None:
        return pad_video
    
    if vad_active:
        w_audio = 0.6
        w_video = 0.4
    else:
        # Audio nicht relevant (keine Sprache aktiv)
        return pad_video
    
    # Widerspruchs-Check: Valence-Diskrepanz >0.5 ist suspekt
    valence_disagreement = abs(pad_video.valence - pad_audio.valence)
    confidence_penalty = max(0.0, valence_disagreement - 0.5) * 0.5
    
    fused = PADVector(
        valence=w_audio * pad_audio.valence + w_video * pad_video.valence,
        arousal=w_audio * pad_audio.arousal + w_video * pad_video.arousal,
        dominance=w_audio * pad_audio.dominance + w_video * pad_video.dominance,
        dominance_source="heuristic",
        confidence=min(pad_video.confidence, pad_audio.confidence) - confidence_penalty,
    )
    
    # Widerspruch als Feature für LLM-Layer separat senden
    if valence_disagreement > 0.5:
        log.info(
            "modality_disagreement",
            video_valence=pad_video.valence,
            audio_valence=pad_audio.valence,
            disagreement=valence_disagreement,
        )
    
    return fused
```

---

## 8. Memory-Implementation

### PostgreSQL Schema (pgvector)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memory_stream (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(32) NOT NULL,  -- observation, reflection, plan
    person_id VARCHAR(64),
    content TEXT NOT NULL,
    importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 10),
    embedding vector(384),  -- all-MiniLM-L6-v2 Dimension
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX memory_stream_timestamp_idx ON memory_stream (timestamp DESC);
CREATE INDEX memory_stream_person_idx ON memory_stream (person_id);
CREATE INDEX memory_stream_type_idx ON memory_stream (type);

-- HNSW Index für schnelle Vector-Suche
CREATE INDEX memory_stream_embedding_idx ON memory_stream 
    USING hnsw (embedding vector_cosine_ops);

-- Reflection-Triggers
CREATE TABLE reflection_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_reflection_at TIMESTAMP WITH TIME ZONE,
    importance_sum_since_reflection FLOAT DEFAULT 0.0,
    CHECK (id = 1)  -- singleton
);
INSERT INTO reflection_state (id) VALUES (1) ON CONFLICT DO NOTHING;
```

### Embedding-Modell konsistent halten

Embeddings sind nur untereinander vergleichbar wenn sie vom gleichen Modell stammen. Modell-Name in Config, niemals mischen:

```python
from sentence_transformers import SentenceTransformer

# Genau einmal pro Service laden
_EMBEDDING_MODEL: SentenceTransformer | None = None
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

def get_embedding_model() -> SentenceTransformer:
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        _EMBEDDING_MODEL = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _EMBEDDING_MODEL
```

Bei Modell-Wechsel: alle bestehenden Embeddings neu berechnen oder DB löschen. Mischen führt zu nutzlosen Retrieval-Scores.

### Reflection-Trigger

Nach Park et al. wird Reflection ausgelöst wenn die Summe der Importance-Scores seit letzter Reflection einen Schwellenwert überschreitet (Paper nennt 150 als Beispiel).

```python
REFLECTION_IMPORTANCE_THRESHOLD = 150.0

async def maybe_trigger_reflection(db, llm_client) -> bool:
    """Prüft ob Reflection nötig ist und führt sie ggf. aus.
    
    Wird periodisch aufgerufen (z.B. einmal pro Stunde) oder
    nach jedem wichtigen Memory-Write.
    """
    state = await db.fetch_reflection_state()
    if state.importance_sum_since_reflection < REFLECTION_IMPORTANCE_THRESHOLD:
        return False
    
    # Top 100 jüngste Observations laden
    recent = await db.fetch_recent_observations(limit=100)
    
    # LLM generiert 3 hochrangige Fragen
    questions_prompt = (
        "Given only the information below, what are 3 most salient "
        "high-level questions we can answer about the subjects in the "
        "statements?\n\n" +
        "\n".join(f"- {m.content}" for m in recent)
    )
    questions = await llm_client.complete(questions_prompt)
    
    # Für jede Frage: relevante Memories abrufen und Erkenntnis ableiten
    for question in parse_questions(questions):
        relevant = await db.retrieve_memories(query=question, limit=15)
        insight_prompt = (
            f"Statements about the subject:\n"
            + "\n".join(f"- {m.content}" for m in relevant)
            + f"\n\nWhat 5 high-level novel insights can you infer "
            f"from the above statements that are relevant to "
            f"answering the following question?\n{question}"
        )
        insights = await llm_client.complete(insight_prompt)
        
        for insight in parse_insights(insights):
            embedding = get_embedding_model().encode(insight)
            importance = await importance_score_llm(insight, llm_client)
            await db.write_memory(
                type="reflection",
                content=insight,
                importance=importance,
                embedding=embedding,
            )
    
    await db.reset_reflection_state()
    return True
```

---

## 9. Safety-Patterns

### Watchdog-Heartbeat

```python
import asyncio
from datetime import datetime, timezone

class WatchdogHeartbeat:
    """Behavior-Engine sendet alle 100ms ein Heartbeat.
    
    Safety-Layer überwacht. Bei Ausbleiben >500ms → Passive Mode.
    """
    
    def __init__(self, mqtt_client, interval_s: float = 0.1):
        self.mqtt = mqtt_client
        self.interval = interval_s
        self._task: asyncio.Task | None = None
    
    async def start(self) -> None:
        self._task = asyncio.create_task(self._loop())
    
    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _loop(self) -> None:
        try:
            while True:
                await self.mqtt.publish(
                    "behavior/heartbeat",
                    payload=b'{"ts": "' + datetime.now(timezone.utc).isoformat().encode() + b'"}',
                    qos=1,
                )
                await asyncio.sleep(self.interval)
        except asyncio.CancelledError:
            raise

class WatchdogMonitor:
    """Im Safety-Service. Hört auf Heartbeats und triggert Passive Mode."""
    
    def __init__(self, timeout_s: float = 0.5):
        self.timeout = timeout_s
        self.last_heartbeat: datetime | None = None
        self._task: asyncio.Task | None = None
    
    def on_heartbeat(self, timestamp: datetime) -> None:
        self.last_heartbeat = timestamp
    
    async def monitor(self) -> None:
        while True:
            await asyncio.sleep(0.1)
            if self.last_heartbeat is None:
                continue
            age = (datetime.now(timezone.utc) - self.last_heartbeat).total_seconds()
            if age > self.timeout:
                log.error("watchdog_timeout", age_s=age)
                await self.trigger_passive_mode()
                self.last_heartbeat = None  # nicht erneut feuern bis nächster HB
    
    async def trigger_passive_mode(self) -> None:
        """Alle Aktoren in sicheren Zustand."""
        ...
```

### Circuit Breaker für Cloud-LLM

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"      # normaler Betrieb
    OPEN = "open"          # blockiert wegen Fehlern
    HALF_OPEN = "half_open"  # testet Recovery

class CircuitBreaker:
    """Schützt vor Cascading Failures bei Cloud-Ausfällen."""
    
    def __init__(self, failure_threshold: int = 5, 
                 recovery_timeout_s: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout_s
        self.failure_count = 0
        self.last_failure_time: float | None = None
        self.state = CircuitState.CLOSED
    
    def call_allowed(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if (self.last_failure_time and 
                time.time() - self.last_failure_time > self.recovery_timeout):
                self.state = CircuitState.HALF_OPEN
                log.info("circuit_breaker_half_open")
                return True
            return False
        # HALF_OPEN: einen Test-Call erlauben
        return True
    
    def on_success(self) -> None:
        if self.state == CircuitState.HALF_OPEN:
            log.info("circuit_breaker_closed")
        self.state = CircuitState.CLOSED
        self.failure_count = 0
    
    def on_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            if self.state != CircuitState.OPEN:
                log.warning("circuit_breaker_open", failures=self.failure_count)
            self.state = CircuitState.OPEN
```

Bei offenem Circuit: lokales LLM-Fallback verwenden, oder regelbasierte Antwort.

### Token-Budget für LLM-Calls

```python
class TokenBudget:
    """Pro-Tag-Token-Limit für Cloud-LLM-Calls."""
    
    def __init__(self, daily_limit: int):
        self.daily_limit = daily_limit
        self.used_today = 0
        self.reset_date = datetime.now(timezone.utc).date()
    
    def can_spend(self, tokens: int) -> bool:
        self._maybe_reset()
        return self.used_today + tokens <= self.daily_limit
    
    def record_spend(self, tokens: int) -> None:
        self._maybe_reset()
        self.used_today += tokens
        if self.used_today > self.daily_limit * 0.8:
            log.warning("token_budget_80pct", used=self.used_today)
    
    def _maybe_reset(self) -> None:
        today = datetime.now(timezone.utc).date()
        if today > self.reset_date:
            self.used_today = 0
            self.reset_date = today
```

---

## 10. LLM-Tool-Use-Patterns

### Tool-Schema (Anthropic-Format)

```python
TOOLS_SCHEMA = [
    {
        "name": "query_memory",
        "description": (
            "Search memory for relevant past observations or reflections. "
            "Use this to recall context about a person or topic before responding."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "person_id": {
                    "type": "string",
                    "description": "Person to query memories about, or 'general' for non-person memories",
                },
                "topic": {
                    "type": "string",
                    "description": "Natural language description of what to recall",
                },
                "limit": {
                    "type": "integer",
                    "default": 5,
                    "minimum": 1,
                    "maximum": 20,
                },
            },
            "required": ["person_id", "topic"],
        },
    },
    {
        "name": "log_observation",
        "description": "Save an observation to memory. Use for noteworthy events.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "person_id": {"type": "string"},
                "importance_hint": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "description": "Suggested importance 1-10; will be re-evaluated.",
                },
            },
            "required": ["content"],
        },
    },
    # ... weitere Tools
]
```

### Tool-Call-Validation

Niemals Tool-Calls vom LLM ungeprüft ausführen. Validation-Layer dazwischen:

```python
class ToolValidator:
    """Validiert LLM-Tool-Calls vor Ausführung."""
    
    def __init__(self):
        self.allowed_tools = {tool["name"] for tool in TOOLS_SCHEMA}
        self.safety_rules: dict[str, callable] = {
            "request_motion": self._validate_motion,
            "schedule_followup": self._validate_followup,
        }
    
    def validate(self, tool_name: str, tool_input: dict) -> tuple[bool, str]:
        if tool_name not in self.allowed_tools:
            return False, f"unknown_tool: {tool_name}"
        
        rule = self.safety_rules.get(tool_name)
        if rule:
            ok, reason = rule(tool_input)
            if not ok:
                return False, reason
        return True, ""
    
    def _validate_motion(self, inp: dict) -> tuple[bool, str]:
        # PAD-Werte in [-1, 1]?
        pad = inp.get("emotion_pad", {})
        for key in ("valence", "arousal", "dominance"):
            v = pad.get(key, 0.0)
            if not -1.0 <= v <= 1.0:
                return False, f"pad_{key}_out_of_range"
        # Dauer realistisch?
        dur = inp.get("duration", 1.0)
        if not 0.1 <= dur <= 10.0:
            return False, "duration_out_of_range"
        return True, ""
    
    def _validate_followup(self, inp: dict) -> tuple[bool, str]:
        # Termin in der Zukunft?
        ...
        return True, ""
```

---

## 11. ML-Engineering-Patterns

### Modell-Caching, niemals pro-Frame laden

```python
# Schlecht
def detect_faces(frame):
    detector = mediapipe.FaceMesh()  # pro Frame neu!
    return detector.process(frame)

# Gut
import mediapipe as mp
from functools import lru_cache

@lru_cache(maxsize=1)
def get_face_mesh() -> mp.solutions.face_mesh.FaceMesh:
    return mp.solutions.face_mesh.FaceMesh(
        max_num_faces=2,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5,
    )

def detect_faces(frame):
    return get_face_mesh().process(frame)
```

### GPU-Memory bei PyTorch

```python
import torch

# Wichtig: nach Inferenz Tensoren freigeben
with torch.inference_mode():
    output = model(input_tensor)
    result = output.cpu().numpy()
    del output
    torch.cuda.empty_cache()  # bei langen Loops sinnvoll
```

`inference_mode()` ist effizienter als `no_grad()`. Disabled view-tracking zusätzlich.

### Konfidenz-Propagierung

Konfidenz wird durch die ganze Pipeline durchgereicht, nicht ignoriert. Nachgelagerte Komponenten können sie zum Filtern nutzen.

```python
@dataclass
class FaceDetection:
    landmarks: np.ndarray
    confidence: float  # immer mitführen
    
def landmarks_to_pad(detection: FaceDetection) -> PADVector | None:
    if detection.confidence < 0.7:
        return None  # lieber nichts als Müll
    pad = compute_pad_from_landmarks(detection.landmarks)
    pad.confidence = detection.confidence
    return pad
```

### Reproduzierbarkeit

```python
import random
import numpy as np
import torch

def set_seeds(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    # Für vollständigen Determinismus (Performance-Kosten):
    # torch.backends.cudnn.deterministic = True
    # torch.backends.cudnn.benchmark = False
```

Nur in Test/Eval verwenden, nicht in Produktion - kostet Performance.

---

## 12. Test-Patterns

### Unit-Tests für Mathematik

Property-Based-Tests mit Hypothesis sind hier Gold wert.

```python
from hypothesis import given, strategies as st

@given(
    valence=st.floats(min_value=-1.0, max_value=1.0),
    arousal=st.floats(min_value=-1.0, max_value=1.0),
    dominance=st.floats(min_value=-1.0, max_value=1.0),
)
def test_pad_to_lma_in_range(valence, arousal, dominance):
    """LMA-Werte müssen immer in [-1, 1] sein, egal welche PAD-Eingabe."""
    pad = PADVector(valence=valence, arousal=arousal, dominance=dominance)
    lma = pad_to_lma(pad)
    assert -1.0 <= lma.weight <= 1.0
    assert -1.0 <= lma.space <= 1.0
    assert -1.0 <= lma.time <= 1.0
    assert -1.0 <= lma.flow <= 1.0

@given(
    prev=st.floats(min_value=-100, max_value=100, allow_nan=False),
    new=st.floats(min_value=-100, max_value=100, allow_nan=False),
    alpha=st.floats(min_value=0.01, max_value=0.99),
)
def test_ewma_bounds(prev, new, alpha):
    """EWMA Result liegt zwischen prev und new."""
    result = ewma_update(prev, new, alpha)
    lo, hi = min(prev, new), max(prev, new)
    assert lo - 1e-9 <= result <= hi + 1e-9
```

### Trajektorie-Tests

```python
@given(
    start=st.floats(min_value=-180, max_value=180),
    end=st.floats(min_value=-180, max_value=180),
    duration=st.floats(min_value=0.1, max_value=10.0),
)
def test_s_curve_monotonic_or_constant_jerk(start, end, duration):
    """S-Curve sollte keine plötzlichen Jerk-Sprünge haben.
    
    Numerische zweite Ableitung von Position sollte stetig sein.
    """
    n_samples = 100
    times = [duration * i / (n_samples - 1) for i in range(n_samples)]
    positions = [s_curve_position(t, duration, start, end) for t in times]
    
    # zweite Ableitung (diskret)
    dt = duration / (n_samples - 1)
    velocities = [(positions[i+1] - positions[i]) / dt 
                  for i in range(len(positions) - 1)]
    accelerations = [(velocities[i+1] - velocities[i]) / dt 
                     for i in range(len(velocities) - 1)]
    jerks = [(accelerations[i+1] - accelerations[i]) / dt 
             for i in range(len(accelerations) - 1)]
    
    # Maximum jerk sollte beschränkt sein
    max_jerk = max(abs(j) for j in jerks)
    expected_jerk_bound = 60 * abs(end - start) / duration**3
    assert max_jerk < expected_jerk_bound * 1.5
```

### Snapshot-Tests für ML-Outputs

```python
# Sammeln einer kleinen Test-Suite mit bekannten Videos/Audios
TEST_FIXTURES_DIR = Path("tests/fixtures")

def test_pad_extraction_stable_on_fixtures(snapshot):
    """Bei gleichen Test-Frames sollten PAD-Werte stabil sein.
    
    Bei Modell-Update Snapshot bewusst aktualisieren.
    """
    for fixture in (TEST_FIXTURES_DIR / "faces").glob("*.png"):
        frame = load_image(fixture)
        pad = extract_pad(frame)
        snapshot.assert_match(
            {"valence": round(pad.valence, 2), 
             "arousal": round(pad.arousal, 2)},
            f"pad_{fixture.stem}.json"
        )
```

### Mock-MQTT für Integrationstests

```python
import pytest
from aiomqtt import Client

@pytest.fixture
async def mqtt_broker():
    """Startet einen Test-Broker (oder nutzt einen Mock)."""
    # In CI: über docker-compose
    # Lokal: pytest-mosquitto Plugin
    ...
```

---

## 13. Performance & Profiling

### Was wann profilen

- **Phase 1 obligatorisch:** Esprimo Q958 Last-Profiling unter Volllast (alle Services aktiv).
- **Phase 2:** MediaPipe Frame-Rate, Whisper-Latenz pro Modellgröße.
- **Phase 4:** Reaktionssignal-Latenz End-to-End (VAD → Backchannel).

### py-spy für laufende Prozesse

```bash
# Sampling-Profile (kein Code-Change nötig)
py-spy record -o profile.svg --pid <PID> --duration 30
py-spy top --pid <PID>
```

Funktioniert auch in LXC ohne Modifikation.

### asyncio-Profiling

```python
import asyncio

# Slow-Callback-Detection
loop = asyncio.get_event_loop()
loop.slow_callback_duration = 0.1  # >100ms wird geloggt
```

### MQTT-Latenz-Messung

```python
async def measure_mqtt_roundtrip(client, topic_test: str, n: int = 100) -> dict:
    """Misst Publish-zu-Receive-Roundtrip-Latenz."""
    received_ts: list[float] = []
    
    async def listener():
        async for msg in client.messages:
            if msg.topic.matches(topic_test):
                received_ts.append(time.time())
    
    listener_task = asyncio.create_task(listener())
    await client.subscribe(topic_test)
    
    sent_ts = []
    for _ in range(n):
        sent_ts.append(time.time())
        await client.publish(topic_test, b"ping")
        await asyncio.sleep(0.01)
    
    await asyncio.sleep(0.5)
    listener_task.cancel()
    
    latencies = [r - s for s, r in zip(sent_ts, received_ts)]
    return {
        "mean_ms": sum(latencies) / len(latencies) * 1000,
        "max_ms": max(latencies) * 1000,
        "p99_ms": sorted(latencies)[int(len(latencies) * 0.99)] * 1000,
    }
```

Faustregel für lokales MQTT: <5ms Roundtrip. Bei >20ms ist was kaputt.

---

## 14. Common Pitfalls / Anti-Patterns

### Pitfall 1: Mutable Default Arguments

```python
# Schlecht
def add_observation(obs, history=[]):
    history.append(obs)
    return history
# history wird zwischen Aufrufen geteilt!

# Gut
def add_observation(obs, history=None):
    if history is None:
        history = []
    history.append(obs)
    return history
```

### Pitfall 2: Naive Datetime

```python
from datetime import datetime, timezone

# Schlecht
ts = datetime.now()  # lokale Zeit, keine TZ
ts = datetime.utcnow()  # UTC aber naive

# Gut
ts = datetime.now(timezone.utc)
# Oder:
from zoneinfo import ZoneInfo
ts = datetime.now(ZoneInfo("Europe/Berlin"))
```

### Pitfall 3: Synchroner Code in async-Funktion

```python
# Schlecht
async def process_frame(frame):
    result = mediapipe_detector.process(frame)  # blockiert Event-Loop!
    return result

# Gut
async def process_frame(frame):
    result = await asyncio.to_thread(mediapipe_detector.process, frame)
    return result
```

### Pitfall 4: f-string in Log-Calls

```python
# Schlecht
log.info(f"PAD: {pad}")  # f-string wird immer evaluiert, auch bei DEBUG-Disable

# Gut
log.info("pad_value", pad=pad.dict())  # Lazy evaluation
```

### Pitfall 5: Dict-Mutations während Iteration

```python
# Schlecht
for person_id, state in person_states.items():
    if state.expired():
        del person_states[person_id]  # RuntimeError

# Gut
expired = [pid for pid, s in person_states.items() if s.expired()]
for pid in expired:
    del person_states[pid]
```

### Pitfall 6: GPU-Tensoren leben länger als gedacht

```python
# Schlecht
results = []
for frame in frames:
    output = model(frame.to("cuda"))
    results.append(output)  # alle bleiben auf GPU!

# Gut
results = []
for frame in frames:
    with torch.inference_mode():
        output = model(frame.to("cuda"))
        results.append(output.cpu())  # zurück nach CPU
```

### Pitfall 7: pgvector-Index nicht für die richtige Distanz

pgvector kennt drei Operatoren:

- `<->` L2-Distanz (Euclidean)
- `<#>` Negative innere Produkt
- `<=>` Cosine-Distanz

Index muss für den verwendeten Operator passend angelegt sein:

```sql
-- Für Cosine
CREATE INDEX ON memory USING hnsw (embedding vector_cosine_ops);
-- Für L2
CREATE INDEX ON memory USING hnsw (embedding vector_l2_ops);
```

Falscher Index = Index wird nicht genutzt = volle Tabellen-Scans.

### Pitfall 8: MediaPipe-Frame-Format

MediaPipe erwartet RGB, OpenCV liefert BGR:

```python
import cv2
import mediapipe as mp

# Schlecht
frame_bgr = cv2.imread("face.jpg")
result = face_mesh.process(frame_bgr)  # falsche Farben → schlechte Detection

# Gut
frame_bgr = cv2.imread("face.jpg")
frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
result = face_mesh.process(frame_rgb)
```

### Pitfall 9: Whisper Audio-Format

Faster-Whisper erwartet 16kHz Mono Float32:

```python
import numpy as np
from faster_whisper import WhisperModel

# Audio aus Mikro kann 44100Hz Int16 sein
def prepare_audio_for_whisper(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    if sample_rate != 16000:
        # Resampling z.B. mit librosa oder scipy
        import librosa
        samples = librosa.resample(
            samples.astype(np.float32), 
            orig_sr=sample_rate, 
            target_sr=16000
        )
    if samples.dtype != np.float32:
        samples = samples.astype(np.float32) / 32768.0  # Int16 → Float32
    return samples
```

### Pitfall 10: Pydantic v1 vs v2

Pydantic v2 hat Breaking Changes ggü. v1. Bei diesem Projekt v2 verwenden:

```python
# v1 (alt)
class Foo(BaseModel):
    x: int
    @validator("x")
    def check_x(cls, v): return v
    class Config:
        allow_mutation = False

# v2 (neu)
class Foo(BaseModel):
    x: int
    @field_validator("x")
    @classmethod
    def check_x(cls, v: int) -> int: return v
    model_config = ConfigDict(frozen=True)
```

---

## 15. Modul-spezifische Tipps

### Perception-Modul

- MediaPipe-Modelle einmal beim Service-Start laden, niemals pro Frame
- Frame-Skipping bei Last: lieber jeden zweiten Frame mit voller Qualität als jeden mit niedriger
- Multi-Threading für parallele Streams (Video + Audio) statt async, da CPU-bound
- VAD vor Whisper schalten: spart 90%+ der STT-Aufrufe

### Behavior-Engine

- py_trees Tick-Rate: 10 Hz reicht für Behavior-Tree-Updates
- Behavior-Tree separat vom Hot-Path (Backchanneling) - der läuft in eigener Task
- Tool-Use-Latenz: erste Token vom LLM kommen oft <500ms, full response 1-3s. Backchanneling muss diese Lücke füllen.

### Memory-Service

- Reflection-Loop als eigene asynchrone Task, niemals im Hot-Path
- Embedding-Berechnung in Batch wenn möglich (mehrere Memories gleichzeitig)
- Importance-Scoring: bei jedem Memory-Write, aber asynchron - Write ist nicht-blockierend für Caller
- Periodisches Re-Indexing der pgvector-HNSW-Indizes wenn DB stark wächst

### Action-Modul

- Servo-Befehle gehen immer durch Safety-Layer
- Trajektorien-Planung NICHT im LLM-Output - das ist deterministisch und gehört in den Motion-Controller
- LMA-Mapping einmal pro Bewegungs-Sequenz, nicht pro Frame
- Backchanneling-Library als pre-baked Animationen, nicht live generiert

---

## 16. Erste Implementierungs-Checkliste (für Phase 1)

Bevor Code geschrieben wird:

1. [ ] Pydantic-Modelle für alle MQTT-Payloads definiert
2. [ ] Logging-Konfiguration für alle Services vorhanden
3. [ ] MQTT-Topic-Schema als Konstanten-Datei (`topics.py`)
4. [ ] Settings-Klassen pro Service mit defaults
5. [ ] Safety-Heartbeat-Loop als allererstes implementiert
6. [ ] Unit-Tests für alle Mathematik-Funktionen bevor sie verwendet werden
7. [ ] Property-Based-Tests für PAD-Bereichseinhaltung
8. [ ] CI/CD-Pipeline mit pytest + mypy

Bevor neuer Code committed wird:

1. [ ] Type-Hints überall (mypy --strict)
2. [ ] Docstring im Google-Style
3. [ ] Test für neue Logik (Unit oder Property)
4. [ ] Keine Magic Numbers (entweder Konstante oder Config)
5. [ ] Logging-Statements ohne f-strings
6. [ ] Async-Funktionen niemals synchrone blockierende Calls

---

## 17. Wenn unsicher

Bei Implementierungs-Unsicherheit (welche Library, wie strukturieren, welcher Parameter):

1. PROJECT_CONTEXT.md v4 nachschauen - die Entscheidung könnte schon dokumentiert sein.
2. Diese Datei nach Pattern suchen.
3. Wenn beides nichts ergibt: in `LESSONS_LEARNED.md` als offene Frage hinterlegen, defensivste Variante implementieren, Code-Kommentar `# TBD: <Begründung>` setzen.

Niemals raten und Code wegwerfen müssen. Lieber langsamer mit dokumentierter Unsicherheit als schnell mit verstecktem Tech-Debt.

---

**Version 1.0** - Mai 2026

**Nachgelagerte Versionen sollten ergänzen:**

- Konkrete Performance-Messwerte vom Esprimo Q958 nach Phase 1
- Konkrete Modellgrößen-Latenzen (Whisper, Wav2Vec) nach Phase 2-Benchmarking
- Beispiel-Tool-Use-Patterns aus echten LLM-Calls nach Phase 4
- Reale Behavior-Tree-Strukturen aus Phase 5
