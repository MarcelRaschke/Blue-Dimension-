# Bilder der Website djjessejay.ch

Dieses Dokument beschreibt Analyse, Zuordnung und Umsetzung der Bildausstattung. Es ist die Referenz für spätere Änderungen an Bildern.

## Ausgangslage

Die Website ist eine PHP-Anwendung mit Docroot `public/`, Inhalten aus `content/*.json` und dem Synthwave-Stylesheet `public/assets/site.css`. Vor dieser Änderung gab es im Repository keine Bilder für Layout oder Inhalt.

Befunde vor der Umsetzung:

1. Die Galerie zeigt 25 Event-Fotos über `GALLERY_BASE_URL` (Standard `/media/gallery`). Diese Dateien sind nicht im Repository. Alle Event-Fotos der Galerie sind daher defekt, die neuen Artwork-Bilder nicht. Das ist vorbestehend und nicht Teil dieser Änderung.
2. `favicon.ico` lag im Repository-Root und war 0 Byte groß. Der Docroot ist `public/`, das Icon wurde also nie ausgeliefert.
3. Es gab keine Open-Graph-Metadaten. Links auf die Website zeigten in Vorschauen kein Bild.
4. Die Dateien `DJPult.gif`, `RadioStudio.mov` und `JesseJayBanner.mov` liegen im Root und sind nicht öffentlich erreichbar.
5. Die Startseite nennt die Sendung „Galaxy Space Night“. Das neue Poster heißt „Cy8er Space Night“. Die Bezeichnung ist offen, siehe unten.

## Analyse der 15 Bilder

Nummerierung nach Reihenfolge der Anhänge. „Quelle“ ist der Dateiname im Upload-Ordner. Die Originale liegen nicht im Repository (rund 11,6 MB).

| Nr. | Quelle | Motiv | Original | Entscheidung | Web-Datei |
| --- | --- | --- | --- | --- | --- |
| 1 | 7cb48743-image.png | IBM System 370, Variante mit Figuren und Laptops | 760×428 | Galerie | `art-ibm370-variant.webp` |
| 2 | 399ae1f4-image.png | IBM System 370, Crew-Version mit Figuren an den Konsolen | 760×428 | Galerie | `art-ibm370-cy8er.webp` |
| 3 | f84682b8-image.png | IBM System 370, saubere Fassung, höchste Qualität | 1448×1086 | Galerie | `art-ibm370-clean.webp` |
| 4 | 1a90616d-image.png | DJJJ Signature Bridge v1, Architekturübersicht | 1536×1024 | Galerie | `art-signature-bridge.webp` |
| 5 | 043ee7c1-image.png | Radio LoRa 97.5 als Mosaik, mit Wasserzeichen unten rechts | 1672×941 | News | `radio-lora-97-5.webp` |
| 6 | 2abfa677-image.png | Neon-Schild „Progressive Music Attack“ | 1600×900 | Galerie und Social-Card | `neon-plate.webp` |
| 7 | 29e51c70-image.jpg | DJ-Controller mit Schriftzug | 1536×645 | Biografie | `dj-controller.webp` |
| 8 | 21d489d9-image.jpg | djjjcoin-Infografik „Wie funktioniert djjjcoin?“ | 1536×864 | zurückgestellt | (nicht erzeugt) |
| 9 | dcba033d-image.jpg | Infografik „Elektronische Musik“, Produktionsprozess | 1536×864 | Musik, mit Vollbild-Link | `infographic-elektronische-musik.webp` |
| 10 | a92499a4-image.jpg | Poster „Blue Dimension Cy8er Space Night“ | 1536×1024 | Events | `event-poster-cyber-space-night.webp` |
| 11 | bf20765e-image.jpg | Logo-Präsentationsboard mit Erklärtexten | 1536×864 | zurückgestellt | (nicht erzeugt) |
| 12 | 517059db-image.jpg | Banner „designed by TwoDivision“ | 1536×512 | Galerie, Credit | `credit-twodivision.webp` |
| 13 | 2aef8653-image.jpg | Logo J·Γ im blauen Ring, quadratisch | 1536×1536 | Header, Favicon, Apple-Icon | `logo-badge.webp`, `favicon.ico`, `apple-touch-icon.png` |
| 14 | 84482ead-image.jpg | Vinyl-Logo mit Tonarm, „Zürich · est. 1997“ | 1536×1536 | Galerie | `logo-vinyl.webp` |
| 15 | ef9ed394-image.jpg | Schriftzug „DJ JESSE JAY“ auf Blau | 1536×646 | Startseite (Hero) | `hero-wordmark.webp` |

