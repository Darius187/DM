# RTS-Ausbau - Konzept & Vorschläge ("Age-of-Empires-Gefühl")

Stand: Runde 135. Dies ist ein VORSCHLAGS-Dokument, noch kein umgesetzter Stand.
Grundlage: Kartierung des RTS-Modus (WorldScene, rtsBattle, rts.ts, Wegfeld).
Umsetzung erst nach Freigabe des Autors, Meilenstein für Meilenstein.

---

## 0. Wo der RTS-Modus heute lebt (Datei-Landkarte)

| Datei | Rolle | Was drin steht |
|---|---|---|
| `src/data/rts.ts` | **Regler/Werte** | Einheiten, Bauten + Kosten, HP, Belagerung, Moral, Lager-Auren, Held-Tempo |
| `src/logic/rtsBattle.ts` | **Kommando-Schicht** | Auswahl (Box/Klick/Doppelklick/Shift), Befehle, Formation, Turm-Besatzung, Wegfeld-Anbindung |
| `src/scenes/WorldScene.ts` | **Integration** | `toggleRtsModus`, Bauen/Baustellen, Belagerung, Held im RTS, Spawns, Dorf-Einfälle |
| `src/world/Wegfeld.ts` | **Wegfindung** | Flussfeld (BFS) für die Masse, A* nur für Einzel-NPCs |
| `IDEEN-BACKLOG.md` | Ideen-Text | Abschnitte "Schlacht: Versorgung & Befestigung", "Die große Schlacht" |

Es gibt bisher KEINE eigene RTS-Doku - dieses Dokument wird sie.

---

## 1. Was heute schon funktioniert (ehrlich)

- **Moduswechsel nahtlos**: An/Aus lässt die Truppen weiterlaufen, nur UI/Auswahl gehen (`toggleRtsModus`).
- **Bauen im AoE-Stil**: Geist folgt Maus, Snap, Grün/Rot-Vorschau, Bauzeit-Balken. Palisade, Tor (Doppeltor), 3 Wachturm-Varianten, Lazarett, Zelt, Feldaltar, Feldküche, Brunnen, Feldschmiede, Wartfeuer, Nachschubzelt.
- **Echte Einheiten**: keine Extra-Kampfsim - Truppen sind echte `Enemy`-Instanzen (Team Spieler), laufen durch dieselbe Kampf-/KI-Pipeline wie Monster.
- **Auswahl & Befehle**: Gummiband, Doppelklick (Typ), Shift-additiv, Rechtsklick-Marsch/Fokus, Rechts-Ziehen = Formation, Haltungen (aggressiv/verteidigen/halten), Angriffsmarsch.
- **Wegfindung Masse**: EIN Flussfeld je Ziel, getrennte Felder für Spieler/Feind (offenes Tor nur je Team passierbar).
- **Belagerung mit Bresche-Fokus**: Monster hämmern gezielt die schwächste Wehr-Stelle, bei Durchbruch strömen alle sofort nach.
- **Turm-Besatzung**: Reichweiten-/Schadensbonus, Badge "🏹 n/2".
- **Lager-Auren & Moral**: Feldaltar, Standarte, Brunnen, Feldschmiede wirken.
- **Held als Sonder-Einheit**: gruppierbar, Auto-Kampf je Haltung.

## 2. Die großen Lücken (das, was das AoE-Gefühl noch verhindert)

1. **KEINE Wirtschafts-Kopplung.** Baukosten kommen aus dem persönlichen Held-Inventar (`p.materials`), NICHT aus dem Dorf-Lager (`dorfLager`) oder der Dorfkasse. Das Dorf und das Heer sind praktisch entkoppelt. → **Genau das, was der Autor will, fehlt komplett.**
2. **KEINE echte Rekrutierung.** Einheiten entstehen nur über den Test-Tab (gratis) oder das Wartfeuer (fester Gratis-Trupp). Kein Gebäude, das gegen Ressourcen produziert.
3. **KEIN Nachschub/Supply.** Truppen kosten nichts im Unterhalt, sterben ersatzlos, Bevölkerung/Limit existiert nicht.
4. **KEINE Kriegswirtschaft.** Bauern/Bewohner können nicht umgestellt werden; das Dorf produziert im Krieg genauso weiter wie im Frieden.
5. **Wegfindung stößt an Grenzen** (dokumentiert): Monster rennen gegen Zäune / finden Brücken nicht, Stau an Engstellen.
6. **Persistenz fehlt** (außer Lagerfeuer): Palisaden/Türme/Truppen überleben keinen Kartenwechsel/Speicherstand.
7. **Zwei Einheiten-Tabellen** (`RTS_EINHEITEN` Flavour vs. `RTS_UNIT_TYP` real) - Doppelpflege.

