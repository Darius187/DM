# Dorf-Wirtschaft Ravensmoor - Entwurf (Runde 51)

Durchdachter Plan für den Wirtschafts-Kreislauf, abgeleitet aus dem Autor-Diktat.
Wird in Phasen gebaut; jede Phase einzeln im Browser verifizierbar. Werte leben
in src/data/ (leicht änderbar). Zustand wird im Spielstand gespeichert.

## 1. Materialien (Datenbank)
Eine zentrale Tabelle src/data/material.ts:
- holz, stein, weizen, mehl, brot, wasser (eisen/stein gibt es als Rohstoff schon).
- Je Material: Name, Basispreis, Symbol/Icon, ob handelbar.

## 2. Dorf-Lager (Vorratskammer)
Ein zentraler Dorfbestand `dorfLager: Record<Material, number>` (im Save).
- Produktion füllt es, Verbrauch/Verkauf leert es.
- Sichtbar im Gehöft-Lager bzw. in einem kleinen "Vorratskammer"-Fenster.
- Der Spieler kann Material SPENDEN (ins Lager) - beschleunigt Wiederaufbau/Angebot.

## 3. Täglicher Produktions-Tick (beim Tageswechsel)
Beim Tageswechsel (sleep / Tag bricht an) läuft EIN Wirtschafts-Tick:
- Holzfäller (Zimmermann, arbeit 'hacken'): +X Holz. Sichtbar: ein Baum am
  Dorfrand fällt, wächst nach GATHER.baumRespawnTage nach.
- Steinklopfer am STEINWERK (neues kleines Gebäude/Bruch): +X Stein/Tag.
- Bauern (2 Felder, arbeit 'feld'): +1 Weizen je bearbeitetem Feld (also bis 2/Tag).
- Müller an der MÜHLE: wandelt vorhandenen Weizen -> Mehl (1:1 bis Kapazität).
- Bäcker (arbeit 'backen'): wandelt Mehl -> Brot.
- Brunnen: +X Wasser, SOLANGE er nicht verseucht ist (siehe 5).
=> Kette Weizen -> Mehl -> Brot entsteht über mehrere Tage von selbst.

## 4. Händler an das Lager koppeln
- Der fahrende Händler / Bäcker bietet nur an, was im Lager liegt:
  Brot nur, wenn Brot da ist; Holz/Weizen-Überschuss zum Verkauf.
- Kauf zieht aus dem Lager (Brot kaufen -> 1 Brot weg -> muss neu erwirtschaftet
  werden). Verkauf (Spieler -> Holz/Weizen) füllt das Lager.
- Mengen begrenzt durch den Bestand (kein unendlicher Vorrat mehr).

