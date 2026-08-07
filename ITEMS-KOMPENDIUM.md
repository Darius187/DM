# Gegenstands-Kompendium (Überblick)

Was es aktuell im Spiel an Item-Arten gibt. Im **Entwicklungskasten (F10)** legt der
Knopf **„ALLE GEGENSTÄNDE INS INVENTAR"** je ein Stück von allem (plus Tränke) ins
Inventar - zum Testen jeder Waffe/Rüstung/Rolle/Foliant.

Quelle: `src/data/items.ts` (Tabellen) + `src/data/balancing.ts` (Folianten).
Werte = Basisschaden (Waffen) bzw. Rüstungsbonus.

## Nahkampfwaffen (8)
| Name | Wert | Klasse |
|---|---|---|
| Rostige Klinge | 5 | Schwert |
| Kurzschwert | 8 | Schwert |
| Streitkolben | 11 | Kolben |
| Langschwert | 14 | Schwert |
| Streitaxt | 16 | Axt |
| Falchion | 18 | Schwert |
| Hellebarde | 20 | Stange |
| Kriegshammer | 22 | Wucht |

## Bögen (3)
| Name | Wert |
|---|---|
| Jagdbogen | 9 |
| Armbrust | 14 |
| Kriegsbogen | 17 |

## Zauberstäbe (2)
| Name | Wert |
|---|---|
| Knorriger Stab | 7 |
| Kristallstab | 15 |

## Schilde (5)
| Name | Rüstbonus |
|---|---|
| Holzschild | 1 |
| Rundschild | 2 |
| Beschlagener Rundschild | 3 |
| Eisenschild | 4 |
| Turmschild | 5 |

## Rüstungen (5)
| Name | Rüstbonus |
|---|---|
| Lumpen | 1 |
| Lederwams | 3 |
| Gambeson | 5 |
| Kettenhemd | 8 |
| Plattenrock | 11 |

## Ringe (4)
Knochenring · Siegelring · Silberring · Eisenring  (mit zufälligen Affixen)

## Edelsteine (3)
| Name | Element |
|---|---|
| Feueropal | Feuer |
| Frostsplitter | Eis |
| Schattenperle | Schatten |

## Zauberrollen (8, je 5x)
Heiliges Licht · Frostnova · Kettenblitz · Feuerwand · **Feuerwalze** · Eisregen · Gewitter · Windstoß
(Rolle aus dem Inventar auf einen Aktions-Slot ziehen, dann wirken.)

## Folianten / Bücher (6, je 10x)
Gewitter · Eisregen · Feuerwand · Feuerwalze · Windstoß · Heiliges Licht
(Seltene Buch-Schriftrollen mit 10 Anwendungen.)

## Nahrung (4)
Brot · Trockenfleisch · Wurst · Speck  (Lebens-Regeneration auf Zeit)

---

**Nicht im Inventar (Zähler statt Item):** Heiltränke (Q), Manatränke (F), Elixiere,
Werkzeuge (Holzaxt, Spitzhacke) und Materialien (Holz, Eisen, Kohle). Der F10-Knopf
gibt zusätzlich 10 Heil- und 10 Manatränke.

**Summe testbarer Inventar-Gegenstände: 48.**
