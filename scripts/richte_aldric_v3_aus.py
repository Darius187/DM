#!/usr/bin/env python3
"""Misst den Fusspunkt-Versatz im Aldric-V3-Figurenpaket und schreibt ihn als Daten.

Hintergrund (R246): Codex hat das V3-Paket selbst als
"rejected-broken-do-not-integrate" markiert, Begruendung "springt in
Proportion und Bewegung". Nachgemessen ist das ein REINER RASTERVERSATZ:
Geh- und Kampfframes stammen aus zwei Generierungen, deren Figuren
unterschiedlich hoch in der Zelle sitzen. Die Figur selbst ist gleich
gross (Hoehendifferenz nur 1-5 px, posenbedingt), aber ihr Fusspunkt
springt je Richtung um bis zu 18 px.

WICHTIG: Der Versatz wird NICHT in die PNGs gerechnet. Ein erster Versuch,
die Zellen zu verschieben, hat lange Waffen abgeschnitten (Hellebarde
allein 9837 Pixel) - Klingen ragen absichtlich bis an den Zellrand. Der
Versatz wird stattdessen als Tabelle ins Manifest geschrieben; wer das
Sheet zeichnet (Werkbank, spaeter der Spiel-Renderer), verschiebt beim
Zeichnen um diesen Betrag. Damit geht kein Pixel verloren, und alle
Ebenen derselben Zelle bleiben zueinander ausgerichtet, weil sie
denselben Versatz bekommen.

Aufruf:
    python scripts/richte_aldric_v3_aus.py assets/sprites/hero-combat-v2/aldric-v3
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ZELLE = 128
SPALTEN = 9
ZEILEN = 4
RICHTUNGEN = ["down", "left", "right", "up"]
# Fusspunkt-Konvention des Spiels (Y-Sortierung sitzt auf der Sprite-Unterkante)
ZIEL_FUSS = 124
REFERENZ = "body-hemd-full-9x4.png"


def fusspunkt(bild: Image.Image, zeile: int, spalte: int) -> int | None:
    """Unterkante der belegten Pixel in einer Zelle, oder None wenn leer."""
    kasten = bild.crop((spalte * ZELLE, zeile * ZELLE, (spalte + 1) * ZELLE, (zeile + 1) * ZELLE))
    grenzen = kasten.getbbox()
    return grenzen[3] if grenzen else None


def versatz_tabelle(referenz: Image.Image) -> dict[str, list[int]]:
    """Je Zelle: um wie viele Pixel muss beim Zeichnen nach unten (+) verschoben werden?"""
    tabelle: dict[str, list[int]] = {}
    for zeile, richtung in enumerate(RICHTUNGEN):
        tabelle[richtung] = [
            0 if (f := fusspunkt(referenz, zeile, spalte)) is None else ZIEL_FUSS - f
            for spalte in range(SPALTEN)
        ]
    return tabelle


def pruefe_koerper(ordner: Path, tabelle: dict[str, list[int]]) -> list[str]:
    """Belegt, dass der Versatz fuer ALLE Koerpervarianten gilt (nicht nur die Referenz)."""
    meldungen = []
    for pfad in sorted(ordner.glob("body-*-full-9x4.png")):
        bild = Image.open(pfad).convert("RGBA")
        schlimmster = 0
        for zeile, richtung in enumerate(RICHTUNGEN):
            for spalte in range(SPALTEN):
                fuss = fusspunkt(bild, zeile, spalte)
                if fuss is None:
                    continue
                rest = abs(fuss + tabelle[richtung][spalte] - ZIEL_FUSS)
                schlimmster = max(schlimmster, rest)
        meldungen.append(f"  {pfad.name:34s} Restabweichung nach Ausrichtung: {schlimmster} px")
    return meldungen


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    ordner = Path(sys.argv[1])
    referenz_datei = ordner / REFERENZ
    if not referenz_datei.exists():
        print(f"Referenzkoerper fehlt: {referenz_datei}")
        return 1

    tabelle = versatz_tabelle(Image.open(referenz_datei).convert("RGBA"))
    print(f"Versatz je Richtung und Frame (Pixel nach unten, Ziel-Fusspunkt Y={ZIEL_FUSS}):")
    for richtung in RICHTUNGEN:
        print(f"  {richtung:6s} {tabelle[richtung]}")

    print("\nGilt der Versatz fuer alle Koerpervarianten?")
    for zeile in pruefe_koerper(ordner, tabelle):
        print(zeile)

    manifest = ordner / "hero-layers-v3.json"
    if not manifest.exists():
        print(f"\nManifest fehlt: {manifest}")
        return 1
    daten = json.loads(manifest.read_text(encoding="utf-8"))
    daten["status"] = "fusspunkt-versatz-vermessen"
    daten["footAnchor"] = [64, ZIEL_FUSS]
    daten["frameOffsetY"] = tabelle
    daten.pop("rejectedReason", None)
    daten.pop("supersededBy", None)
    hinweis = (
        "frameOffsetY: beim Zeichnen je Zelle um diesen Betrag nach unten verschieben, dann "
        "sitzt der Fusspunkt in allen 36 Frames auf Y=124. Der Versatz stammt aus zwei "
        "unterschiedlich ausgerichteten Generierungen (Gehen/Kampf) und ist reiner "
        "Rasterversatz - die Figur selbst springt nicht. Ermittelt mit "
        "scripts/richte_aldric_v3_aus.py."
    )
    notizen = [n for n in daten.get("notes", []) if not n.startswith("frameOffsetY")]
    daten["notes"] = notizen + [hinweis]
    manifest.write_text(json.dumps(daten, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nManifest aktualisiert: {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
