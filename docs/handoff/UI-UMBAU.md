# Arbeitsauftrag (Codex): Gesamtes UI umbauen (HUD, Menue, Charakter, Inventar, Shop, Dialog)

**Ziel:** Du darfst Optik + Layout der KOMPLETTEN Benutzeroberflaeche frei neu bauen.
Damit das laufende Spiel dabei nicht zerbricht, gilt der **Signatur-Vertrag** unten
(§5) - solange du den einhaeltst, ist alles andere deine Gestaltung.

Regeln: `AGENTS.md` (Branch, pull/push, Spuren) + `CLAUDE.md` (v.a. Regel 9
Risiko-Checkliste, Regel 11 UI-Grundregeln). Sprache: Spielertexte + Kommentare
Deutsch, kein "-" Gedankenstrich, keine eingebrannte AI-Schrift aus Referenzbildern.

---

## 1. Die wichtigste Sache zuerst (Bruchgefahr Nr. 1)

**Das In-Game-UI wird NICHT von `UIScene` gerendert.** `src/scenes/UIScene.ts` ist
eine leere Huelle. Das ganze HUD/Panel-System lebt in **`src/scenes/WorldScene.ts`**
(erbt von `src/world/CombatScene.ts`) - dort wird jedes UI-Objekt instanziiert und
einer Kamera zugeordnet. `UIProbe` ("MENUE-PROBE (UI)") ist nur ein isoliertes
Testbild des DOM-Menue-Systems.

Es gibt **ZWEI getrennte UI-Systeme** - beide bleiben so, du baust beide um:
- **A) Phaser-Geruest** (In-Game: HUD, Charakter/Inventar, Shop, Truhe, Dialog):
  `Phaser.Container` + `Graphics` + `Text`, direkt in der Szene.
- **B) DOM/CSS-Geruest** (Vollbild-Menues: Hauptmenue-Optik, Einstellungen, UIProbe):
  `src/ui/medievalUi.ts` + `src/ui/medieval-ui.css`, Overlay-DIV `#mv-root` ueber dem Canvas.

---

## 2. Datei-Landkarte (was wo liegt)

### `src/ui/` - Phaser-In-Game-UI
| Datei | Was | Klasse |
|---|---|---|
| `hud.ts` (963 Z.) | HUD: Lebens-/Manakugel, Tasten-Hotbar (10) + Maus-Leiste (5), Traenke, Statuszeile, XP-Balken, Tooltip, Belegungs-Menue, Drag&Drop | `Hud` |
| `panels.ts` (1053 Z.) | Charakter+Inventar (EIN Fenster mit Reitern CHARAKTER/FAEHIGKEITEN/HEER/EBENE/KARTE/AUFGABEN/KONTAKTE/ALBUM/STATISTIK) | `UIPanels` |
| `shop.ts` | Haendler (Kaufen/Verkaufen/Schmieden) | `ShopUI` |
| `stash.ts` | Lager-Truhe (Inventar <-> Hof-Lager) | `StashUI` |
| `dialog.ts` | NPC-Dialoge (Portrait, Auswahl). **Enthaelt die UI-Kernhelfer `fixUiScroll` + `macheFensterZiehbar`** | `DialogUI` |
| `heldEditor.ts` | Charakter-Aussehen-Editor | `HeldEditor` |
| `questTracker.ts` | Quest-Verfolger-Overlay | `QuestTracker` |
| `touch.ts` | Touch-Steuerung (Handy) | `TouchControls` |
| `lichtPanel.ts` / `devKonsole.ts` | Dev-Panels (Taste L / F10) - Optik gern mit, nicht Pflicht | `LichtPanel` / `DevKonsole` |

### `src/ui/` - DOM-Menue-System
| Datei | Was |
|---|---|
| `medievalUi.ts` | Bausteine: `mvPanel/mvKnopf/mvTabs/mvBalken/mvKarte/mvSlots/mvSchalter/mvStatReihe/mvAbzeichen/mvTrenner` |
| `medieval-ui.css` | Stylesheet (Holzrahmen, Pergament, Messing) |
| `settingsMenue.ts` | Layout des Einstellungs-Menues (`baueSettingsMenue()`) |
| `mvTexturen.ts` | Textur-Hook: deine Bild-Assets in die CSS-Variablen (`wendeMvTexturenAn()`) |

### Szenen
| Datei | Was |
|---|---|
| `src/scenes/TitleScene.ts` | Hauptmenue (Neues Spiel/Laden/Einstellungen + Proben-Knoepfe) |
| `src/scenes/SettingsScene.ts` | Einstellungen (Daten+Callbacks -> `settingsMenue.ts`) |
| `src/scenes/UIProbe.ts` | "MENUE-PROBE (UI)" - Testbild des DOM-Systems |
| `src/scenes/WorldScene.ts` | **Zentraler Verdrahtungspunkt** - instanziiert alle In-Game-UI-Objekte |

