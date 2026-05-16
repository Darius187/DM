<?php
require __DIR__ . '/../app/core/bootstrap.php';
$pageTitle = 'Datenschutzerklärung';
$pageDescription = 'Datenschutzerklärung gemäß DSGVO für uni-silent.de';
render('pages/datenschutz', compact('pageTitle', 'pageDescription'));
