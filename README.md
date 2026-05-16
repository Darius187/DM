# unisilent.de

Professionelle B2B-Webseite für Industrie-Plattformwagen.
Stack: PHP 8 (PDO, OOP), MySQL, Tailwind CSS, vanilla JS — gebaut für **Alfahosting Shared Hosting**.

## Status

### Session 1 (abgeschlossen)
- ✅ Repo-Struktur, Security-Härtung (.htaccess, CSP, HSTS)
- ✅ DB-Schema (`products`, `images`, `inquiries`, `users`, `login_attempts`, `settings`)
- ✅ PHP-Core (Bootstrap, Database, Auth, Csrf, Helpers, Product-Model)
- ✅ Tailwind-Build (lokal, kein CDN) + Inter-Fonts (lokal, DSGVO)
- ✅ Frontend: Startseite, Produktübersicht (mit Filter), Produkt-Detail (Galerie)
- ✅ Plattformwagen-Zug-Animation
- ✅ Cookie-Banner, Rechtstexte als Platzhalter, SEO, WCAG 2.1 AA
- ✅ 9 Produktbilder + 4 Wagen-Bilder verarbeitet

### Session 2 (abgeschlossen)
- ✅ Admin-Panel `/admin/` — Login mit Rate-Limit, Dashboard, Logout
- ✅ Produkt-CRUD (Anlegen, Bearbeiten, Aktiv/Featured-Schalter, Sortierung)
- ✅ Bild-Upload im Admin mit Auto-WebP/Resize (400/800/1600 px + Thumbnail via GD)
- ✅ Bild-Löschen (Datei- und DB-Cleanup)
- ✅ Inquiry-Model + Anfragenverwaltung (Filter, Status-Wechsel, Löschen)
- ✅ Formular-Versand (eigener SMTP-Client via `localhost:25`, Fallback PHP `mail()`)
  - Hauptmail an `info@db-bas.de`
  - Eingangsbestätigung an Anfragenden (mit Items-Liste)
  - Reply-To auf Anfragenden-Adresse gesetzt
- ✅ CLI-Tool `tools/create_admin.php` zum Anlegen/Resetten von Admin-Usern
- ✅ Admin-Bereich zusätzlich gehärtet (`noindex`-Header, `Cache-Control: no-store`)

### Session 3 (optional / geplant)
- [ ] Bild-Reihenfolge per Drag&Drop im Admin
- [ ] Settings-Verwaltung im Admin (statt manuell in DB)
- [ ] Anwendungsbilder pro Produkt mit Kategorien (Logistik / Krankenhaus / etc.)
- [ ] Mehrsprachigkeit (DE/EN)
- [ ] Echtes Logo + Hero-Bilder mit Anwendungsszenarien

## Setup auf Alfahosting

### Datenbank-Daten (cxycs6ph)
```
DB_NAME: cxycs6ph_unisilent
DB_USER: cxycs6ph_unisilent
DB_HOST: localhost
Server : cxycs6ph.web5.alfahosting-server.de
```

### Schritte

1. **Datenbank anlegen** in der Alfahosting-Adminoberfläche (MySQL 8.0)
2. **Schema + Seed importieren** via phpMyAdmin:
   - `app/config/database.sql`  → erstellt Tabellen
   - `app/config/seed.sql`      → füllt 7 Produkte und Standard-Settings
3. **Config anlegen** (NICHT im Git):
   ```bash
   cp app/config/config.sample.php app/config/config.php
   # Datei editieren: 'pass' eintragen, ggf. 'pepper' auf neuen Zufallswert
   ```
4. **Per SFTP hochladen** — folgende Ordner/Dateien:
   - `public/` → DocumentRoot
   - `app/`    → eine Ebene über DocumentRoot (geschützt durch `.htaccess`)
   - `storage/` → schreibbar für PHP, geschützt
   - `tools/`   → geschützt, nur per Shell ausführbar
   - `.htaccess` (Root) für `/` → `/public/`-Rewrite
   - **NICHT** hochladen: `build/`, `node_modules/`, `.git/`
5. **Admin-User anlegen** (per SSH falls verfügbar, sonst lokal):
   ```bash
   php tools/create_admin.php admin info@db-bas.de "Mein-Sicheres-Passwort-min-12-Zeichen"
   ```
   Falls SSH fehlt: Hash lokal generieren und direkt in `users`-Tabelle einfügen:
   ```bash
   php -r 'echo password_hash("MeinPasswort", PASSWORD_DEFAULT) . PHP_EOL;'
   ```
6. **301-Redirect** `uni-silent.de → unisilent.de` ist in `public/.htaccess` aktiviert
7. **HTTPS** wird via Let's Encrypt erzwungen
8. **E-Mail** läuft über `localhost:25` (Alfahosting-MTA) — keine externe SMTP-Konfiguration nötig

### Login zum Admin-Panel

```
https://unisilent.de/admin/
```

## Lokale Entwicklung

```bash
# CSS bauen (einmalig oder per --watch)
cd build
npm install
npm run build         # oder: npm run watch

# PHP-Server starten
cd ../public
php -S 127.0.0.1:8080 -t .
```

Öffnen: http://127.0.0.1:8080/

## Verzeichnisstruktur

```
/
├── public/              ← DocumentRoot (oder via .htaccess-Rewrite)
│   ├── index.php, produkte.php, produkt.php, anfrage.php, ...
│   ├── assets/{css,js,fonts,icons}/
│   ├── images/{products,wagen,ui,og}/
│   └── admin/           (kommt in Session 2)
├── app/                 ← geschützt, außerhalb DocumentRoot
│   ├── config/{config.sample.php,database.sql,seed.sql}
│   ├── core/{bootstrap,Database,Auth,Csrf,helpers}.php
│   ├── models/Product.php
│   └── views/{layout,components,pages,admin}/
├── storage/             ← geschützt
│   ├── logs/, cache/, uploads/
├── build/               ← geschützt, NICHT auf Server hochladen
│   ├── tailwind.config.js, src.css, package.json
└── .htaccess            ← Wurzel-Schutz + Rewrite auf /public/
```

## Sicherheit

- SQL-Injection-Schutz: ausschließlich PDO Prepared Statements
- XSS-Schutz: `e()` / `ea()` Escape-Helper überall im Output
- CSRF-Token: pro Session, validiert bei jedem POST
- Passwörter: `password_hash(PASSWORD_DEFAULT)` (bcrypt)
- Login-Rate-Limit: 5 Versuche / 15 Minuten pro IP-Hash
- Session: `Secure`, `HttpOnly`, `SameSite=Lax`
- Security-Header in `.htaccess`: CSP, HSTS, X-Content-Type-Options, X-Frame-Options
- Verzeichnis-Listing: deaktiviert
- Sensitive Files: blockiert (`.env`, `.sql`, `.log`, `.git`, `composer.*`)

## Barrierefreiheit (WCAG 2.1 AA)

- `lang="de"`, semantisches HTML (`<header>`, `<nav>`, `<main>`, `<footer>`)
- Skip-Link „Zum Hauptinhalt springen"
- Alt-Texte auf allen Bildern, dekorative Bilder mit `aria-hidden`
- Farbkontraste: mind. 4,5:1
- Fokus-Stile: gut sichtbar (`outline-2 outline-accent-500`)
- `prefers-reduced-motion`: Wagen-Zug-Animation deaktiviert
- ARIA-Labels für Mobile-Menu, Filter-Buttons, Galerie-Thumbs
- Formulare mit `<label>`, Pflichtfelder markiert, `aria-required`
