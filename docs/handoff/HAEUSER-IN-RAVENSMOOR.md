# Arbeitsauftrag (Codex): 3D-Haeuser in Ravensmoor an die Platzhalter setzen

**Ziel:** Die von dir gebauten 3D-Gebaeude (Apotheke, Baeckerei, Metzger,
Boettcher, Muehle, Stall) im NEUEN Ravensmoor (Area `stadt`) an ihre Platzhalter-
Boxen einbauen - so wie Zimmermannshaus (N1) und Schmiede (B1) es schon sind.

Regeln: `AGENTS.md` (Branch, pull/push, Spuren) + `CLAUDE.md` Regel 9 (Risiko-
Checkliste) und Regel 14 (**NUR `stadt`, das alte Dorf `village` NIE anfassen**).

---

## 1. Der Mechanismus (schon fertig - du fuellst nur die Liste)

Alles laeuft ueber EINE Tabelle in `src/scenes/WorldScene.ts`:

```ts
private static readonly GEB3D_BOXEN = [
  { box: 'N1', id: 'haus',     url: 'houses/medieval_carpenter_house_3d_runtime.json', yaw: 210 },
  { box: 'B1', id: 'schmiede', url: 'houses/forge/medieval_forge_3d_runtime.json',     yaw: 0 },
] as const;   // <- hier je Gebaeude EINE Zeile ergaenzen
```

Pro Zeile: `box` = Dorfplan-Box-Id (Platzhalter), `id` = eindeutiger Schluessel,
`url` = Pfad zum `*_runtime.json` (relativ zu `assets/`), `yaw` = Start-Drehung.

Den Rest macht `starteGebaeude3d()` + `Gebaeude3DWelt` (`src/gfx/gebaeude3dWelt.ts`)
**automatisch aus dem JSON**: Rendern (three.js -> Sprite), Kollision
(`collision_guides`), Innenraum EG/OG, Dach-Ausblendung beim Betreten, Tueren.
Du musst NICHTS an der Runtime aendern - nur die Zeile hinzufuegen und im
Dorf-Editor Drehung/Groesse feinjustieren.

**Groesse** ist global (`ppm`, Pixel je Meter) fuer ALLE 3D-Gebaeude
(`getSettings().gebaeude3d.ppm`, Standard 16), im Dorf-Editor live einstellbar
und persistent. **Drehung** ist je Gebaeude (`settings.gebaeude3d.drehung[id]`).

---

## 2. Vorhandene Assets (`assets/houses/*/*_runtime.json`)

| Asset (url) | Gebaeude |
|---|---|
| `houses/medieval_carpenter_house_3d_runtime.json` | Zimmermannshaus (schon: N1) |
| `houses/forge/medieval_forge_3d_runtime.json` | Schmiede (schon: B1) |
| `houses/bakery/medieval_bakery_house_3d_runtime.json` | Baeckerei |
| `houses/mill/medieval_mill_house_3d_runtime.json` | Muehle (Wassermuehle) |
| `houses/apothecary/medieval_apothecary_house_3d_runtime.json` | Apotheke |
| `houses/butcher/medieval_butcher_house_3d_runtime.json` | Metzger |
| `houses/cooperage/medieval_cooperage_house_3d_runtime.json` | Boettcherei/Kueferei |
| `houses/stable/medieval_stable_house_3d_runtime.json` | Stall |

## 3. Die Platzhalter-Boxen in `stadt` (`src/data/dorfplan.ts`, `typ: 'gebaeude'`)

| Box | Label | Position x,y | Groesse (Kacheln) |
|-----|-------|--------------|-------------------|
| B1 | Schmiede | 12,56 | 8x7 - **belegt (forge)** |
| B2 | Wirtshaus | 40,55 | 7x6 |
| B3 | Backhaus | 74,55 | 6x6 |
| B4 | Kirche | 92,38 | 10x12 |
| B5 | Fronhof | 80,60 | 16x17 |
| B6 | Muehle | 107,84 | 7x7 (am echten Ostfluss) |
| B7 | Muellerhaus | 104,76 | 5x5 |
| B8 | Zehntscheune | 74,90 | 8x6 |