Zwei Bilder sind mit Text belegt, der für Besucher nicht gedacht ist (Nr. 11) oder für Lesbarkeit zu klein ist (Nr. 9, daher Vollbild-Link). Nr. 1 und Nr. 2 haben nur 760 Pixel Kantenlänge. Sie werden nicht hochskaliert, sondern in nativer Größe ausgeliefert.

## Entscheidungen

Format: WebP, Qualität 82, längste Kante höchstens 1536 px. Gesamtgewicht der 13 Dateien: 1,5 MB, gegenüber 11,6 MB der Originale. Das größte Einzelbild ist 286 KB.

Herkunft: Die Originale liegen außerhalb des Repositorys. Das Build-Skript ist reproduzierbar, sobald der Quellordner vorhanden ist. Die Quelldateien sollen nicht in Git landen, weil sie das Repository um 11,6 MB vergrößern würden.

Wasserzeichen: Bei Nr. 5 wurden die untersten 48 Pixel abgeschnitten. Das entfernt das Wasserzeichen „© Gemini Notebook“ vollständig. Die Kontrolle erfolgte visuell.

Logo im Header: Die Marke wird als kreisförmiges Icon links neben dem Namen gezeigt. Das Favicon wird aus demselben Motiv erzeugt, damit der Browser-Tab zur Marke passt.

Social Cards: Alle Seiten erhalten `og:image` mit dem Neon-Schild. Die URL ist absolut und stammt aus `SITE_URL` (Standard `https://djjessejay.ch`, per Umgebungsvariable überschreibbar).

Ladeverhalten: Das Hero-Bild lädt mit `loading="eager"`. Alle anderen Bilder laden mit `loading="lazy"`. Jedes `<img>` trägt `width` und `height`, damit beim Laden kein Layout springt.

Barrierefreiheit: Jedes Bild hat einen beschreibenden Alt-Text im Manifest. Das Header-Logo ist dekorativ und hat `alt=""`, weil der Markenname direkt daneben steht.

## Zurückgestellt

Nr. 8 (djjjcoin-Infografik) wird nicht veröffentlicht. Die Grafik wirbt für einen Krypto-Token mit Angaben zu Menge, Halving und Belohnung. Vor einer öffentlichen Veröffentlichung sollte eine rechtliche Prüfung erfolgen, insbesondere zu Werbung für Token und den Leitlinien der FINMA. Der Eintrag steht in `HELD` in `scripts/build-images.py`. Zum Aktivieren: Eintrag aus `HELD` in `JOBS` überführen, Manifest in `app/images.php` ergänzen, Bild in eine Seite einbinden.

Nr. 11 (Logo-Präsentationsboard) wird nicht veröffentlicht. Die Erklärtexte („Das Logo – Bedeutung“) sind Gestaltungsnotizen und keine Besucherinhalte. Das Logo selbst ist in Nr. 13 und Nr. 14 enthalten.

## Umsetzung

Die Umsetzung besteht aus diesen Teilen:

