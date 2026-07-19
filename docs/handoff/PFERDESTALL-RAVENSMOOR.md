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

- Drei kompakte Arbeitspferde: gedeckter Fuchs, das bisherige Dunkelbraun und
  ein nah verwandter warmer Braunton
- Das etwas leichtere Heldenpferd: Schwarz (mit lesbarer warmer Restzeichnung)

Fuer Ravensmoor ist die plausibelste Einordnung kein moderner kommunaler
Fuhrpark. Die Tiere gehoeren zum Fronhof beziehungsweise zu einem gemeinschaftlich
genutzten Arbeitsbestand; das Reitpferd dient Schulze, Boten oder Herrschaft.

## Live verdrahtet

- Vier eigenstaendige Entities werden an den vier exportierten
  `APPROACH_STALL_n`-Markern erzeugt.
- Wenn der Export die Marker traegt, werden sie aus der laufenden GLB in
  Weltkoordinaten transformiert. Neuere Stallvarianten ohne diese Marker nutzen
  den stabilen S2-Vorplatzanker als Rueckfall.
- Das schwarze Pferd gehoert dem Helden und wartet ungeritten an seinem Standort.
- Die drei etwas breiteren Arbeitspferde folgen tagsueber einer langsamen,
  versetzten Fuehrrunde um Stallknecht Hanko und kehren ohne ihn an ihren Anker
  zurueck. Sie verwenden die echte Schrittanimation, kein Gleiten.
- Alle vier sind mit `E` reitbar. Beim Aufsitzen auf ein Arbeitspferd pausiert
  dessen NPC-Routine; das zuvor aktive Pferd bleibt physisch in der Welt stehen.
- Alle Varianten teilen dieselben Stand-, Schritt-, Trab-, Galopp-, Wende- und
  Uebergangsatlanten. Tint und Proportion bleiben auch beim Atlaswechsel stabil.

Noch offen ist nur eine spaetere Verwaltungsoberflaeche fuer Zuteilung,
Stallbelegung und Tagesauftraege. Die Laufzeit-Entities und NPC-Grundroutine sind
nicht mehr offen.

Keine Pferdemeshes in die Stall-GLB backen und die 3D-Hausmaterialien nicht
tinten oder ersetzen.

Falls ein angelieferter Stall dennoch Vorschau-Pferde in `node_groups.horses`
enthaelt, blendet die Runtime sie aus. Gameplay zeigt ausschliesslich die vier
steuerbaren Entities; gebackene Duplikate sind nie anklickbar oder reitbar.