---

## 3. Woher die UI ihre Zahlen/Inhalte nimmt (nicht erfinden)

- **Spielerzustand**: `src/logic/playerState.ts` (`PlayerState`) - `hp/mana/pot/mpot`,
  `stats.maxhp/maxmana`, `level/xp/xpNext`, `inv`, Ausruestung (`weapon/armorIt/ring/
  schildIt/bogen`), `schools[...]` (Freischalt-Stufen), `spellCds/abilityCds`.
- **Werte-Rechnung**: `src/logic/progression.ts` (`calcStats`, `statsWith`).
- **Zauber/Faehigkeiten**: `SPELLS` / `ABILITIES` (`src/data/balancing.ts`).
- **Einstellungen + Slot-Belegung + UI-Versaetze**: `src/logic/settings.ts`
  (`getSettings()/saveSettings()`), Felder `tasten`/`maus` (Belegung), `ui.*`
  (Fensterpositionen), `hudStil`, `kb` (Tastenbelegung).
- **Shop/Items**: `src/data/shops`, `src/logic/loot.ts`.
Du zeichnest nur - die Daten kommen aus diesen Quellen ueber die bestehenden Getter.

---

## 4. Assets (deine Bilder)

Konvention steht schon: `assets/ui/README.md` (Menue-Texturen: `parchment/wood/button`,
kachelbar, multiply-Blend, ueber `mvTexturen.ts` eingehaengt) und
`assets/ui/hud/README.md` (die flachen HUD-Bauteile: leere Orbs, Slot, Tasten-/
Maus-Bloecke, Trank-Plakette, Statusleiste - dynamische Zahlen/Icons DARUEBER zeichnen,
Fallback = bestehende `Graphics`-Optik). Halte dich an diese beiden READMEs; leg neue
Bilder dort ab und haeng sie in `hud.ts` (Vite-URL-Import) bzw. `mvTexturen.ts` ein.

---

## 5. DER VERTRAG - diese Signaturen MUESSEN erhalten bleiben

Optik/Layout frei; aber Konstruktoren, Methodennamen und Flags bleiben, sonst
bricht die Verdrahtung in `WorldScene.ts`/`CombatScene.ts`.

| Modul | Muss bleiben |
|---|---|
| **Hud** | `new Hud(scene, ()=>PlayerState, ()=>WeaponClass, (id:string)=>void)`; `update(extra:string)`; `belegeBeiPunkt(x,y,id):boolean`; `klickBlockiert(ptr):boolean`; `destroy()`; die Export-Fns `mausLeisteAnkerX/tastenLeisteMitteX/hotbarMitteX/orbHpAnkerX/orbMpAnkerX(w)` |
| **UIPanels** | `toggleInventory()`, `toggleCharacter()`, `openTab(id)`, `closeAll()`, `refresh()`, `get blocked`, `destroy()`; die Callback-/Getter-Anker `onAssignToSlot/onUseScroll/onChanged/onRtsModus` + `getJournal/getQuestLog/getVerfolgtId/getAlbumZeilen/getStatistikZeilen/getKontakteZeilen/getKarte/getGebietGross/getEbeneKarte/toggleKarteDev` |
| **ShopUI** | `openShop(id,title,offers,opts)`, `openTraveling(week)`, `close()`, Feld `open`, `destroy()`; Anker `rabatt/lager/dorfVerkauf` |
| **StashUI** | `openStash()`, `close()`, Feld `open`, `destroy()`; Ctor `(scene, sfx, getPlayer, getLager)` |
| **DialogUI** | `show(...)`, `close()`, Feld `open`, `onClose`/`onPage` |
| **HeldEditor** | `toggle()`, `openEditor()`, `close()`, `relayout()`, `get blocked`, Anker `onApply` |
| **UI-Helfer** | `fixUiScroll(container)` und `macheFensterZiehbar(scene, c, breite, opts)` in `dialog.ts` - Name + Verhalten behalten (werden aus Shop/Stash/WorldScene mitbenutzt) |

**`uiBlocked()`-Kette** (`CombatScene.ts`): JEDES Fenster MUSS ein `open`- bzw.
`blocked`-Flag exportieren. Fehlt es, schlagen Weltklicks durch das Fenster (der
Held schlaegt zu / laeuft los, waehrend das Fenster offen ist). Neues Fenster =
neues `open/blocked`-Flag in die Kette eintragen.

**Aktions-ID-Vokabular** (`hud.ts`, `AKTIONEN`/`SLOT_KAT`): Die String-IDs der
Hotbar-Aktionen sind ein GETEILTES Vokabular mit `runActionFromBar(id)` in
WorldScene. Umbenennen bricht Hotbar-Klick UND Inventar-Drag. Willst du sie
aendern, aendere beide Seiten.

