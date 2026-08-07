# Helden-Animation / Rig (Stand Runde 54)

Diese Datei sichert die Helden-Animation und erklärt, WIE sie aufgebaut ist,
damit nichts verloren geht und neue Rüstungen/Waffen/Animationen ergänzt werden
können, OHNE die Bewegung selbst anzufassen.

## Grundidee: Rig (Bewegung) + Skin (Aussehen) sind getrennt

Die Animation läuft bereits **unabhängig von Rüstung, Farbe und Kleidung** -
quasi als geriggte Puppe:

- Die **Bewegung** (Gelenkwinkel von Armen/Beinen, der Schwung, der Gehzyklus)
  wird in `src/gfx/heldArt.ts` rein aus Daten/Logik berechnet und ist für JEDE
  Rüstungsstufe GLEICH.
- Das **Aussehen** (Skin) kommt obendrauf:
  - Proportionen je Stufe aus `src/data/heldForm.ts` (`getHeldForm(tier)`).
  - Farben je Stufe aus der Palette in `heldArt.ts` (`PALETTEN[tier]`),
    plus Farb-Überschreibungen aus dem Figur-Editor (`f.farben`).
  - Die **Waffe** wird am Handpunkt des Rigs gezeichnet (`zeichneWaffe`), je
    nach ausgerüsteter Waffenklasse.

Folge: Eine neue Rüstung/Farbe = nur neue Werte in `heldForm`/Palette. Eine neue
Waffe = nur eine Form in `zeichneWaffe`. Die Animation bleibt unberührt.

Gebacken wird je `(Rüstungsstufe, Waffe)` ein eigener Atlas
`held_<tier>_<waffe>` in `src/gfx/SpriteProvider.ts` (lazy, nur was gebraucht
wird). Atlas-Zelle = `HELD_FELD` (Figur 64px + 20px Rand ringsum, damit der
lange Schwung nicht abgeschnitten wird und nicht ins Nachbar-Frame läuft).

## Was es heute gibt

- **8 Blickrichtungen**: 0=S(unten) 1=SW 2=W(links) 3=NW 4=N(oben) 5=NE
  6=O(rechts) 7=SE. `angleToDir8` (in `src/world/Enemy.ts`) wählt die Richtung.
- **Frames je Richtung** (`HELD_FRAMES = 8`): 0..3 Gehen (Gehzyklus mit
  gegenläufigem Armschwung + leichtem Heben), 4..7 = Schlag in 4 Phasen.
- **Schlag-Choreografie** (rechtshändig, je Richtung EIGEN, nicht gespiegelt):
  Tabelle `SCHLAG[8]` in `heldArt.ts`. Je Richtung:
  - `rest`  - Klingenwinkel in Ruhe (Knauf nah am Körper, Spitze weg/unten),
  - `swing[4]` - Klingenrichtung der 4 Schlagphasen (diagonale HEMA-Hiebe:
    W links = unten->oben, O rechts = oben->unten, N oben = von rechts unten
    über rechts nach oben),
  - `bend` - Ellenbogen-Seite (2-Knochen-IK `ik2`, natürlicher, fast
    gestreckter Arm),
  - `frontVon` - ab welcher Phase der Waffenarm VOR dem Körper liegt (davor
    dahinter -> Klinge taucht hinter dem Rumpf durch = Tiefe).
- **Klingen-Schweif** (`klingenSpur`): blau-weißer Wisch von der vorigen zur
  aktuellen Klingenrichtung, Radius an der Klingenspitze (wächst mit der
  Waffenlänge `WAFFEN_LAENGE`). Zusätzlich gibt es im Spiel den großen
  `addSwing`-Swoosh (`src/world/effects.ts`).

## Justieren

- Eine Richtung anders schwingen lassen: NUR die eine Zeile in `SCHLAG[dir]`
  ändern (Winkel der 4 Phasen, `rest`, `frontVon`).
- Schweif-Länge/Stärke: `WAFFEN_LAENGE` + der `klingenSpur`-Aufruf in `schlagArm`.
- Reichweite/Streckung des Arms: `SCHLAG_R` (Reichweite Schulter->Hand je Phase).

## OFFEN / als Nächstes (Autorwunsch, braucht je einen Detail-Prompt)

Die Bewegung ist Rig-getrennt - neue Animationen schließen also nur an, ohne die
bestehende anzufassen. Geplant, je mit eigener Choreografie-Tabelle/Logik:

1. **Eigene Schwung-Animationen je Waffenklasse**: Axt/Kolben (wuchtiger Hieb),
   Speer/Stange (Stich statt Hieb), evtl. Schwert-Varianten. Heute nutzen noch
   alle dieselbe `SCHLAG`-Tabelle.
2. **Zauberstab**: eigene Wirk-/Zauber-Animation (kein Hieb).
3. **Schild**: Block-Pose mit Schild; **ohne Schild** blockt der Held mit dem
   Schwert. Dazu eine Block-Haltung + ggf. Schildschlag.

Diese drei kommen jeweils mit einem eigenen, detaillierten Prompt (wie bei der
Schwert-Choreografie). Sie ergänzen die Rig-Logik, ohne Rüstung/Farbe/bestehende
Animation zu berühren.

## Stand & Gehen (Biomechanik-Notiz für später)

Der Autor hat eine ausführliche Referenz zu aufrechtem Stand (Doppel-S-Form der
Wirbelsäule, Lotlinie, Körperschwerpunkt ~55% Höhe), Gangzyklus (Stand-/
Schwungphase, Doppelstütze, umgekehrtes Pendel, Schwerpunkt-Sinuskurve ~4-5cm,
gegenläufiger Armschwung) und Atmung (leichtes, ständiges Heben/Senken des
Rumpfes, ~12-20/min) geliefert. Geplant: dezente **Atem-/Steh-Bewegung** im
Idle und Feinschliff des Gehzyklus. Eigener Schritt.