---

## 3. Der Kern-Vorschlag: Dorf → Heer (die Versorgungskette)

Leitgedanke des Autors: **"Je mehr in der Mine abgebaut wurde, desto stärker das Heer. Nachschub ist wichtig. Bauern müssen auf Kriegswirtschaft umstellen können."**

Das ergibt eine geschlossene Kette:

```
  Mine/Feld/Wald  →  Dorf-Lager (dorfLager)  →  Zeughaus  →  Heer
   (Rohstoffe)        (Vorrat + Gold)          (rüstet)     (Bauen + Rekrutieren)
        ▲                                                        │
        └──────────  Kriegswirtschaft: Bauern → Arbeiter/Träger ─┘
```

Alle Werte davon leben in Datendateien (`src/data/rts.ts`, neue `src/data/kriegswirtschaft.ts`), damit der Autor in EINER Zeile tunt.

---

## 4. Vorschläge nach Meilensteinen (klein, freigebbar)

### K1 — Baukosten aus dem Dorf-Lager (die Kopplung schließen)
**Ziel:** RTS-Bauten ziehen Holz/Stein/Fasern aus `dorfLager`, nicht mehr aus dem Held-Rucksack.
- Neue Funktion `dorfKostenPruefen()/dorfKostenAbziehen()` als reine Logik (testbar).
- Leiste färbt Bau rot, wenn das **Dorf** zu wenig hat - mit Anzeige "Lager: 40 Holz".
- Held-Materialien bleiben als Fallback/Notkasse möglich (Regler `RTS_QUELLE.zuerstDorf = true`).
- **Effekt sofort spürbar:** viel abgebaut = viel baubar. Das ist die Autor-Kernforderung.
- Aufwand: klein. Testbar rein. **Empfohlener erster Schritt.**

### K2 — Zeughaus: das Dorf rüstet das Heer aus
**Ziel:** Ein reales Gebäude im neuen Ravensmoor, das Ausrüstung produziert.
- `ZEUGHAUS_HAKEN` (existiert in `wirtschaft.ts`, `aktiv:false`) scharf schalten.
- Schmied/Feldschmiede wandeln Eisen/Stahl (aus Mine) → Waffen/Rüstungen → Lagerbestand "Ausrüstung".
- Rekrutierung einer Einheit verbraucht 1 Ausrüstungs-Satz + Gold aus Dorfkasse.
- Bessere Mine/mehr Stahl → bessere Einheiten-Stufe (Spießer → Gewappneter → Ritter).
- **Effekt:** die historische Flavour-Tabelle `RTS_EINHEITEN` bekommt endlich eine Funktion (Stufen).

### K3 — Rekrutierung mit Bevölkerung & Kosten (statt Gratis-Test-Tab)
**Ziel:** echte Truppenproduktion.
- Rekrutierung zieht **Bewohner** aus dem Dorf (Bevölkerungs-Pool) + Ausrüstung (K2) + Gold.
- Muster-/Sammelplatz-Gebäude (Standarte als Rally-Point) - neue Truppen laufen dorthin.
- Truppen-Limit = Funktion der Bevölkerung ("Bauern werden Soldaten" hat einen Preis: weniger Ernte).
- Test-Tab bleibt nur im DEV-Flag.

