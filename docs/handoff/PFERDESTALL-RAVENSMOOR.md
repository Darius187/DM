# Pferdestall Ravensmoor: Asset- und Gameplay-Vertrag

## Fertiger Asset-Stand

- Area: `stadt`
- Platz: `S2`
- Modell: `assets/houses/stable/medieval_stable_house_3d_runtime.glb`
- Manifest: `assets/houses/stable/medieval_stable_house_3d_runtime.json`
- Pferdeliste: `assets/horse/ravensmoor-horse-roster.json`
- `GEB3D_BOXEN` verweist bereits auf dieses Manifest. Die GLB wurde unter dem
  bestehenden Pfad ersetzt, daher ist keine weitere Platzierungszeile noetig.

## Historische Entscheidung

Der alte dreiboxige Wohnstall mit Kamin und fest eingebauten Pferden wurde
ersetzt. Der neue Bau orientiert sich an einem gedeckten Standstall des 14.
Jahrhunderts: vier schmale Staende, Holztrennwaende, Futterkrippen, Heuraufen,
fester Boden mit Entwaesserungsrinne und Heulager. Die niedrigen Fronttore sind
ein bewusstes Spielzugestaendnis, damit ein geparktes Pferd mit dem Kopf ueber
dem Tor sichtbar bleiben kann.

## Tuervertrag

- Personal/Futter: Manifest-Key `main`, Node `DOOR_STABLE_MAIN_HINGE`
- Pferd 1 bis 4: Manifest-Keys `stall_1` bis `stall_4`
- Geschlossen: Frame 1
- Offen: Frame 30
- Alle fuenf Tueren und Tore schlagen nach aussen in den Vorbereich auf.
- Die vier Pferdeoeffnungen sind im offenen Zustand ohne feste Schwelle und
  ohne Fassadenriegel frei. Einzelne flache Erdauffahrten verbinden den
  Vorbereich mit dem Stallboden; nur das bewegliche Torblatt liegt in der
  Oeffnung.
- Pferde duerfen das Tor erst ab Tuerzustand `0.82` passieren.
- Die Trigger `TRIGGER_STALL_1` bis `TRIGGER_STALL_4` liegen direkt in den
  Pferdeoeffnungen. Die dynamische Tuerkollision bleibt im geschlossenen Zustand
  aktiv und wird beim Oeffnen freigegeben.

## Parkvertrag

Jeder Stand besitzt drei Marker mit derselben Nummer:

- `APPROACH_STALL_n`: Ziel vor dem Tor
- `PARK_STALL_n`: Koerper-/Fusspunkt des abgestellten Pferdes
- `HEAD_STALL_n`: Ziel fuer Kopf beziehungsweise sichtbare Vorderkante

Ablauf fuer das spaetere System:

1. Pferd bis `APPROACH_STALL_n` fuehren.
2. `stall_n` oeffnen und mindestens `0.82` erreichen.
3. Pferd nach `PARK_STALL_n` bewegen, Richtung Blender `[0, -1]`.
4. Kopfdarstellung an `HEAD_STALL_n` ausrichten.
5. Tor schliessen und Belegung persistent speichern.

## Vier Pferde

Die vier Eintraege verwenden dasselbe vorhandene Pferde-Atlasmodell. Es werden
keine vier Atlas-Kopien geladen. Unterschiede entstehen nur ueber Multiply-Tint
und eine kleine Skalierung:

- Drei kompakte Arbeitspferde: Fuchs, Dunkelbraun, Schwarzbraun
- Ein etwas leichteres Reit- und Botenpferd: Braun

Fuer Ravensmoor ist die plausibelste Einordnung kein moderner kommunaler
Fuhrpark. Die Tiere gehoeren zum Fronhof beziehungsweise zu einem gemeinschaftlich
genutzten Arbeitsbestand; das Reitpferd dient Schulze, Boten oder Herrschaft.

## Offen fuer Claude Code

Codex liefert Stall, Animationen, Parkmarker und Varianten. Die folgenden Punkte
bleiben gemaess `AGENTS.md` Gameplay-Logik und werden erst im naechsten Auftrag
verdrahtet:

- vier persistente Pferde-Entities in Area `stadt` erzeugen
- Parken/Ausparken und Torabhaengigkeit implementieren
- NPC-Besitz und Nutzung
- Tagesablauf Weide, Arbeit und Rueckkehr in den Stall

Keine Pferdemeshes in die Stall-GLB backen und die 3D-Hausmaterialien nicht
tinten oder ersetzen.
