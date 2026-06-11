# Ravensmoor - 3D-Kampftest (Three.js / WebGPU, isometrisch)

Wegwerf-Testprojekt. Zweck: herausfinden, ob sich Bewegung und Kampf von
Ravensmoor in 3D-Isometrie gut **anfuehlen** - noch nicht, wie es aussieht.
Bewusst Platzhalter-Formen (Kapseln/Quader). Keine Modelle, keine Texturen,
kein Inventar, keine Story. Nur der Kampfkern in einer Arena.

## Starten

```bash
npm install
npm run dev        # Dev-Server (Vite), oeffnet http://localhost:5173
# oder
npm run build && npm run preview
```

- `npm run typecheck` - reine Typpruefung
- URL-Schalter `?webgl` erzwingt den WebGL2-Fallback (zum Vergleichen/Testen).

## Steuerung

| Eingabe | Wirkung |
|---|---|
| WASD | Bewegung (bildschirm-relativ) |
| Maus | Zielen (Cursor wird auf den Boden projiziert) |
| Linksklick | leichter Angriff - 3er-Kombo mit Finisher |
| Shift+Links / Q | schwerer Angriff (Ausholen, volles Commitment) |
| Rechts halten | blocken; in den ersten 300 ms = perfekte Parade |
| Leertaste | Ausweichrolle (i-Frames) |
| G | neue Gegnerwelle |
| M | Klick-zu-Bewegen umschalten |
| T | Touch-Steuerung ein/aus |
| H | Hilfe ein/aus |
| F1 / ` | Debug-Overlay ein/aus |

## Kampfwerte (v3 "Feel-Good")

Alle live im Debug-Overlay aenderbar (Slider). Startwerte:

- Eingabe-Puffer: 250 ms
- Paradefenster: 300 ms
- i-Frame-Dauer: 300 ms
- Rollen-Cooldown: 900 ms
- Hit-Stop: leicht 50 ms / Finisher 80 ms / schwer+Parade 100 ms
- Leichter Angriff: 3er-Kombo, Erholphase ab 50% per Rolle/Block abbrechbar
- Schwerer Angriff: ~0,6 s Ausholen, ~2,2x Schaden, breiterer Bogen
- Perfekte Parade: Gegner taumelt, naechster eigener Treffer +100%
- **Keine Ausdauer** (bewusste Designentscheidung)

Treffer-Feedback ist immer dreifach: Hit-Stop + Form-Blitz/Partikel am
Trefferpunkt + schwebende Schadenszahl.

## Gegner

- **Zuläufer** (rot): laeuft heran, holt sichtbar aus (Telegraph-Ring +
  Einfaerben, ~0,5 s), schlaegt zu.
- **Umkreiser** (violett): haelt Abstand, umrundet den Spieler, stoesst
  gelegentlich vor.
- Gegner machen 10-16% Spielerschaden und zeigen Treffer-Reaktion
  (Zurueckzucken + Einfaerben).

## Projektstruktur

```
src/
├── main.ts       # Bootstrap, Spielschleife, Hit-Stop-Zeitsteuerung
├── renderer.ts   # WebGPURenderer + sauberer WebGL2-Fallback
├── camera.ts     # Iso-Kamera, weiches Nachziehen, Boden-Raycast
├── arena.ts      # Boden/Gitter, Waende/Saeulen, Licht, Kollision
├── input.ts      # Tastatur/Maus/Touch
├── player.ts     # Spieler + Kampf-Zustandsautomat
├── enemy.ts      # Gegner-KI (Zuläufer/Umkreiser) + Wellen
├── effects.ts    # Hit-Stop, Partikel/Blitz, Schadenszahlen
├── overlay.ts    # Debug-Overlay, Live-Slider, HUD, Hilfe, Touch
└── tunables.ts   # Kampfwerte (live tunebar) + feste Geometrie
```

## Abnahme

Siehe [docs/ABNAHME.md](docs/ABNAHME.md) fuer den Kurzbericht (Was fuehlt sich
gut an, was hakt, Renderer/FPS) und Screenshots.
