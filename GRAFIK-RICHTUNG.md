# Grafik-Richtung (festgelegt Feedback-Runde 33)

Dieses Dokument hält fest, WIE Ravensmoor aussehen soll, damit jede Sitzung
und jedes neue Sprite-Paket dieselbe Richtung verfolgt. (Autor-Wunsch: "merk
dir das".)

## 1. Gewählter Weg: HYBRID

- Die **schöne Optik** kommt aus einem KI-Werkzeug (z. B. spritecook.ai) -
  erzeugt vom Autor, weil ich von hier aus keinen Zugriff auf solche Dienste
  habe.
- Die **Animation, Ausrüstungs-Logik und Kampf-Anbindung** baue ich im Spiel.
- Solange kein KI-Bild vorliegt, greift die **selbst gezeichnete Figur** als
  Rückfall - das Spiel ist immer vollständig spielbar.

## 2. Stil

- Düster, handfest, 1349 (Schwarzer Tod/Pest, spätmittelalterlich). Vorbild für das *Niveau* und die
  *Machart*: **The Slormancer** (klare Form + starkes Licht + gedeckte
  Palette) - NICHT kopieren, eigener Stil. Das helle, fröhliche Vorbild
  (Sea of Stars) ist ausdrücklich NICHT die Richtung.
- Lesbare Silhouette, weicher Schlagschatten, dunkler Umriss, Gesicht/Haar
  erkennbar, Ausrüstung sofort unterscheidbar (Robe/Platte/Leder).

## 3. Auflösung

- **Held: 64 px** (genug Platz für Gesicht, Goldzierde, sichtbare Ausrüstung).
- Gegner/Dorfvolk bleiben vorerst 32 px (der Autor ist mit ihnen zufrieden).
- Alle Maße zentral in `src/data/gfx.json` - ein späterer Wechsel ist eine
  Konfigurationszeile, kein Umbau.

## 4. Ausrüstung sichtbar (gebaut in Runde 33)

Der Held zeigt jetzt seine getragene Ausrüstung:

- **Vier Rüstungsstufen** (nach Rüstungswert, Schwellen in
  `src/data/helden.ts`): `stoff` -> `leder` -> `kette` -> `platte`.
- **Sechs Waffen in der Hand**: Schwert, Axt, Hellebarde (`stange`),
  Streitkolben (`wucht`), Bogen, Zauberstab (`stab`, neu).
- Figurname im Code: `spieler_<stufe>_<waffe>`.

## 5. Hot-Swap: so fallen deine KI-Bilder rein (funktioniert, browser-getestet)

Ordner **`assets/sprites/`**. Dateien je Rüstungsstufe:

```
spieler_<stufe>_<richtung>_<frame>.png
```

- `<stufe>`   = `stoff` | `leder` | `kette` | `platte`
- `<richtung>`= `unten` | `links` | `rechts` | `oben`
- `<frame>`   = `1` | `2` | `3` | `4`   (Gehzyklus)

Ein volles Stufen-Paket = 4 Richtungen x 4 Bilder = 16 PNG. Vier Stufen = 64.
Alternativ ein Atlas `spieler_<stufe>.png` + `spieler_<stufe>.json`.

**Kleinster Test:** Lege EINE Datei `assets/sprites/spieler_platte_unten_1.png`
ab - sobald der Held Platte trägt und nach unten blickt, erscheint dein Bild.

### Bild-Vorgaben

- 64 x 64 px (oder durchgehend gleich groß), **transparenter Hintergrund**.
- Füße am unteren Rand, Figur mittig - sonst "schwebt" oder versinkt sie.
- Gleicher Bildausschnitt/Drehpunkt über alle Bilder, sonst zappelt es.
- Dunkle Palette, kräftiger Umriss (siehe Stil oben).

### Lizenz (wichtig für ein verkäufliches Spiel)

- Nur Bilder mit **kommerziellen Rechten** (eigene KI-Ausgabe mit
  Nutzungsrecht) oder **CC0**. Kein CC-BY-SA / GPL.

## 6. Noch offen (nächste Bausteine)

- Schlag- und Block-Animation des Helden (eigene Frames, an den Kampf
  gekoppelt - mit dem Hieb-Bogen, den der Autor mag).
- Waffe als **überlagertes Teil**, damit sie auch auf hot-getauschten
  Stufen-Bildern sichtbar bleibt (dann genügt 1 Körper-Paket je Stufe ohne
  Waffe + getrennte Waffen-Bilder).
- Sockel-Leuchten (Edelstein im Sockel -> Waffe glüht, über Phaser-Glow/Bloom).
- Dorf nachzeichnen (Boden, Fachwerk, Pflaster) und Gegner-Pakete.
