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
1. Material-Datenbank + Dorf-Lager + täglicher Tick (Holz/Stein/Weizen) + Anzeige.
2. Verarbeitungskette: Mühle-Gebäude + Weizen->Mehl->Brot.
3. Händler-Bestände an das Lager koppeln (Kauf/Verkauf/Spende).
4. Brunnen hochskalieren + Blut-bei-Einfall + Wasser.
5. Sichtbares Tagwerk / Träger (Politur).

## Offene Balancing-Fragen für den Autor
- Genaue Tagesmengen (z. B. 2 Holz, 1 Stein, 2 Weizen, 1 Brot/Tag?).
- Soll der Spieler die Wirtschaft durch Spenden/Aufträge spürbar ankurbeln?
- Brauchen wir Wasser als echten Verbrauch (z. B. Felder brauchen Wasser),
  oder nur als Atmosphäre (Brunnen verseucht = Stimmung)?