(N1-N7, S1-S6 = generische Wohnhaeuser `typ: 'wohnhaus'`, 6x6.)

---

## 4. Zuordnung - was klar ist, was der Autor entscheiden muss

**Sofort einbauen (eindeutig):**
- Baeckerei -> **B3** (Backhaus)
- Muehle -> **B6** (Muehle, Wassermuehle am Ostfluss)

Als neue Zeilen (yaw ist nur ein Startwert, im Editor feinjustieren):
```ts
{ box: 'B3', id: 'baeckerei', url: 'houses/bakery/medieval_bakery_house_3d_runtime.json', yaw: 0 },
{ box: 'B6', id: 'muehle',    url: 'houses/mill/medieval_mill_house_3d_runtime.json',     yaw: 0 },
```

**Bitte den Autor fragen, NICHT raten** (keine passende Box mit passendem Label):
- **Apotheke** - Magdalena ist die Kraeuterfrau; welches Wohnhaus/welche Box?
- **Metzger** - welche Box?
- **Stall** - beim Bauernhof/der Muehle? Eigene POI-Box?
- **Boettcherei** - laut `docs/design/01-STORY-WELT-FIGUREN.md` sitzen Kuefer/
  Boettcher im ZWEITEN Dorf (Akt 3), nicht in Ravensmoor. **Wahrscheinlich hier
  NICHT einbauen** - beim Autor rueckversichern.

Boxen ohne Asset (Wirtshaus, Kirche, Fronhof, Muellerhaus, Zehntscheune) bleiben
vorerst Platzhalter - dafuer gibt es (noch) kein 3D-Modell.

---

## 5. Ablauf je Gebaeude

1. Zeile in `GEB3D_BOXEN` ergaenzen.
2. `npm run dev`, ins Spiel, Area `stadt` (Neues Spiel oder Speicherstand).
3. Dorf-Editor: Taste **P**. Die Host-Box waehlen -> die 3D-Regler erscheinen
   (Drehung +/-, Groesse +/-). Drehung so, dass die Tuer zum Weg zeigt; Groesse
   (ppm, global) so, dass alle Gebaeude stimmig sind. Position/Groesse sind
   persistent (`settings.gebaeude3d`).

## 6. Abnahme-Checkliste (CLAUDE.md Regel 9 + 10)

- [ ] Gebaeude steht auf seiner Box, Tuer zum Weg, Groesse stimmig zu den anderen.
- [ ] **Rein UND wieder raus** laufen (Regel 9.2): Kollision haelt (man laeuft
      nicht durch Waende), die Tuer laesst durch, das Dach blendet innen aus.
- [ ] Innen: EG begehbar; falls das Modell ein OG/Treppe hat, auch das pruefen.
- [ ] **Kollision aus dem JSON pruefen** - falls ein Gebaeude keine
      `collision_guides` mit echten Zentren hat, meldet das (dann ist das Modell
      unfertig, nicht der Einbau).
- [ ] Speichern/Laden: Position/Drehung/Groesse bleiben erhalten.
- [ ] `npx tsc --noEmit` gruen, `npx vitest run` gruen.
- [ ] Committen + pushen (`AGENTS.md` Regel 3), Uebergabe-Notiz in der Message.

## 7. Grenzen

- NUR Area `stadt`. Das alte Dorf `village` bleibt unangetastet (Regel 14).
- Keine Spiel-Logik aendern - nur die `GEB3D_BOXEN`-Zeilen + Editor-Justierung.
- Passt ein Modell nicht auf seine Box (Fussabdruck viel groesser/kleiner):
  melden, nicht die Box-Groesse im Auslieferungs-Layout umschreiben ohne Ruecksprache.
