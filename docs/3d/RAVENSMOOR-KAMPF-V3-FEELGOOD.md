# RAVENSMOOR 3D - KAMPF UND PACING v3: "Bewusst, aber Feel-Good"
## Ersetzt RAVENSMOOR-SOULS-MECHANIK.md vollständig. Ersetzt PROMPT 2 in RAVENSMOOR-3D-PROMPTS.md.

**Die Vision in drei Sätzen (so an Claude Code geben, ersetzt Designsäule 1):**

```
DESIGNSÄULE 1: Die Spannung kommt aus der Dunkelheit, nicht aus der Härte. Der Kampf hat
Gewicht und Absicht (jeder Schlag eine bewusste Entscheidung, Gegner werden gelesen), aber
er fließt und verzeiht (reaktionsschnell, großzügige Fenster, geringe Strafen) - Referenz:
Elden Rings Flüssigkeit, nicht Dark Souls' Strenge. Erkundung ist langsam und angespannt:
um jede Ecke schauen, Geräusche vor Sichtkontakt, kleine Lichtinsel in großer Dunkelheit -
aber im Kampf selbst fühlt sich der Spieler fähig. "Ich bin in Gefahr" ja, "ich packe das
nicht" niemals. Tempo-Referenz: Diablo 1 / Dungeon Siege 1.
```

---

## NEUER PROMPT 2 (v3) - DER KAMPFKERN

```
PHASE 2 - Kampfsystem in der DebugArena. Leitbild: bewusster Kampf, der flüssig und gut
spielbar bleibt. Gewicht in den Animationen, Großzügigkeit in den Regeln.

AUSDAUER - RHYTHMUSGEBER, KEINE STRAFE:
- Leiste 120, regeneriert schnell (45/s nach 0.4s Pause, beim Blocken 20/s)
- Kosten niedrig: leichter Angriff 10, schwerer 24, Rolle 20, geblockter Treffer 10-20
- REGEL: In einem normal gespielten Kampf darf die Leiste praktisch nie leerlaufen - sie
  existiert nur, damit Panik-Spam (8 Schläge oder 5 Rollen in Folge) eine kurze Atempause
  erzwingt. KEIN Guard Break, keine Taumel-Strafe: bei leerer Ausdauer sind Aktionen kurz
  nicht verfügbar (Leiste pulst), mehr nicht. Tuning-Test: Wer mit Bedacht kämpft, soll die
  Leiste kaum bemerken

SPIELER-AKTIONEN (flüssig wie Elden Ring):
- Bewegung: ruhiges, kontrolliertes Grundtempo (Erkundungsgeschwindigkeit Diablo 1) -
  schnell genug, dass es sich nie zäh anfühlt
- Linksklick: 3er-Kette (Hieb, Rückhand, Finisher mit +40% und Knockback). Animationen mit
  spürbarem Gewicht (Anlauf/Treffer/Erholung aus den Mixamo-Clips), ABER: die Erholungsphase
  ist ab 50% in Rolle oder Block abbrechbar - nur die Anlauf- und Trefferphase haben
  Commitment. Input-Buffering großzügig: 250ms, nächste Aktion wird sauber angekettet
- Shift+Linksklick: schwerer Überkopfhieb, ~0.6s Ausholzeit, hoher Schaden, durchbricht
  gegnerische Deckung, volles Commitment - die eine bewusst riskante Option
- Rechtsklick halten: Block. Bewegung 50%, Frontschaden -75%, Pfeile abgewehrt. Blocken ist
  verlässlich und entspannt nutzbar - der sichere Standardweg für vorsichtige Spieler
- Perfekte Parade: Block <300ms vor Einschlag (GROSSZÜGIG) -> kein Schaden, Gegner 1.0s
  geöffnet, Riposte-Fenster: nächster Schlag kritisch (+100%, goldener Blitz, Hit-Stop 100ms,
  Mini-Zoom). WICHTIG: Eine verpasste Parade ist einfach ein normaler Block - es gibt keine
  Bestrafung fürs Versuchen. Die Parade ist Stil-Belohnung für Könner, nie Pflicht
- Leertaste: Ausweichrolle, 300ms großzügige i-Frames, danach sofort wieder handlungsfähig
  (Erholung 0.15s), Cooldown nur über Ausdauer geregelt. Die Rolle muss sich fantastisch
  anfühlen - sie ist die Lieblingsbewegung des Spielers
- Zauber 1/2/3: kurze Wirkzeit 0.4s, nicht unterbrechbar (feel good), Manakosten wie Referenz

GEGNER-VERTRAG:
- Jeder Angriff hat 0.45-0.7s lesbares Aufladen (Animation + Boden-Ring; nicht blockbarer
  Grab-Angriff nur bei Elite/Boss, gelbes Aufblitzen). Telegraphen großzügig lesbar
- Gegnerschaden MODERAT: normaler Treffer 10-16% Spielerleben - ein Fehler tut weh, drei
  Fehler in Folge werden gefährlich, nichts löscht dich aus. Elites ~22%, Boss bis 30%
- 2-4 Gegner pro Begegnung (bewusst platziert wirken, nicht gewürfelt-wimmelnd), max. 2
  greifen gleichzeitig an, Gegner haben Erholungsfenster nach 2-3 Schlägen
- Gegner sterben mit Befriedigung: Wucht-Kipp, Blut-Decal, sattes Treffergeräusch - das
  "Schnetzeln macht Spaß"-Erbe bleibt voll erhalten

GEFÜHL: Hit-Stop 50/80/100ms (leicht/schwer/Riposte), kurzer dezenter Schwert-Trail pro
Waffenqualität, Gegner-Weißblitz + Hit-Reaction-Blend 0.06, Screenshake klein. Schadens-
zahlen AN per Default (Diablo-Erbe, befriedigend), per Option abschaltbar. Lebensbalken
über verletzten Gegnern.

HEILUNG UND TOD (niedrige Strafen):
- 3 Heilflaschen, Trinken 0.6s mit langsamem Weitergehen möglich, Unterbrechung durch
  Treffer bricht ab OHNE die Flasche zu verschwenden
- Kerzenschreine (einer pro Ebene am Treppenraum): Rasten füllt Leben/Mana/Flaschen.
  Geräumte Räume BLEIBEN geräumt (Diablo 1) - kein Respawn beim Rasten
- Tod: Respawn am letzten Schrein oder im Dorf, Verlust 15% Gold, Items bleiben, kein
  Leichenlauf. Tod ist ein Dämpfer, keine Mauer
- Flaschen-Upgrades (+1 Flasche) bei Magdalena als Langzeitziel

DEBUG-ARENA: Dummy mit umschaltbaren Angriffen (T), F1-Overlay mit Parade-Fenster,
i-Frames, Buffering-Anzeige, Ausdauerkosten.

TESTS: Parade-Fenster-Logik, Buffer-Anketten, Ausdauer läuft bei "vernünftiger" Eingabe-
sequenz (Schlag-Schlag-Rolle-Pause) nie unter 30%.

ABNAHME (das doppelte Kriterium - beides muss gelten):
1. BEWUSST: Reines Dauerklicken gegen 3 Dummys führt zu Treffern, die man kassiert -
   wer Telegraphen liest und Rolle/Block nutzt, bleibt nahezu unverletzt
2. FEEL GOOD: Die Eingaben fühlen sich nie verschluckt oder träge an; Rolle und Kombo
   fließen; nach 2 Minuten Arena will man weiterspielen, nicht aufgeben
Wenn 1 fehlt -> Telegraphen/Gegnerschaden justieren. Wenn 2 fehlt -> Buffering/Erholungs-
zeiten/Animationsblends justieren. Niemals 2 für 1 opfern.
```

