<?php
declare(strict_types=1);

/**
 * ImageProcessor - Upload-Validierung, Resize, WebP+JPG-Generierung, Thumbnail.
 * Nutzt GD (auf Alfahosting Standard verfügbar).
 *
 * Output-Pattern (gleich wie in Session 1):
 *   {basename}-400.webp, -800.webp, -1600.webp
 *   {basename}-400.jpg,  -800.jpg,  -1600.jpg
 *   {basename}-thumb.webp, -thumb.jpg
 */
final class ImageProcessor
{
    public const SIZES = [400, 800, 1600];
    public const THUMB = 200;
    public const MAX_BYTES = 12 * 1024 * 1024;  // 12 MB
    public const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    /**
     * Verarbeitet eine hochgeladene Datei und schreibt alle Varianten.
     * @param array  $file     Eintrag aus $_FILES
     * @param string $destDir  Absoluter Ausgabe-Ordner
     * @param string $basename Dateinamen-Basis ohne Endung (z.B. "main-01")
     * @return array{base: string, mime: string, width: int, height: int}
     * @throws RuntimeException bei Validierungs- oder Verarbeitungsfehler
     */
    public static function processUpload(array $file, string $destDir, string $basename): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new RuntimeException(self::uploadErrorMessage((int)($file['error'] ?? -1)));
        }
        if (!is_uploaded_file($file['tmp_name'])) {
            throw new RuntimeException('Datei ist kein gültiger Upload.');
        }
        if ($file['size'] > self::MAX_BYTES) {
            throw new RuntimeException('Datei zu groß (max. ' . (self::MAX_BYTES / 1024 / 1024) . ' MB).');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($file['tmp_name']) ?: '';
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new RuntimeException('Dateityp nicht erlaubt (nur JPG, PNG, WebP).');
        }

        $img = self::loadImage($file['tmp_name'], $mime);
        if (!$img) {
            throw new RuntimeException('Bild konnte nicht gelesen werden.');
        }

        if (!is_dir($destDir) && !@mkdir($destDir, 0775, true) && !is_dir($destDir)) {
            throw new RuntimeException('Zielordner kann nicht angelegt werden.');
        }

        $cleanBase = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $basename) ?: 'image';
        $cleanBase = trim($cleanBase, '-');

        foreach (self::SIZES as $size) {
            $resized = self::fitOnWhite($img, $size);
            self::saveWebP($resized, "$destDir/$cleanBase-$size.webp", 82);
            self::saveJpeg($resized, "$destDir/$cleanBase-$size.jpg", 85);
            imagedestroy($resized);
        }
        $thumb = self::fitOnWhite($img, self::THUMB);
        self::saveWebP($thumb, "$destDir/$cleanBase-thumb.webp", 80);
        self::saveJpeg($thumb, "$destDir/$cleanBase-thumb.jpg", 82);
        imagedestroy($thumb);

        $w = imagesx($img);
        $h = imagesy($img);
        imagedestroy($img);

        return ['base' => $cleanBase, 'mime' => 'image/webp', 'width' => $w, 'height' => $h];
    }

    /** Löscht alle Varianten zu einem basename. */
    public static function deleteVariants(string $destDir, string $basename): void
    {
        $clean = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $basename) ?: '';
        if ($clean === '') return;
        foreach (array_merge(self::SIZES, ['thumb']) as $s) {
            @unlink("$destDir/$clean-$s.webp");
            @unlink("$destDir/$clean-$s.jpg");
        }
    }

    private static function loadImage(string $path, string $mime): \GdImage|false
    {
        $img = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png'  => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default      => false,
        };
        if (!$img) return false;
        // EXIF-Rotation bei JPEG
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $orient = (int)($exif['Orientation'] ?? 0);
            $img = match ($orient) {
                3 => imagerotate($img, 180, 0),
                6 => imagerotate($img, -90, 0),
                8 => imagerotate($img,  90, 0),
                default => $img,
            };
        }
        return $img;
    }

    /**
     * Skaliert proportional in eine $size×$size Box und zentriert auf weißem Hintergrund.
     */
    private static function fitOnWhite(\GdImage $img, int $size): \GdImage
    {
        $sw = imagesx($img);
        $sh = imagesy($img);
        $scale = min($size / $sw, $size / $sh, 1.0);
        $tw = max(1, (int)round($sw * $scale));
        $th = max(1, (int)round($sh * $scale));

        $canvas = imagecreatetruecolor($size, $size);
        $white  = imagecolorallocate($canvas, 255, 255, 255);
        imagefilledrectangle($canvas, 0, 0, $size, $size, $white);
        $dx = (int)(($size - $tw) / 2);
        $dy = (int)(($size - $th) / 2);
        imagecopyresampled($canvas, $img, $dx, $dy, 0, 0, $tw, $th, $sw, $sh);
        return $canvas;
    }

    private static function saveWebP(\GdImage $img, string $path, int $quality): void
    {
        if (!function_exists('imagewebp')) {
            // Fallback: nur JPG schreiben, WebP-Datei als Symlink/Kopie der JPG
            self::saveJpeg($img, str_replace('.webp', '.jpg', $path), $quality);
            return;
        }
        imagewebp($img, $path, $quality);
    }

    private static function saveJpeg(\GdImage $img, string $path, int $quality): void
    {
        imageinterlace($img, true);
        imagejpeg($img, $path, $quality);
    }

    private static function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Datei überschreitet erlaubte Größe.',
            UPLOAD_ERR_PARTIAL    => 'Upload unvollständig.',
            UPLOAD_ERR_NO_FILE    => 'Keine Datei hochgeladen.',
            UPLOAD_ERR_NO_TMP_DIR => 'Server-Konfigurationsfehler (kein TMP-Ordner).',
            UPLOAD_ERR_CANT_WRITE => 'Datei konnte nicht geschrieben werden.',
            UPLOAD_ERR_EXTENSION  => 'Upload durch Server-Erweiterung blockiert.',
            default               => 'Unbekannter Upload-Fehler.',
        };
    }
}
