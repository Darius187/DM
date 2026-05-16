<?php
require __DIR__ . '/../app/core/bootstrap.php';
Csrf::require();
$pageTitle = 'Kontakt';
$pageDescription = 'Kontaktieren Sie uns telefonisch oder per E-Mail — wir helfen gerne bei der Auswahl des passenden Plattformwagens.';
render('pages/kontakt', compact('pageTitle', 'pageDescription'));
