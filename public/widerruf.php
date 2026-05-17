<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';
$pageTitle = 'Widerrufsbelehrung';
$pageDescription = 'Widerrufsbelehrung für Verbraucher gemäß § 312g BGB mit Muster-Widerrufsformular.';
render('pages/widerruf', compact('pageTitle', 'pageDescription'));
