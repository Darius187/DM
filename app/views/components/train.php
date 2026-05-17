<?php
/**
 * Plattformwagen-Zug (Endlos-Loop, dezent unter dem Header).
 * Reihenfolge: gelb → schwarz → blau → stahl
 * Höhe 75px, Padding 6px, gap 8px (siehe CSS in src.css)
 *
 * Optionen via Variablen vor dem Include:
 *   $trainBg = 'transparent' | '#ffffff' | 'var(--...)';
 *   $trainAriaLabel = 'Animierter Plattformwagen-Zug';
 */
$trainBg = $trainBg ?? 'transparent';
$trainAria = $trainAriaLabel ?? 'Plattformwagen ziehen als Zug von rechts nach links - dekorative Animation';

$wagons = [
    ['file' => 'wagen_gelb.png',    'alt' => 'Gelber Plattformwagen'],
    ['file' => 'wagen_schwarz.png', 'alt' => 'Schwarzer Plattformwagen'],
    ['file' => 'wagen_blau.png',    'alt' => 'Blauer Plattformwagen'],
    ['file' => 'wagen_stahl.png',   'alt' => 'Edelstahl-Plattformwagen'],
];
// Sequenz 4x wiederholen = 16 Bilder pro Loop.
// Track-Gesamtbreite ~2600 px deckt 27"-Desktop (2560 px) ohne Luecke ab,
// auf kleineren Screens scrollen die Wiederholungen unsichtbar mit.
// Die JS-Loop-Logik in train.js misst die erste Haelfte (8 Bilder) und
// springt nach genau dieser Distanz zurueck - dadurch nahtlos.
$loop = array_merge($wagons, $wagons, $wagons, $wagons);
?>
<div class="train-outer" style="<?= $trainBg !== 'transparent' ? '--train-bg:' . ea($trainBg) . ';' : '' ?>"
     role="img" aria-label="<?= ea($trainAria) ?>">
  <div class="train-track" id="train-track">
    <?php foreach ($loop as $w): ?>
      <img src="/images/wagen/<?= ea($w['file']) ?>" alt="" aria-hidden="true" loading="lazy" decoding="async">
    <?php endforeach; ?>
  </div>
</div>
