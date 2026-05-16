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
$trainAria = $trainAriaLabel ?? 'Plattformwagen ziehen als Zug von rechts nach links — dekorative Animation';

$wagons = [
    ['file' => 'wagen_gelb.png',    'alt' => 'Gelber Plattformwagen'],
    ['file' => 'wagen_schwarz.png', 'alt' => 'Schwarzer Plattformwagen'],
    ['file' => 'wagen_blau.png',    'alt' => 'Blauer Plattformwagen'],
    ['file' => 'wagen_stahl.png',   'alt' => 'Edelstahl-Plattformwagen'],
];
// Sequenz verdoppeln für nahtlosen Loop
$loop = array_merge($wagons, $wagons);
?>
<div class="train-outer" style="<?= $trainBg !== 'transparent' ? '--train-bg:' . ea($trainBg) . ';' : '' ?>"
     role="img" aria-label="<?= ea($trainAria) ?>">
  <div class="train-track" id="train-track">
    <?php foreach ($loop as $w): ?>
      <img src="/images/wagen/<?= ea($w['file']) ?>" alt="" aria-hidden="true" loading="lazy" decoding="async">
    <?php endforeach; ?>
  </div>
</div>
