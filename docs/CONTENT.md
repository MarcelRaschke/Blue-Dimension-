# Website-Inhalte und Seitenaufbau

## Überblick

Die öffentlichen Seiten liegen in `public/` (Docroot laut `docker/nginx/conf.d/app.conf`). Gemeinsame Logik liegt in `app/` und ist von außen nicht erreichbar. Die Inhalte liegen als JSON in `content/` und werden aus den Legacy-Dumps im Repository-Root erzeugt.

| Pfad | Zweck |
| --- | --- |
| `templates/*.php` | Seitenvorlagen: Start, Biografie, News, Events, Musik, Galerie, Links, Gästebuch |
| `public/*.html` | Ausgelieferte Seiten, erzeugt durch `scripts/render-static.php`. Kein PHP zur Laufzeit |
| `scripts/render-static.php` | Rendert `templates/` nach `public/*.html` (Build-Schritt) |
| `public/assets/site.css` | Stylesheet (Synthwave-Look, Neon-Akzente) |
| `app/config.php` | Konstanten, `GALLERY_BASE_URL` per Umgebungsvariable überschreibbar |
| `app/bootstrap.php` | `load_content()`, `h()`, `format_date()` |
| `app/html.php` | Allow-List-Sanitizer für autorengepflegtes HTML |
| `app/layout.php` | Gemeinsame Seitenhülle (Header, Navigation, Footer, Favicon, Social-Card-Metadaten) |
| `app/images.php` | Bildkatalog mit Maßen und Alt-Texten, Helfer für `<img>` und `<figure>` |
| `public/assets/img/` | Web-Bilder (WebP), erzeugt durch `scripts/build-images.py`; Zuordnung in `docs/BILDER.md` |
| `scripts/build-images.py` | Erzeugt die Web-Bilder und das Favicon aus den Originalen |
| `content/*.json` | Generierte Inhalte, eingecheckt, damit der Container ohne DB läuft |
| `scripts/sql-dump-parser.php` | Parser für phpMyAdmin-INSERT-Dumps |
| `scripts/build-content.php` | Erzeugt `content/*.json` aus den Dumps |
| `scripts/test-site.php` | Sanitizer-, Inhalts- und Seitentests |
| `docs/archive/wayback/` | Gesicherte Wayback-Machine-Snapshots (nicht ausgeliefert) |

## Quelldaten

| Quelle | Tabelle | Zieldatei | Hinweis |
| --- | --- | --- | --- |
| `news.sql` | `news` | `news.json` | 3 Einträge, Text enthält Legacy-HTML |
| `links.sql` | `links` | `links.json` | URLs ohne Schema werden mit `http://` ergänzt |
| `soundTable.sql` | `soundTable` | `music.json` | Abspiel-URLs zeigen auf RealMedia-Streams (`.rm`) eines alten Servers |
| `imageTable.sql` | `imageTable` | `gallery.json` | Bildpfade relativ zu `GALLERY_BASE_URL` |
| `soundTable` + `imageTable` | nach `eventID` gruppiert | `events.json` | Es gibt keine Event-Tabelle; Events haben nur eine ID |
| `guestbook.sql` | `guestbook` | `guestbook.json` | E-Mail-Adressen werden beim Build verworfen |
| `biography.xml` | `biography` | `biography.json` | Deutsch und Englisch |

## Inhalte neu erzeugen

```
php scripts/build-content.php
php scripts/render-static.php
php scripts/test-site.php
```

Die Seiten werden nur beim Bauen mit PHP erzeugt. Ausgeliefert wird das statische Ergebnis in `public/` (Nginx, kein PHP-FPM). Nach jeder Änderung an `templates/`, `app/` oder `content/` muss `render-static.php` erneut laufen, und die geänderten `public/*.html` werden mit eingecheckt. Die Tests vergleichen die eingecheckten HTML-Dateien mit den Vorlagen.

Der Build bricht ab, wenn ein Dump fehlt oder kein gültiges UTF-8 enthält. Nach jeder Änderung an einem Dump muss der Build erneut laufen und `content/` mit eingecheckt werden.

## Galerie-Bilder

Die Event-Fotos sind nicht im Repository. `GALLERY_BASE_URL` (Standard `/media/gallery`) muss auf den Ort zeigen, an dem die Dateien aus `imageTable` liegen, etwa `_2003-03-28_klubex/DSC02839.jpg`. Ohne diese Dateien zeigt die Galerie defekte Bilder.

Der Abschnitt „Artwork“ oben in der Galerie nutzt `public/assets/img/` und ist davon unabhängig. Details zu Quellen, Zuschnitt und Prüfung stehen in `docs/BILDER.md`.

## Sicherheit

Links zu Hosts aus `HTTPS_VERIFIED_HOSTS` (`app/html.php`) werden als `https://` ausgegeben. Die Liste enthält nur Hosts, die bei der letzten Prüfung über TLS geantwortet haben. Gästebuch-Texte sind Klartext und bleiben unverändert.

Autorengepflegtes HTML läuft durch `sanitize_html()`. Erlaubt sind nur die Tags `a b i u em strong font br p span small` sowie die Attribute `href target color size`. Links sind auf `http(s)`, `mailto:` und lokale Pfade beschränkt, `target="_blank"` bekommt `rel="noopener noreferrer"`. Gästebuch-Kommentare sind reiner Text und werden escaped. Die Tests in `scripts/test-site.php` prüfen das.

## Offen

Kein Kontaktformular und keine Kontaktseite: Im Repository existiert keine Kontaktadresse. Das Gästebuch ist nur lesbar, es gibt kein Eingabeformular. Der Datensatz `news` enthält zwei identische Einträge, die Quelldaten wurden nicht bereinigt.
