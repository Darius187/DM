# unisilent.de

Professionelle B2B-Webseite für Industrie-Plattformwagen.
Stack: PHP 8 (PDO, OOP), MySQL, Tailwind CSS, vanilla JS — gebaut für **Alfahosting Shared Hosting**.

## Status — Session 1 (abgeschlossen)

- ✅ Repo-Struktur, Security-Härtung (.htaccess, CSP, HSTS)
- ✅ DB-Schema (`products`, `images`, `inquiries`, `users`, `login_attempts`, `settings`)
- ✅ PHP-Core (Bootstrap, Database, Auth, Csrf, Helpers, Product-Model)
- ✅ Tailwind-Build (lokal, kein CDN) + Inter-Fonts (lokal, DSGVO)
- ✅ Frontend: Startseite, Produktübersicht (mit Filter), Produkt-Detail (Galerie)
- ✅ Plattformwagen-Zug-Animation (Web Animations API, 75 px, 4 Wagen, Endlos-Loop)
- ✅ Cookie-Banner (DSGVO Opt-in)
- ✅ Rechtstexte als Platzhalter: Impressum, Datenschutz, AGB
- ✅ Formulare (Anfrage, Kontakt) als UI — Versand kommt in Session 2
- ✅ SEO: sitemap.xml, robots.txt, Open Graph, Schema.org
- ✅ Barrierefrei: WCAG 2.1 AA — Skip-Link, ARIA, Tastatur, Kontraste, reduced-motion
- ✅ Bilder: 9 Produktbilder verarbeitet (WebP+JPG, 400/800/1600 px + Thumbnail)
- ✅ 4 Wagen-Bilder aus Original-HTML extrahiert

## Session 2 — TODO (geplant)

- [ ] Admin-Panel `/admin/`: Login, Dashboard, Produkt-CRUD, Bild-Upload, Anfragen einsehen
- [ ] Formular-Versand (PHPMailer SMTP via Alfahosting + DB-Speicherung)
- [ ] Bild-Upload mit Auto-WebP/Resize im Admin
- [ ] Settings-Verwaltung im Admin

## Setup auf Alfahosting

1. **Datenbank anlegen** in Alfahosting-Adminoberfläche (MySQL)
2. `app/config/database.sql` und `app/config/seed.sql` importieren (phpMyAdmin)
3. `app/config/config.sample.php` → `app/config/config.php` kopieren und DB-Zugang eintragen
4. Per **SFTP** alles außer `build/` und `.git/` hochladen
5. Sicherstellen, dass `app/`, `storage/`, `build/` per `.htaccess` (mit `Require all denied`) gesperrt sind ✅
6. **301-Redirect** `uni-silent.de → unisilent.de` ist in `public/.htaccess` aktiviert
7. **HTTPS** wird via Let's Encrypt erzwungen (Header in `.htaccess`)

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
