# Codex-Auftrag: Charakter-Schale neu aufteilen (Spalten + Slot-Raster)

## Kontext - worum es geht

Ravensmoor (2D, Phaser 3). Das Charakterfenster (Taste C) besteht aus EINEM
gemalten Hintergrundbild - der "Schale" - und aus Text/Symbolen, die der Code
exakt auf die gemalten Kaesten legt:

`assets/ui/character/character-inventory-shell-gpt2-1300.png`, **1672 x 941 px**

In diesem Bild sind gemalt: der Aussenrahmen, die acht Reiter oben, die drei
Spalten, die Ausruestungs-Kaesten mit Koerper-Silhouette, die Werte-Trennlinien,
der Kraeuterbeutel-Streifen, die Rucksack-Zeilen samt Symbolspalte und
Bildlaufleiste, das Detail-Feld rechts und die drei farbigen Knoepfe.

Der Code liest diese Positionen als feste Zahlen (in 1672er Koordinaten) und
setzt seine Texte darauf. **Wer die Aufteilung aendern will, muss das BILD
aendern** - im Code verschieben heisst nur, dass Text neben den gemalten Kaesten
landet (genau dieser Fehler ist schon passiert).

## Der Auftrag des Autors

> "Der Rucksackbereich ist zu schmal im Verhaeltnis zum rechten Leerraum. Die
> Mitte ist der Bereich, mit dem der Spieler am meisten arbeitet. Trotzdem ist
> rechts sehr viel freie Flaeche."
> Wunsch-Aufteilung: **Charakter 31 % · Rucksack 43 % · Details 26 %**

> "Ausruestungsslots sind nicht sauber genug ausgerichtet ... Kopf und Stiefel
> exakt auf der Koerpermittelachse, linke und rechte Slots mit demselben Abstand
> zur Figur, die unteren Slots auf einer gemeinsamen Grundlinie."

## IST-Stand (von mir im PNG vermessen, nicht geschaetzt)

Alle Zahlen in Bildkoordinaten (Bild ist 1672 x 941).

| Bereich | jetzt | Anteil |
|---|---|---|
| Innenflaeche gesamt | x 60 .. 1615 | - |
| Spalte 1 Charakter | x 60 .. 580 | ~31 % |
| Spalte 2 Rucksack | x 600 .. 1200 | ~36 % |
| Spalte 3 Details | x 1220 .. 1615 | ~24 % |

Reiter oben (8 Kaesten, y 12 .. 62):
`124-310, 310-521, 521-689, 703-870, 870-1039, 1052-1216, 1229-1393, 1393-1553`

Filter-Reiter im Rucksack (9 Kaesten, y 144 .. 176):
`617-675, 676-738, 739-801, 802-864, 865-926, 927-989, 990-1052, 1053-1112, 1114-1177`

## SOLL

**1) Spalten neu aufteilen (31 / 43 / 26 der Innenflaeche 60..1615)**

| Spalte | neu (Bildkoordinaten) | Breite |
|---|---|---|
| Charakter | 60 .. 542 | 482 (31 %) |
| Rucksack | 560 .. 1229 | 669 (43 %) |
| Details | 1247 .. 1652 | 405 (26 %) |

(Die Trennstege dazwischen dürfen bleiben wie sie sind - nur die Innenflaechen
verschieben sich. Wenn du die Stege anders setzt, melde die neuen Zahlen.)

**2) Ausruestungs-Slots auf ein striktes Raster**

Der Autor will dieses Schema, mit der Figur in der Mitte:

```
              Kopf
Waffe        Ruestung        Schild
Nebenhand    Stiefel         Ring
```

- Kopf und Stiefel **exakt auf der senkrechten Mittelachse** der Spalte.
- Linke und rechte Slots mit **identischem Abstand** zur Mittelachse.
- Die beiden unteren Reihen jeweils auf **einer gemeinsamen Grundlinie**.
- Alle Slot-Kaesten **gleich gross** (heute sind manche schmal, andere breit).

**3) Filter-Reiter: 8 statt 9**

Der Rucksack hat 8 Kategorien (ALLE, WAFFEN, ZAUBERSTAEBE, AEXTE, RUESTUNG,
SCHILDE, RINGE, SONSTIGES). Gemalt sind NEUN Kaesten - einer bleibt immer leer.
Bitte auf 8 gleich breite Kaesten aendern. "ZAUBERSTAEBE" ist das laengste Wort
und muss hineinpassen (bei 1672 px Bildbreite und Schriftgroesse 13 braucht es
rund 95 px) - also mindestens 100 px je Kasten.

**4) Reiter oben: etwas hoeher**

Der Autor: "Die Reiter sollten etwa 6-10 px mehr Hoehe bekommen, der Text muss
vertikal wirklich mittig sitzen." Heute y 12..62 (50 px) - bitte auf 62 px.

## WAS DU MIR ZURUECKMELDEN MUSST

Ich ziehe danach die Zahlen im Code nach. Ich brauche in BILDKOORDINATEN:
1. Die drei Spalten-Innenflaechen (x links, x rechts).
2. Alle Ausruestungs-Slot-Kaesten (x, y, Breite, Hoehe) mit Bezeichnung.
3. Die 8 Filter-Kaesten (x links, x rechts) und ihre y-Ober-/Unterkante.
4. Die 8 Reiter oben (x links, x rechts) und ihre y-Ober-/Unterkante.
5. Portraet-Kasten, Werte-Trennlinien, Kraeuterstreifen, Rucksack-Zeilenraster
   (erste Zeile y, Zeilenhoehe), Symbolspalte, Detail-Feld, die drei Knoepfe.

Am einfachsten als Liste "name: x0,y0,x1,y1".

## WICHTIG

- **Gleiche Datei, gleicher Name, gleiche Bildgroesse (1672 x 941).** Alles
  andere bricht die Verdrahtung.
- Stil unveraendert (Pergament, dunkler Holzrahmen, dieselben Ornamente).
- Der Autor hat zusaetzlich gewuenscht: die drei Spalten duerfen sich in der
  Pergament-Toenung MINIMAL unterscheiden (Charakter waermer, Rucksack neutral,
  Details heller), und es sollen weniger konkurrierende Rahmen sein - kraeftige
  Rahmen nur um die Hauptbereiche, feine Linien innen.
