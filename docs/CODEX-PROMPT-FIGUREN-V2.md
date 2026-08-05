# Prompt fuer Codex: Figuren V2 - Held nach Lore, Layer-Ausruestung, Animationen (R240)

Nachfolger von CODEX-PROMPT-FIGUREN.md. Runde 1 war gut (Stil, Umriss,
Palette) - JETZT: der Held wird lore-treu, Ausruestung wird als LAYER
austauschbar, und es kommen Animationen dazu.

---

Du bist Pixel-Artist fuer "Eternal Pain" (duesteres 2D-Spiel von oben,
Phaser 3, Deutschland 1349, Schwarzer Tod). Dein erster Kontaktbogen war
stark - Stil, Umriss, Palette bleiben GENAU so. Drei Aenderungen:

## 1. DER HELD IST KEIN HELD (Lore-Pflicht)

Er heisst ALDRIC VON WEIDEN, im Spiel nur "der Fremde": ein einfacher
Gefolgsmann des Landherrn von Falkenberg, der im Pestjahr 1349 den
Auftrag bekommt, nach dem Dorf Rabenmoor zu sehen. KEIN Ritter, kein
Auserwaehlter - ein Reisender, der in eine Horrorgeschichte hineingeraet.

- MASSGEBLICHE REFERENZ: das vorhandene Portrait im Repo unter
  assets/ui/character/aldric-portrait-ohne-wappen-1300.png ("ohne
  Wappen" ist Absicht - er fuehrt keins). Gesicht, Haar, Bartschatten
  und Farbwelt der Spielfigur MUESSEN zu diesem Portrait passen.
- Kleidung BESCHEIDEN, wie ein Fusssoldat OHNE Helm: schlichter
  Gambeson oder Lederwams ueber grobem Hemd, Wollhose, abgetragene
  Stiefel. Dazu ein REISEUMHANG MIT GUGEL (Kapuze ab, auf dem Ruecken) -
  das ist 1349 voellig zeittypisch: Gugel und Heuke waren DIE
  Reisekleidung des einfachen Mannes. Kein Ornat, kein Schulterpanzer,
  kein glaenzendes Metall.
- Das Schwert ist Werkzeug, nicht Insignie: schlichte Klinge, einfache
  Parierstange, am Guertel oder in der Hand.
- ABER: er ist ein VETERAN, kein Juengling. Aldric hat einst ein Heer
  angefuehrt, wurde schwer verwundet und verlor Frau und Kind (Doku
  09-DER-FREMDE-ALDRIC.md). Das zeigt sich NICHT an der Ausruestung,
  sondern an der Haltung: aufrecht, aber muede; wettergegerbtes
  Gesicht wie im Portrait; er traegt das Schwert wie einer, der es
  tausendmal gefuehrt hat - selbstverstaendlich, ohne Pose.

## 2. AUSRUESTUNG ALS AUSTAUSCHBARE LAYER (Held UND Fusssoldaten)

Der Held (und die Soldaten) werden NICHT als ein festes Bild geliefert,
sondern als uebereinanderlegbare EBENEN - gleiche Canvas-Groesse,
gleicher Anker (Fusspunkt Mitte unten), damit das Spiel sie stapeln kann:

- Ebene KOERPER: Kopf, Hemd, Hose, Stiefel (die "nackte" Basis).
- Ebene RUESTUNG (Varianten, je einzeln): Stoffkittel / Gambeson /
  Lederwams / Kettenhemd. Jede Variante deckt nur den Torso-Bereich.
- Ebene UMHANG (an/aus schaltbar): Reiseumhang mit Gugel im Nacken.
- Ebene WAFFE (je einzeln, eigene Datei): Schwert / Axt / Bogen -
  gezeichnet in der HAND-Position jeder Blickrichtung und JEDES Frames
  (auch der drei Schlag-Frames: die Klinge macht den Schwung mit).
- Ebene SCHILD (an/aus, je einzeln): am linken Arm, ebenfalls fuer
  JEDEN Frame (beim Schlag bleibt das Schild schuetzend vor dem
  Koerper, beim Gehen schwingt es leicht mit).

DAS KOMBINATIONS-PRINZIP (WICHTIG - genau so, nicht anders):
- Es gibt EINE Koerper-Animation. Der linke Arm ist in allen Frames so
  posiert (leicht angewinkelt vor dem Koerper), dass er MIT Schild
  (das Schild deckt ihn) und OHNE Schild (Arm balanciert frei) beide
  plausibel aussieht. NICHT zwei Koerper-Versionen zeichnen!
- "Je nach Schwert" und "je nach Schild" heisst: NUR das jeweilige
  Ebenen-Sheet wird getauscht, der Koerper bleibt. Damit das passt,
  schreibt das JSON je Richtung+Frame einen HAND-ANKER (x,y der
  Griffhand) und einen SCHILD-ANKER (x,y Armmitte) fest - JEDE
  Waffen-/Schild-Variante wird exakt auf diese Anker gezeichnet.
- Liefere als Start ZWEI Schwert-Varianten (schlichte Klinge /
  Meisterklinge mit hellerem Stahl) und ZWEI Schild-Varianten
  (Holz-Rundschild / beschlagener Rundschild). Weitere Waffen sind
  dann nur noch je EIN neues Sheet auf dieselben Anker - kein neuer
  Koerper, keine neuen Kombinationen.

Die Fusssoldaten nutzen DIESELBE Koerper-Basis und DIESELBEN
Ruestungs-Layer (Kettenhaube/Helm als eigene Kopf-Ebene) - Held und
Heer sind EINE Familie, nur anders angezogen. Stil weiter an
Kontaktbogen 1 und am Aldric-Portrait ausgerichtet.

## 3. ANIMATIONEN (Pflicht-Format unserer Engine)

Unsere Pipeline kennt 4 Blickrichtungen in dieser Reihenfolge:
UNTEN (0), LINKS (1), RECHTS (2), OBEN (3). Liefere je Richtung:

- STEHEN: 1 Frame (ruhige Haltung, Waffe gesenkt)
- GEHEN: 4 Frames (Kontakt - Hoch - Kontakt - Hoch; Beine klar
  versetzt, Arme schwingen gegenlaeufig, Umhang schwingt 1-2 px nach)
- SCHLAG: 3 Frames (Ausholen ueber die Schulter - Treffer quer -
  Nachziehen); beim Bogen stattdessen SPANNEN: 3 Frames (Nocken -
  Spannen - Loesen)
- BLOCK: 1 Frame (mit Schild: Schild hoch vor den Koerper; ohne
  Schild zeigt derselbe Koerper-Frame die Klinge quer - beides muss
  mit derselben Koerperpose funktionieren, siehe Kombinations-Prinzip)
  (Die Ausweichrolle folgt in Runde 3 - jetzt noch nicht.)

SHEET-FORMAT: ein PNG je Ebene, Raster 128x128 je Frame (NATIV
gepixelt in 128 - das ist unsere Spielaufloesung, KEIN Skalieren),
Zeilen = Richtungen (0-3), Spalten = Frames in der Reihenfolge
Stehen(1) Gehen(4) Schlag/Spannen(3) Block(1) = 9 Spalten (Sheet =
1152x512). Dazu je Sheet ein JSON: { frameW, frameH, reihen, spalten,
anker, spalten_belegung, handAnker: [je Richtung+Frame [x,y]],
schildAnker: [je Richtung+Frame [x,y]] }. Ablage unter
screenshots/codex_v2/ (Ordner anlegen).

## 4. ABGABE

1. Sprite-Sheets + JSONs wie oben fuer: Held Aldric (alle Ebenen),
   Fusssoldat (Koerper + Kette + Helm-Ebene), Bogenschuetze.
2. EIN Kontaktbogen-PNG als Schaufenster: Aldric in 4 Ausstattungen
   (Hemd pur / Gambeson+Umhang / Kette+Schild / Kette+Meisterklinge
   OHNE Schild), dazu eine SCHLAG-REIHE (die 3 Schlag-Frames einmal
   MIT und einmal OHNE Schild nebeneinander - der Beweis, dass eine
   Koerperpose beide Faelle traegt), daneben Soldat und
   Bogenschuetze, jeweils Blickrichtung unten - auf
   dunklem Grund UND auf Gras-Gruen #46543a, in 128 nativ, dazu 64-
   und 32-Proben (nur herunterskaliert fuers Schaufenster).
3. KEINE bestehenden Spieldateien anfassen (src/gfx bleibt unberuehrt).
   Nur screenshots/codex_v2/* committen, deutsche Commit-Message.
4. Selbstbewertung am Ende (3 Saetze): Aehnlichkeit zum Portrait?
   Lesen sich die Layer sauber gestapelt? Was wuerdest du in Runde 3
   aendern?

MASSSTAB DES AUTORS: "Sieht Aldric aus wie ein muede gereister Mann
des Jahres 1349 - oder wie ein Fantasy-Held?" Bescheiden schlaegt
heroisch. Und: die Layer muessen WIRKLICH deckungsgleich stapeln -
das wird gegen das Raster geprueft.

---
