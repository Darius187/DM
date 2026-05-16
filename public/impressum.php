<?php
require __DIR__ . '/../app/core/bootstrap.php';
$pageTitle = 'Impressum';
$pageDescription = 'Impressum gemäß § 5 TMG / DDG für uni-silent.de';
render('pages/impressum', compact('pageTitle', 'pageDescription'));