| Teil | Datei | Aufgabe |
| --- | --- | --- |
| Build | `scripts/build-images.py` | Originale zu WebP skalieren, zuschneiden, Favicon erzeugen |
| Katalog | `app/images.php` | Manifest mit Maßen und Alt-Texten, Helfer `image_tag()`, `figure_tag()`, `image_url()` |
| Layout | `app/layout.php` | Favicon-Links, Open-Graph-Tags, Logo im Header |
| Seiten | `templates/index.php`, `news.php`, `events.php`, `biography.php`, `music.php`, `gallery.php` | Bilder einbinden, danach `php scripts/render-static.php` |
| Stil | `public/assets/site.css` | Bildrahmen, Bildunterschriften, Artwork-Raster |
| Tests | `scripts/test-site.php` | Prüfungen für Katalog, Dateien, Größen, Verwendung |

Seitenzuordnung:

Startseite: Hero-Wordmark unter der Einleitung.
News: Radio LoRa 97.5 unter der Überschrift.
Events: Poster unter der Einleitung.
Biografie: DJ-Controller über dem Text.
Musik: Infografik mit Vollbild-Link über der Tabelle.
Galerie: neuer Abschnitt „Artwork“ über den Event-Fotos mit sieben Bildern.
Header: Logo in allen Seiten.

Neue Bilder hinzufügen: Original in den Quellordner legen, Eintrag in `JOBS` ergänzen, Build ausführen, Eintrag in `IMAGES` ergänzen, Einbindung mit `figure_tag('<key>')` setzen. Die Tests schlagen fehl, bis alle Schritte erledigt sind.

## Prüfung

Lokal ausführen:

```
pip install Pillow
python3 scripts/build-images.py /pfad/zu/originalen
php scripts/test-site.php
php -l app/images.php
```

Die Tests prüfen für jedes Manifest-Bild:

1. Datei existiert und ist nicht leer.
2. Dateigröße liegt unter 300 KB.
3. Maße in der Datei stimmen mit dem Manifest überein.
4. Alt-Text ist nicht leer.
5. Schlüssel wird in mindestens einer Seite oder im Layout verwendet.

Zusätzlich prüfen sie, dass keine Datei in `public/assets/img/` ohne Manifest-Eintrag liegt, dass `public/favicon.ico` vorhanden ist und dass die Social-Card-URL absolut ist.

Browser-Prüfung: Startseite, Galerie, Musik und Events wurden bei 1280 px und 390 px Breite geladen. Die neuen Bilder laden fehlerfrei. Die Galerie zeigt weiterhin defekte Event-Fotos, siehe unten. News und Biografie wurden per Test gerendert, aber nicht im Browser geprüft.

## Betrieb

Nginx liefert `/assets/` mit `Cache-Control: public, immutable` und 30 Tagen Gültigkeit. Ändert sich der Inhalt eines Bildes, muss sich der Dateiname ändern, zum Beispiel `art-ibm370-clean-v2.webp`. Sonst sehen Besucher für bis zu 30 Tage die alte Version.

## Offene Punkte

1. Name der Reihe: Die Startseite und die Musikseite nennen „Galaxy Space Night“, das Poster heißt „Cy8er Space Night“. Die Entscheidung liegt beim Betreiber.
2. djjjcoin (Nr. 8): Veröffentlichen oder nicht, nach rechtlicher Prüfung.
3. Herkunft und Rechte: Mehrere Motive tragen Gemini-Wasserzeichen oder sind KI-gestützt erstellt. Die Nutzungsrechte und eine etwaige Kennzeichnung sollten bestätigt werden.
4. Galerie-Fotos: Die 25 Event-Fotos fehlen auf dem Server. Lösung: Dateien unter `GALLERY_BASE_URL` bereitstellen oder den Pfad korrigieren.

## Nebenbefunde

Die Musikseite hat in der Tabelle einen horizontalen Überlauf von 6 px bei 390 px Breite. Die Ursache ist die bestehende Tabelle, nicht die Bilder. Eine Lösung wäre ein Wrapper mit `overflow-x: auto`.

Das Dockerfile kopiert alle Dateien des Repositorys ins Image, auch `RadioStudio.mov` (21 MB) und `DJPult.gif` (5,6 MB). Diese Dateien werden nicht ausgeliefert, vergrößern aber das Image. Ein Eintrag in `.dockerignore` würde das verhindern.