---

## NEUER ZUSATZ-PROMPT - ERKUNDUNG UND GRUSEL (nach Prompt 4/Dungeon geben)

```
ERKUNDUNGS-PASS "Um jede Ecke schauen" - die Spannung der Krypta kommt aus diesen Systemen:

- SPÄH-KAMERA: Schiebt der Spieler die Maus weit in eine Richtung (oder hält Alt), verlagert
  sich die Kamera weich bis zu 4 Einheiten dorthin - man lugt aktiv in Gänge und um Ecken,
  bevor man sie betritt. Mit Dead-Zone und weichem Rückzug, niemals nervös
- LICHT ALS INFORMATION: Spielerlicht-Radius bewusst knapp; was außerhalb liegt, ist
  WIRKLICH schwarz (echte Schwarzwerte aus der Showcase-Checkliste). Fackeln an Wänden
  markieren begangene Wege; ein Ring mit +Lichtradius ist dadurch ein fühlbar wertvoller Fund
- HÖREN VOR SEHEN: 3D-Positionsaudio. Jeder Gegnertyp hat ein Idle-Geräusch (Schlurfen,
  Knochenklackern, Kettenrasseln, beim Grabschatten ein Flüstern), hörbar ab ~1.5x Sicht-
  weite, gerichtet. Der Spieler weiß DASS etwas da ist und ungefähr WO - aber nicht was
- LAUERNDE GEGNER: Gegner patrouillieren langsam oder stehen reglos in dunklen Nischen
  (Pestopfer kauern wie Leichen und erheben sich erst bei Annäherung - mit Audio-Vorwarnung
  0.8s, fair). KEINE Jumpscare-Schadensfallen: Erschrecken ja, unfaire Treffer nein
- STILLE ALS WERKZEUG: zwischen Begegnungen 20-40 Sekunden Leere mit Ambient (Tropfen,
  ferner Wind, Knarren). Sparsame Skript-Momente pro Ebene (eine Fackel verlischt beim
  Vorbeigehen, ein Sarg-Deckel verrutscht hörbar hinter dem Spieler) - maximal 2 pro Ebene,
  sonst nutzt es sich ab
- MINIMAP nur für Besuchtes, keine Gegneranzeige

Abnahme: Ein Tester (du selbst via Screenshots + Durchspielen der Ebene 1) soll berichten:
"Ich bin langsam gegangen und habe vor Ecken gezögert" - UND gleichzeitig: "Kein Kampf hat
sich unfair angefühlt."
```

---

## FOLGEÄNDERUNGEN AN DEN PHASEN (ein Prompt)

```
Gleiche die übrigen Phasen an v3 an:
- Phase 3: Gegnerdichte 2-4 pro Begegnung, jeder Typ 2-3 lesbare Angriffe, Pestopfer als
  kauernde Leichen-Lauerer, Grabschatten als Nischen-Hinterhalt mit Flüster-Vorwarnung
- Phase 5/6: Heiltränke -> Flaschensystem + Upgrades bei Magdalena; Manatränke bleiben kaufbar
- Phase 7: Tempelritter mit 4-5 klar telegrafierten Angriffen und großzügigen Fenstern,
  Ziel-Kampfdauer 2-3 Minuten, schaffbar in 1-3 Versuchen mit Ausrüstung der Ebene 3,
  Schrein direkt vor der Nebelwand
- Phase 8: Optionen: Schadenszahlen an/aus, Shake-Stärke, Späh-Kamera-Reichweite;
  Herzschlag-Audio unter 25% Leben
```