## 5. Brunnen + Wasser + Blut-bei-Einfall
- Brunnen-Grafik hochskalieren (größer, evtl. 2x2-Fundament).
- Bei Monster-Einfall (einfallAktiv): der Brunnen wird BLUTIG - Blut-Tiles
  ringsum, blutige Brunnen-Grafik, Wasserproduktion stoppt ("keiner kriegt
  mehr Wasser"), bis das Dorf gesäubert ist / der Einfall vorbei ist.

## 6. Sichtbares Tagwerk (Politur)
- NPCs arbeiten sichtbar (gibt es schon: 'hacken'/'feld'/'backen'/'fuettern').
- Optional: Träger-NPC bringt Material vom Arbeitsplatz ins Lager.

## Bau-Reihenfolge (Phasen)
1. [FERTIG] Dorf-Lager + täglicher Tick (Holz/Stein/Eisen/Kohle/Kräuter/Weizen)
   + ABGABEN an den Fürsten + Anzeige beim Schulzen.
2. [PLATZHALTER LÄUFT] Verarbeitungskette als automatischer Tagestakt:
   Weizen->Mehl->Brot und Eisen+Kohle->Barren (Werte in src/data/wirtschaft.ts
   -> VERARBEITUNG; verifiziert über 5 Tage). OFFEN/ZIEL: die Bewohner
   Müller/Bäcker/Schmied arbeiten es SICHTBAR ab und gaten die Kette (lebt der
   NPC? im Dorf? -> sonst stockt die Stufe). Helfer in WorldScene stehen schon.
3. Händler-Bestände an das Lager koppeln (Kauf/Verkauf/Spende).
4. [FERTIG] Brunnen hochskaliert + Blut-bei-Einfall.
5. Sichtbares Tagwerk / Träger (Politur) - greift in Phase 2's ZIEL über.

## Offene Balancing-Fragen für den Autor
- Genaue Tagesmengen (z. B. 2 Holz, 1 Stein, 2 Weizen, 1 Brot/Tag?).
- Soll der Spieler die Wirtschaft durch Spenden/Aufträge spürbar ankurbeln?
- Brauchen wir Wasser als echten Verbrauch (z. B. Felder brauchen Wasser),
  oder nur als Atmosphäre (Brunnen verseucht = Stimmung)?

---

# Ressourcen-Konzept (Brainstorm Runde 51) - ZUERST das "Wozu"

Leitgedanke: KEINE Ressource ohne Zweck. Und der große Zweck ist der KRIEG -
die Wirtschaft befeuert die ARMEE, die du führst. Damit ergibt alles Balance-
Sinn (Sammeln/Wirtschaft -> stärkere Armee -> Schlachten gewinnen -> bis zum
Kloster vordringen).

## Vorhanden (schon im Code)
Rohstoffe: Holz, Stein, Eisen, Kohle, Kräuter, Fell, Wolle. Dazu Gold (Währung),
Weizen (Feld) und der Brunnen (Wasser). Bisherige Senken: Aufbau (Holz/Stein/
Eisen+Gold), Tränke (Kräuter), Essen (Feld), Schmied.

## Jede Ressource -> ihr KRIEGS-Zweck (die Senke)
| Ressource | Wofür (Senke / Nutzen) |
|---|---|
| **Gold** (Mine) | bezahlt den Fürsten -> mehr Soldaten/Söldner = ARMEEGRÖSSE |
| **Eisen + Kohle -> Barren** (Schmelze) | Schmied: Waffen/Rüstung -> Soldaten STÄRKER |
| **Holz** | Palisaden, Türme, Pfeile, Belagerungsgerät (Katapult/Rammbock) |
| **Stein** | Mauern, Tore, Katapult-Munition (Felsbrocken) |
| **Weizen -> Mehl (Mühle) -> Brot (Bäcker)** | VERPFLEGUNG: mehr/frische Soldaten, Bevölkerung satt |
| **Kräuter -> Tränke/Verbände** | Verwundete Soldaten heilen/wiederbeleben zwischen Schlachten |
| **Fell -> Leder** | leichte Rüstung, WARME Kleidung (Schnee-Rückzug NW), Köcher |
| **Wolle -> Stoff** | Stoffrüstung, Verbände, BANNER (Moral-Buff der Truppen) |
| **Wasser** (Brunnen) | Dorf/Moral; bei Einfall verseucht (kein Wasser) -> Druck |

## Verarbeitungs-Gebäude (Zwischenprodukte)
- **Schmelze/Esse**: Eisen + Kohle -> Eisenbarren.
- **Mühle**: Weizen -> Mehl.  **Backhaus**: Mehl -> Brot.
- **Gerberei** (neu?): Fell -> Leder.  **Weberei**: Wolle -> Stoff.
- **Schmied**: Barren (+Holz/Leder) -> Soldaten-Ausrüstung.

## DER Balance-Hebel: Wirtschaft -> Armee
- **Gold** = Armee-GRÖSSE (Soldaten anwerben).
- **Eisen/Barren** = Armee-SCHLAGKRAFT (Ausrüstung).
- **Brot** = Armee-VERFÜGBARKEIT (Verpflegung; kein Brot = weniger Truppen).
- **Kräuter** = Armee-AUSDAUER (Heilung zwischen Schlachten).
=> So gatet die Basis die Progression: das Kloster greift man erst an, wenn
   Armee + Belagerung + Verpflegung reichen. Natürliches Tempo, kein Grind ins Leere.

## Held-BAUMENÜ (Idee, Genre-Misch)
Taste B öffnet ein Baumenü; mit der Maus platzieren (RTS-Stil), Kosten aus dem
Dorf-Lager:
- **Palisade / Tor / Barrikade** (Holz/Stein) - Engpässe, Helm's-Klamm-Verteidigung.
- **Wach-/Bogenturm** (Holz) - Bogenschützen schießen von oben.
- **Katapult** (Holz+Stein+Eisen) - Verteidigung UND Belagerung (Felsbrocken).
- **Rammbock** (Holz+Eisen) - Tore von Lager/Kloster aufbrechen (Angriff).
- **Feldlazarett / Lagerfeuer** (Holz+Kräuter) - Soldaten im Feld heilen.
- **Schmiede-Vorposten** - Soldaten unterwegs aufrüsten.

## Offene Balance-/Design-Fragen (für dich)
- Tagesmengen je Quelle (Holz/Stein/Eisen/Gold/Weizen) - grobe Startwerte?
- Soll GOLD die Armee-Währung sein (statt/neben dem Helden-Gold)?
- Wie viele neue Gebäude wollen wir wirklich (Schmelze/Mühle/Gerberei/Weberei),
  oder bündeln wir (z. B. nur Schmelze + Mühle, Rest abstrahiert)?
- Baumenü: nur in Kriegs-Phasen oder immer? Wie viele Bautypen zum Start?
- Sollen verlorene Soldaten dauerhaft tot sein (Gewicht der Taktik) oder
  zwischen Schlachten nachrekrutierbar?