**Belegungs-Format**: Der HUD liest UND schreibt die Slot-Belegung direkt in
`getSettings().tasten`/`.maus` (Format `{store, feld}`) und ruft `saveSettings()`.
Dieses Format + die Stores behalten (oder sauber migrieren).

---

## 6. Die Zwei-Kamera-Falle (Pflichtwissen)

Es gibt zwei Kameras: **Welt-Kamera** (`cameras.main`, gezoomt, folgt dem Helden)
und **UI-Kamera** (`this.uiCam`, ungezoomt, volle Schaerfe). `sortiereKameras()`
(laeuft jeden Frame) ordnet zu: **Objekt mit `scrollFactorX === 0` -> UI-Kamera**,
sonst Welt-Kamera.

Daraus folgt fuer JEDES neue UI-Objekt:
1. **`setScrollFactor(0)`** setzen - sonst landet es faelschlich in der Welt (scrollt weg).
2. Container am Ende mit **`fixUiScroll(container)` als ALLERLETZTEM Aufruf nach ALLEN
   `.add()`** abschliessen. Grund: Phasers `scrollFactor` gilt nur fuers Zeichnen,
   NICHT fuer die Input-Hitboxen der Kinder - ohne `fixUiScroll` sitzen die
   Klickflaechen um den Kamera-Scroll versetzt daneben -> **tote Knoepfe** (CLAUDE.md
   Regel 9.4, "Sieg-Fenster-Fehler, 3 Runden unentdeckt").
3. **Fenster ziehen**: nur ueber `macheFensterZiehbar` bzw. **Schirmkoordinaten-Delta
   ab `dragstart`** - NIE lokale `dragX/dragY` auf die Container-Position addieren
   (schaukelt sich auf, CLAUDE.md 9.4).
4. **Resize**: `onResize()` baut Kameras + Lichttextur neu und ruft `panels.refresh()`
   / `heldEditor.relayout()`. Zentriert gebaute Fenster muessen bei Resize NEU
   aufgebaut werden (CLAUDE.md 9.5) - nicht in eine laufende Szene hinein skalieren.

## 7. UI-Regel 11 (Autor, verbindlich)

**ALLE Fenster und Kaesten muessen verschiebbar sein** (Griff in der Kopfzeile,
Schirmkoordinaten-Delta). Groessere Fenster zusaetzlich skalierbar (Eckgriff oder
A+/A-). Position (und Groesse) werden in `settings.ui.*` gespeichert. Ein neues
Fenster ohne Griff gilt als unfertig.

---

## 8. Abnahme (es gibt KEINE UI-Unit-Tests - Sicherheit haengt am Vertrag)

HUD/Panels/Shop/Stash/Dialog/Settings werden laut CLAUDE.md nur per Browser/
Screenshot verifiziert. Deshalb nach dem Umbau **Stueck fuer Stueck** durchklicken:
- [ ] `npx tsc --noEmit` gruen (faengt gebrochene Signaturen sofort), `npx vitest run` gruen.
- [ ] HUD: Leben/Mana/Traenke/Hotbar/Maus-Leiste zeigen echte Werte; Rechtsklick =
      Belegungs-Menue; Item aus dem Inventar auf einen Slot ziehen legt es ab.
- [ ] Charakter+Inventar (I/C): oeffnet, alle Reiter bauen, verschiebbar, schliesst,
      **Weltklick blockiert solange offen** (Held schlaegt NICHT zu).
- [ ] Shop (mit NPC "Handel"), Truhe (Lager), Dialog, HeldEditor, Einstellungen:
      oeffnen/schliessen, verschiebbar, Rueckweg sauber (DOM/Container abgebaut).
- [ ] **Rueckweg-/Kamera-Test**: Fenster oeffnen, waehrend die Kamera gescrollt ist
      (im Spiel herumlaufen, dann oeffnen) - Knoepfe muessen KLICKBAR bleiben.
      Fenster auf, Fenster zu, wieder auf. Fenstergroesse aendern und zurueck.
- [ ] Hauptmenue + "MENUE-PROBE (UI)" zeigen die neue Optik.
- [ ] Committen + pushen, Uebergabe-Notiz (was umgebaut, was noch offen).

## 9. Empfohlenes Vorgehen

Modul fuer Modul, nicht alles auf einmal - je Modul ein Commit. Reihenfolge-Vorschlag:
1. DOM-Menue-Optik (`medievalUi.ts`/CSS/`mvTexturen`) + Hauptmenue + Einstellungen -
   das ist am staerksten isoliert.
2. HUD (`hud.ts`) mit den flachen Bauteil-Assets.
3. Charakter/Inventar (`panels.ts`) - der groesste Brocken, viele Reiter.
4. Shop/Truhe/Dialog/HeldEditor.

Bei jedem Modul: erst die bestehende Datei LESEN, dann Optik umbauen, Signaturen
aus §5 unveraendert lassen. Unsicher, ob etwas Signatur oder Interna ist? Melden,
nicht raten.
