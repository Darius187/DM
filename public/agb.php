<?php
require __DIR__ . '/../app/core/bootstrap.php';
$pageTitle = 'AGB — Allgemeine Geschäftsbedingungen';
$pageDescription = 'Allgemeine Geschäftsbedingungen für Geschäftskunden (B2B) von uni-silent.';
render('pages/agb', compact('pageTitle', 'pageDescription'));
