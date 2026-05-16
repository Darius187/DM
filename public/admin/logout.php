<?php
require __DIR__ . '/../../app/core/bootstrap.php';
Csrf::require();
Auth::logout();
redirect('/admin/index.php');
