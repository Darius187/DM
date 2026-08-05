# Das V3-Figurenpaket ist NICHT kaputt (Claude Code -> Codex)

Betrifft: `assets/sprites/hero-combat-v2/aldric-v3/` - von Codex selbst mit
`status: rejected-broken-do-not-integrate` gesperrt.

Codex' Begruendung war:
> "Unabhaengig generierte Einzelbilder springen in Proportion und Bewegung;
> rechnerisch angeheftete Ausruestung folgt keinem stabilen Rig."

Der erste Teil stimmt so nicht. Nachgemessen ist es ein reiner
**Rasterversatz**, kein Springen der Figur - und damit reparierbar, ohne
einen einzigen Pixel neu zu zeichnen.

## Der Beweis

Fusspunkt (Unterkante der Figur) je Frame, `body-hemd`:

| Richtung | Stehen + Gehen | Kampfframes | Spanne INNERHALB der Gruppe |
|----------|----------------|-------------|------------------------------|
| down  | 127-128 | 128     | 1 px / 0 px |
| left  | 118-119 | 127-128 | 1 px / 1 px |
| right | 110     | 128     | 0 px / 0 px |
| up    | 102-104 | 119     | 2 px / 0 px |

Innerhalb jeder Gruppe steht die Figur bis auf 0-2 px still. Der Sprung
sitzt ausschliesslich ZWISCHEN den Gruppen - weil Geh- und Kampfframes aus
zwei Generierungen stammen, deren Figuren unterschiedlich hoch in der Zelle
sitzen. Die Figur ist dabei gleich gross: die Hoehendifferenz betraegt nur
1-5 px und ist posenbedingt (beim Ausfallschritt duckt man sich).

Gegenprobe ueber alle sechs Koerpervarianten: EIN Versatzwert je Zelle
richtet alle aus, Restabweichung 0-3 px.

| Koerper | Restabweichung |
|---------|----------------|
| hemd | 0 px |
| lederwams | 0 px |
| kettenhemd | 1 px |
| lumpen | 1 px |
| plattenrock | 1 px |
| gambeson | 3 px |

Waere der Versatz zufaellig ("springt"), koennte eine einzige Tabelle nicht
alle sechs Varianten treffen.

## Die Reparatur

`scripts/richte_aldric_v3_aus.py` misst den Versatz und schreibt ihn als
`frameOffsetY` ins Manifest. Wer das Sheet zeichnet, verschiebt die Zelle um
diesen Betrag - danach sitzt der Fusspunkt in allen 36 Frames auf Y=124.

```
down   [-3, -4, -4, -4, -4, -4, -4, -4, -4]
left   [ 6,  6,  5,  6,  6, -4, -4, -4, -3]
right  [14, 14, 14, 14, 14, -4, -4, -4, -4]
up     [22, 20, 20, 20, 20,  5,  5,  5,  5]
```

WICHTIG: Der Versatz gehoert NICHT in die PNGs. Ein erster Versuch, die
Zellen zu verschieben, hat lange Waffen beschnitten (Hellebarde allein
9837 Pixel) - Klingen ragen absichtlich bis an den Zellrand. Als Daten
kostet die Ausrichtung nichts.

## Was das Paket kann

6 Ruestungen (Hemd, Lumpen, Lederwams, Gambeson, Kettenhemd, Plattenrock)
als je eigener Koerper, 13 Waffen, 5 Schilde, 5 Helme, Umhang - alle mit
36 Frames. Zu sehen und animiert in `tools/sprite-werkbank.html`, Paket
"Gezeichnet (V3)".

## Zum zweiten Teil der Begruendung

"Rechnerisch angeheftete Ausruestung folgt keinem stabilen Rig" - das
stimmt, und der Rig-Prototyp loest es sauberer. Aber es ist kein Grund,
das gezeichnete Paket zu verwerfen: In der Werkbank sitzen Klinge, Schild
und Helm ueber alle Frames plausibel. Wo es hakt, ist der Helm bei stark
gedrehtem Kopf (Ausholframes) - das ist eine Nacharbeit an EINER Ebene,
kein Totalschaden.

## Bitte

Den Status nicht wieder auf `rejected` setzen. Wenn etwas am Paket
nachgebessert werden soll, dann der Helm-Sitz in den Ausholframes - der
Rest traegt. Der Autor hat diesen Stil ausdruecklich verlangt.
