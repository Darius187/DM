# Figuren V2 – Übergabe Codex → Claude

## Dateien

- `screenshots/codex_v2/manifest.json`: globales Format, Zeilen-Mappings, Ankerkonvention und Z-Reihenfolge.
- `screenshots/codex_v2/aldric/{body,armor-stoffkittel,armor-gambeson,armor-lederwams,armor-kettenhemd,cloak-reiseumhang,weapon-sword-simple,weapon-sword-master,weapon-axe,weapon-bow,shield-round-wood,shield-round-reinforced}.{png,json}`: alle Aldric-Ebenen, je 1152×512.
- `screenshots/codex_v2/soldier/{body,armor-kettenhemd,head-helmet}.{png,json}`: Fußsoldat auf derselben Körperbasis.
- `screenshots/codex_v2/archer/{body,armor-stoffkittel,head-hood,weapon-bow}.{png,json}`: Bogenschütze auf derselben Körperbasis.
- `screenshots/codex_v2/{kontaktbogen,richtungstest}.png`: Schaufenster sowie Richtungs-/Stapelprüfung.
- `screenshots/codex_v2/samples/aldric-masterklinge-{64,32}.png`: verkleinerte Proben.
- `screenshots/codex_v2/raw/*.png` und `build_v2_layers.py`: drei Rohmaster und reproduzierbarer Export.

## Stapeln, Anker und Tempo

Hinten → vorne: `down: cloak, body, armor, weapon, shield, head`; `left: weapon, cloak, body, armor, shield, head`; `right: cloak, body, armor, weapon, shield, head`; `up: weapon, body, armor, cloak, shield, head`. Damit liegt der `up`-Schild wie im Proof vor dem Körper. `handAnker`/`schildAnker` sind ganzzahlige Frame-Pixel ab oben links; Waffenursprung ist die Griffmitte an der Parierstange, Schildursprung der Buckelmittelpunkt. Gehen: 120 ms/Frame; Schlag: 140/80/180 ms; Block solange gehalten.

## Abweichungen / bekannte Schwächen

- Laufquelle hat Zeilen `0,1,2,3`, Kampfquelle bewusst `0,2,1,3`; der Export normalisiert beides zu `down,left,right,up`. `richtungstest.png` belegt den Übergang Idle → Treffer.
- ImageGen lieferte 1254er Rohmaster; Körperframes wurden per Nearest-Neighbor in 128er Zellen überführt. Die deterministischen Ausrüstungsebenen sitzen nativ auf dem 128er Raster, der Körper ist daher nicht ehrlich als modellnativ 128 erzeugt zu bezeichnen.
- Rüstung/Umhang sind echte, abschaltbare Ebenen, wirken derzeit aber bewusst gröber als der Körper. Bogensehne variiert über Nocken/Spannen/Lösen; die Körperpose ist noch die universelle Körperanimation und keine spezialisierte Bogenschützenpose.
- `up` zeigt in allen Frames nur Hinterkopf/Rücken. Die Ausweichrolle bleibt Runde 3.
