# Abnahme - Ravensmoor 3D-Kampftest

## Status der Anforderungen

| Anforderung | Stand |
|---|---|
| Three.js mit WebGPU-Renderer + sauberer WebGL2-Fallback, Anzeige in der Ecke | erfuellt |
| TypeScript + Vite, Dev-Server | erfuellt |
| FPS-Zaehler + Debug-Overlay | erfuellt |
| Iso-Kamera wie Diablo, weiches Nachziehen | erfuellt |
| Maus-Cursor auf Bodenebene projiziert (Zielrichtung) | erfuellt |
| Arena: Gitterboden, Quader als Waende/Saeulen + Kollision | erfuellt |
| Gerichtetes Licht + Ambient | erfuellt |
| Spieler-Kapsel mit Richtungsmarker | erfuellt |
| WASD + Maus zielen; Klick-zu-Bewegen umschaltbar | erfuellt |
| Leichter Angriff: 3er-Kombo, Puffer 250 ms, ab 50% abbrechbar, Trefferbogen sichtbar | erfuellt |
| Schwerer Angriff: ~0,6 s Ausholen, ~2,2x Schaden, breiterer Bogen | erfuellt |
| Blocken (Rechts halten), langsamer | erfuellt |
| Perfekte Parade (erste 300 ms): Gegner taumelt, +100% naechster Treffer | erfuellt |
| Ausweichrolle: 300 ms i-Frames, kurze Distanz, 0,9 s Cooldown, Einfaerben | erfuellt |
| Hit-Stop 50/80/100 ms | erfuellt |
| Keine Ausdauer | erfuellt |
| Gegner: Zuläufer mit Telegraph + Umkreiser | erfuellt |
| Gegnerschaden 10-16%, Treffer-Reaktion | erfuellt |
| Taste G: neue Welle | erfuellt |
| Dreifaches Treffer-Feedback (Hit-Stop + Blitz + Schadenszahl) | erfuellt |
| Debug-Overlay: FPS, Renderer, Aktion + Restzeiten, Live-Slider, Werteausgabe | erfuellt |
| Touch: Joystick links + Angriffsknopf rechts mit Auto-Aim | erfuellt (Taste T) |
| Alle Texte deutsch, "-" statt "—" | erfuellt |

## Wie verifiziert

- `npm run typecheck` und `npm run build` laufen sauber durch.
- Automatischer Browser-Smoke-Test (headless Chromium) laedt die App, liest
  das Renderer-Tag, loest Angriffe/Rolle/Block/Welle aus und macht
  Screenshots. Keine Laufzeitfehler in der Konsole (einziger Eintrag: 404 fuer
  `favicon.ico`, ohne Funktionsbezug).
- Belegt im Test: Aktion-/Phasenanzeige (`light -> recovery`, Kombo `1/3`),
  Paradefenster `OFFEN` beim Block-Beginn, Wellenwechsel (`Welle 2 - 3 Gegner`),
  sichtbarer Treffer-Blitz und Gegner-Einfaerbung.

## Renderer / FPS

- **Renderer:** Auf echter Hardware mit WebGPU-faehigem Browser wird
  **WebGPU** gewaehlt; ohne WebGPU faellt die App automatisch und sauber auf
  **WebGL2** zurueck (oben rechts angezeigt, gelb = Fallback).
- Die automatische Verifikation lief im **headless-Software-Rendering**
  (SwiftShader, WebGL2-Fallback). Die dort gemessenen **30-43 FPS** sind reine
  CPU-Software-Rasterung und **nicht** repraesentativ - auf echter GPU /
  WebGPU liegt die Bildrate deutlich hoeher. Der FPS-Zaehler im Overlay zeigt
  den realen Wert im jeweiligen Browser.

## Kurzbericht "fuehlt es sich gut an?"

Da die Verifikation automatisiert/headless erfolgte, ist das ein Bericht ueber
das **umgesetzte Gefuehlsgeruest**, nicht ueber stundenlanges Spielen:

**Gut umgesetzt fuer das Iso-Gefuehl**
- Maus-auf-Boden-Zielen plus WASD trennt Laufen und Zielen sauber - genau der
  Diablo-Griff. Die Figur dreht sich fluessig zur Cursor-Richtung.
- Das dreifache Treffer-Feedback ist der Kern: Hit-Stop friert kurz die ganze
  Welt ein (inkl. Kamera und Partikel), waehrend die Schadenszahl per Echtzeit
  weiterschwebt - das gibt den "knackigen" Moment statt "fuehlt sich tot an".
- Live-Slider fuers Tuning sind sehr nuetzlich: Puffer, Paradefenster, i-Frames
  und Hit-Stop-Laengen lassen sich im Browser sofort umstellen, die guten Werte
  stehen als kopierbarer Block bereit.

**Was man beim echten Spielen noch pruefen/justieren sollte**
- Hit-Stop-Laengen und i-Frames sind Geschmackssache - bewusst als Slider
  angelegt, damit ihr sie am Gefuehl festzurrt.
- Die Gegner-KI ist absichtlich simpel (lesbar). Telegraph-Dauer und
  Umkreis-Radius sind feste Werte in `tunables.ts` und ggf. nachzuziehen.
- Kameraneigung (~42 Grad) und Nachzieh-Daempfung sind fix gewaehlt; falls die
  Distanzlesbarkeit am echten Bildschirm anders wirkt, in `camera.ts` anpassbar.

## Screenshots

1. Start / Arena / Overlay - `shot-1-start.png`
2. Leichter Angriff im Kampf (Kombo + Treffer-Blitz) - `shot-2-kampf.png`
3. Block mit offenem Paradefenster + neue Welle - `shot-3-block.png`
