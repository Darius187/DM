<?php
declare(strict_types=1);

/**
 * Hilfsklasse für Admin-Views: rendert mit admin/layout.php
 */
final class AdminView
{
    public static function render(string $page, array $vars = [], ?string $title = null): void
    {
        extract($vars, EXTR_SKIP);
        ob_start();
        require APP_PATH . '/views/admin/' . $page . '.php';
        $content = ob_get_clean();
        $pageTitle = $title;
        require APP_PATH . '/views/admin/layout.php';
    }

    public static function flash(string $type, string $msg): void
    {
        $_SESSION['flash'] = ['type' => $type, 'msg' => $msg];
    }
}
