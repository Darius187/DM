<?php
declare(strict_types=1);

/**
 * Escape für HTML-Output. IMMER für jeglichen User-/DB-Output verwenden.
 */
function e(?string $v): string {
    return htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Escape für HTML-Attribute (gleich wie e, expliziter Alias).
 */
function ea(?string $v): string {
    return htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Aktuelle URL ohne Query.
 */
function current_url(): string {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? 'unisilent.de';
    $path   = strtok($_SERVER['REQUEST_URI'] ?? '/', '?');
    return $scheme . '://' . $host . $path;
}

function base_url(string $path = ''): string {
    $url = rtrim($GLOBALS['config']['site']['url'] ?? '', '/');
    return $url . ($path ? '/' . ltrim($path, '/') : '');
}

function asset(string $path): string {
    return '/' . ltrim($path, '/');
}

function redirect(string $to, int $code = 302): never {
    header('Location: ' . $to, true, $code);
    exit;
}

/**
 * SHA-256 Hash der IP (für DSGVO-konformes Rate-Limiting ohne Klartext-IP).
 */
function client_ip_hash(): string {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ip = trim(explode(',', $ip)[0]);
    return hash('sha256', $ip . ($GLOBALS['config']['security']['pepper'] ?? ''));
}

/**
 * Rendert ein View-Template aus app/views/ mit übergebenen Variablen.
 */
function view(string $template, array $vars = []): string {
    extract($vars, EXTR_SKIP);
    ob_start();
    require APP_PATH . '/views/' . $template . '.php';
    return (string)ob_get_clean();
}

/**
 * Rendert Layout mit Content.
 */
function render(string $page, array $vars = [], string $layout = 'layout/main'): void {
    $content = view($page, $vars);
    extract($vars, EXTR_SKIP);
    require APP_PATH . '/views/' . $layout . '.php';
}

/**
 * Validierung: nicht leerer String.
 */
function v_required(?string $val): bool {
    return is_string($val) && trim($val) !== '';
}

function v_email(?string $val): bool {
    return is_string($val) && filter_var($val, FILTER_VALIDATE_EMAIL) !== false;
}

function v_max(?string $val, int $max): bool {
    return is_string($val) && mb_strlen($val) <= $max;
}

/**
 * Picture-Tag mit WebP + JPG fallback und srcset.
 * $base = z.B. "products/PLA300-DX/main-01" (ohne size + extension)
 * $alt  = Pflicht (Barrierefreiheit)
 */
function picture(string $base, string $alt, array $opts = []): string {
    $sizes   = $opts['sizes']   ?? '(min-width: 1024px) 50vw, 100vw';
    $lazy    = $opts['lazy']    ?? true;
    $class   = $opts['class']   ?? '';
    $widths  = $opts['widths']  ?? [400, 800, 1600];
    $default = $opts['default'] ?? 800;

    $webpSet = [];
    $jpgSet  = [];
    foreach ($widths as $w) {
        $webpSet[] = '/images/' . $base . '-' . $w . '.webp ' . $w . 'w';
        $jpgSet[]  = '/images/' . $base . '-' . $w . '.jpg '  . $w . 'w';
    }

    $loading = $lazy ? 'loading="lazy" decoding="async"' : 'loading="eager" fetchpriority="high"';
    $cls = $class ? ' class="' . ea($class) . '"' : '';

    return sprintf(
        '<picture>' .
            '<source type="image/webp" srcset="%s" sizes="%s">' .
            '<source type="image/jpeg" srcset="%s" sizes="%s">' .
            '<img src="%s" alt="%s" %s%s width="800" height="800">' .
        '</picture>',
        ea(implode(', ', $webpSet)),
        ea($sizes),
        ea(implode(', ', $jpgSet)),
        ea($sizes),
        ea('/images/' . $base . '-' . $default . '.jpg'),
        ea($alt),
        $loading,
        $cls
    );
}