### K4 — Nachschub/Supply (der "wie im echten Leben"-Teil)
**Ziel:** Truppen im Feld brauchen Versorgung, sonst sinkt Moral/HP-Regen.
- Nachschubzelt/Feldküche ziehen Proviant aus dem Dorf-Lager; Reichweite = Aura.
- Truppen außerhalb jeder Versorgungs-Aura: langsamer Moral-Verfall, kein Regen (Belagerungs-Ausdauer).
- Träger-Linie (optional): Karren pendeln Dorf ↔ Front, sichtbarer Nachschub-Strom.
- **Effekt:** Vorwärts-Basen bauen (Standarte + Nachschub), sonst reißt die Front ab. Sehr AoE.

### K5 — Kriegswirtschaft-Schalter (Bauern → Krieg)
**Ziel:** ein Modus-Umschalter fürs ganze Dorf.
- Neue `src/data/kriegswirtschaft.ts`: Frieden / Mobilmachung / Totaler Krieg.
- Mobilmachung: Felder/Ernte gedrosselt, dafür Holz→Palisaden, Bauern→Träger/Miliz, Schmiede→Waffen.
- Sichtbar: Bewohner wechseln Figur (Bauer → Miliz mit Spieß), Felder liegen brach.
- Rückweg testen (CLAUDE.md Regel 9.2): Krieg → Frieden → Krieg, alles muss sauber zurückschalten.
- **Effekt:** genau die Autor-Forderung "alle müssen auf Kriegswirtschaft umstellen können".

### K6 — Wegfindung härten (weniger Festhaken)
- Brücken/Tore als bevorzugte Kanten im Flussfeld gewichten (kein "gegen den Zaun rennen").
- Engstellen-Entzerrung (schon `maxProStelle` bei Belagerung, auf normalen Marsch ausweiten).
- Sackgassen-Erkennung: wenn kein Weg → Wehrbau angreifen statt zappeln (Teil existiert bei Belagerung).

### K7 — Persistenz (Heer & Basis überleben Speichern)
- `feldbauten` (Palisade/Tor/Turm inkl. HP/offen-Status) + Truppenbestand in den Speicherstand.
- `gameStorage.ts` erweitern; Roundtrip-Test (CLAUDE.md Regel 4).
- Ohne das ist jede aufgebaute Basis nach Kartenwechsel weg.

### K8 — Belagerung vertiefen (AoE-Würze)
- Belagerungsgerät als eigene Einheit (Rammbock/Leiter/Katapult) statt "Monster nagt an Holz".
- Mauer-Stufen (schon `stadtmauerStufe` im Einfall-System) auch für Spieler-Palisaden.
- Öl/Pfeilhagel von besetzten Türmen (Turm-Aktion statt nur passiver Bonus).

---

## 5. Empfohlene Reihenfolge

1. **K1** (Dorf-Lager → Baukosten) — kleinste Änderung, größter "Aha"-Effekt, erfüllt Kernforderung sofort.
2. **K2** (Zeughaus rüstet aus) — schließt Mine → Heer.
3. **K5** (Kriegswirtschaft-Schalter) — der Umstell-Wunsch, sichtbar im Dorf.
4. **K4** (Nachschub) — macht Front-Ausdehnung strategisch.
5. **K3** (Rekrutierung mit Bevölkerung) — ersetzt Gratis-Spawn.
6. **K6/K7/K8** — Härten, Speichern, Belagerungs-Würze.

K1+K2+K5 zusammen liefern schon das Gefühl: **"Meine Mine finanziert mein Heer, im Krieg stellt das Dorf um."** Das ist der Kern des Wunsches.

---

## 6. Leitplanken (aus CLAUDE.md)

- Alles im **neuen Ravensmoor** (Area `stadt`), niemals im alten Dorf (Regel 14).
- Alle Zahlen in `src/data/*` (Regel 3, keine Magic Numbers).
- Reine Logik zuerst mit Vitest testen (Regel 4): Kosten-Abzug, Supply-Verfall, Umstell-Roundtrip.
- Speicher-Kompatibilität wahren (alte Stände dürfen nicht brechen).
- Kern nicht anfassen: Dungeon-Renderpfad, Kampf-Grundlogik, Einfall-Flucht-Kern.
