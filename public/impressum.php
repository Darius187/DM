<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';
$pageTitle = 'Impressum';
$pageDescription = 'Impressum gemäß § 5 TMG / DDG für uni-silent.de';
render('pages/impressum', compact('pageTitle', 'pageDescription'));
