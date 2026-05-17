<?php
declare(strict_types=1);

/**
 * Mailer - minimaler SMTP-Client für lokalen MTA.
 *
 * Auf Alfahosting Shared Hosting läuft Postfix/Exim auf localhost:25 ohne Auth.
 * Bei Bedarf kann SMTP_AUTH (PLAIN/LOGIN) und STARTTLS aktiviert werden über Config.
 *
 * Fallback: PHP mail() wenn SMTP-Verbindung fehlschlägt.
 */
final class Mailer
{
    private array $cfg;
    private $sock = null;

    public function __construct(?array $cfg = null)
    {
        $this->cfg = $cfg ?? ($GLOBALS['config']['mail'] ?? []);
    }

    /**
     * Sendet eine E-Mail. Liefert true bei Erfolg.
     */
    public function send(string $to, string $subject, string $bodyText, ?string $bodyHtml = null, array $opts = []): bool
    {
        $fromAddr  = $opts['from_addr'] ?? $this->cfg['from_addr'] ?? 'no-reply@localhost';
        $fromName  = $opts['from_name'] ?? $this->cfg['from_name'] ?? '';
        $replyTo   = $opts['reply_to']  ?? null;
        $transport = strtolower((string)($this->cfg['transport'] ?? 'auto'));

        $boundary = 'b_' . bin2hex(random_bytes(8));
        $msgId    = '<' . bin2hex(random_bytes(8)) . '@' . ($_SERVER['SERVER_NAME'] ?? 'unisilent.de') . '>';

        $headers = [];
        $headers[] = 'From: ' . self::encName($fromName, $fromAddr);
        if ($replyTo) {
            $headers[] = 'Reply-To: ' . self::encName('', $replyTo);
        }
        $headers[] = 'Date: ' . date('r');
        $headers[] = 'Message-ID: ' . $msgId;
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'X-Mailer: unisilent-mailer';

        if ($bodyHtml !== null && $bodyHtml !== '') {
            $headers[] = "Content-Type: multipart/alternative; boundary=\"$boundary\"";
            $body  = "--$boundary\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $body .= $bodyText . "\r\n\r\n";
            $body .= "--$boundary\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $body .= $bodyHtml . "\r\n\r\n";
            $body .= "--$boundary--\r\n";
        } else {
            $headers[] = 'Content-Type: text/plain; charset=UTF-8';
            $headers[] = 'Content-Transfer-Encoding: 8bit';
            $body = $bodyText;
        }

        $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

        // SMTP nur wenn explizit gewählt ('smtp' oder 'auto'). Default: 'mail'.
        if ($transport === 'smtp' || $transport === 'auto') {
            try {
                if ($this->smtpSend($fromAddr, $to, $encSubject, $headers, $body)) {
                    return true;
                }
            } catch (Throwable $e) {
                $this->log('SMTP failed: ' . $e->getMessage());
                if ($transport === 'smtp') {
                    // Explizit SMTP gewählt → nicht heimlich auf mail() fallen
                    return false;
                }
            }
        }

        // PHP mail() - nutzt auf Alfahosting /usr/sbin/sendmail.
        $headerStr = implode("\r\n", $headers);
        return @mail($to, $encSubject, $body, $headerStr, '-f' . $fromAddr);
    }

    private function smtpSend(string $from, string $to, string $subject, array $headers, string $body): bool
    {
        $host = $this->cfg['smtp_host'] ?? 'localhost';
        $port = (int)($this->cfg['smtp_port'] ?? 25);
        $user = $this->cfg['smtp_user'] ?? '';
        $pass = $this->cfg['smtp_pass'] ?? '';
        $sec  = $this->cfg['smtp_secure'] ?? '';

        $remote = ($sec === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
        $errno = 0; $errstr = '';
        $this->sock = @stream_socket_client($remote, $errno, $errstr, 5);
        if (!$this->sock) {
            throw new RuntimeException("connect failed: $errstr ($errno)");
        }
        stream_set_timeout($this->sock, 10);

        $this->expect(220);
        $hostname = $_SERVER['SERVER_NAME'] ?? 'unisilent.de';
        $this->cmd("EHLO $hostname");
        $this->expect(250);

        if ($sec === 'tls') {
            $this->cmd('STARTTLS');
            $this->expect(220);
            stream_socket_enable_crypto($this->sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $this->cmd("EHLO $hostname");
            $this->expect(250);
        }

        if ($user !== '' && $pass !== '') {
            $this->cmd('AUTH LOGIN');
            $this->expect(334);
            $this->cmd(base64_encode($user));
            $this->expect(334);
            $this->cmd(base64_encode($pass));
            $this->expect(235);
        }

        $this->cmd("MAIL FROM:<$from>");
        $this->expect(250);

        // Mehrere Empfänger (Komma-getrennt) erlauben
        foreach (array_filter(array_map('trim', explode(',', $to))) as $r) {
            $this->cmd("RCPT TO:<$r>");
            $this->expect([250, 251]);
        }

        $this->cmd('DATA');
        $this->expect(354);

        $headerStr = implode("\r\n", array_merge($headers, [
            "To: $to",
            "Subject: $subject",
        ]));

        // Dot-Stuffing
        $dataBody = $headerStr . "\r\n\r\n" . preg_replace('/^\./m', '..', $body);
        fwrite($this->sock, $dataBody . "\r\n.\r\n");
        $this->expect(250);

        $this->cmd('QUIT');
        @fclose($this->sock);
        return true;
    }

    private function cmd(string $line): void
    {
        fwrite($this->sock, $line . "\r\n");
    }

    /** @param int|array $expected */
    private function expect(int|array $expected): string
    {
        $expected = is_array($expected) ? $expected : [$expected];
        $response = '';
        while (true) {
            $line = fgets($this->sock, 1024);
            if ($line === false) {
                throw new RuntimeException('SMTP read timeout');
            }
            $response .= $line;
            if (preg_match('/^(\d{3})([ -])/', $line, $m)) {
                if ($m[2] === ' ') {
                    if (!in_array((int)$m[1], $expected, true)) {
                        throw new RuntimeException("SMTP unexpected: $response");
                    }
                    return $response;
                }
            }
        }
    }

    private static function encName(string $name, string $addr): string
    {
        if ($name === '') return "<$addr>";
        // ASCII-Namen unverändert, sonst RFC 2047
        if (preg_match('/^[\x20-\x7e]+$/', $name)) {
            return "\"$name\" <$addr>";
        }
        return '=?UTF-8?B?' . base64_encode($name) . "?= <$addr>";
    }

    private function log(string $msg): void
    {
        $path = $GLOBALS['config']['paths']['logs'] ?? sys_get_temp_dir();
        @file_put_contents($path . '/mailer.log', '[' . date('c') . "] $msg\n", FILE_APPEND);
    }
}
