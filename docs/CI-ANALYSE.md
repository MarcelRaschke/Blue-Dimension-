# CI-Analyse: Hypothesen, Tests, Ergebnisse

Stand: `main` bei Commit `96bd546`. Anlass: Nach den PRs #14, #15 und #17 waren mehrere Workflows rot. Dieses Dokument trennt, was im Repository lösbar ist, von dem, was eine Repo-Einstellung oder eine Entscheidung braucht.

## Methode

Jede Hypothese wurde gegen Logs der betroffenen Läufe geprüft, nicht gegen den Job-Namen. Wo möglich, wurde lokal reproduziert (Syntaxprüfung, Semgrep mit den Regelsätzen aus `security.yml`, Tests in `scripts/test-site.php`). Docker ist in der Analyseumgebung nicht verfügbar. Build-Schritte sind daher nur über CI geprüft.

## Hypothesen

| Nr. | Hypothese | Test | Ergebnis | Maßnahme |
| --- | --- | --- | --- | --- |
| H1 | `scripts/restore-deployment.sh` hat einen Syntaxfehler | `bash -n` | bestätigt: `|| {` öffnet eine Gruppe, deren `}` im Heredoc steht | behoben: Klammer entfernt, der folgende `if [ $? -eq 0 ]`-Block wertet den Status weiterhin aus |
| H2 | OWASP-Dependency-Check bricht ab, weil ein Projektname fehlt | Log: `Missing argument for option: project` | bestätigt | behoben: Input `project` gesetzt. Nicht lokal ausgeführt, nur über das Log belegt |
| H3 | CodeQL scheitert an unparsbaren Archiv-Dateien unter `docs/archive/` | Log des Laufs auf `bdaa977` | für diesen Lauf bestätigt. Auf `main` ist seit `96bd546` `paths-ignore: docs/archive` gesetzt | keine weitere Maßnahme nötig. Ein neuer Lauf muss das bestätigen |
| H4 | Trivy, Semgrep, CodeQL und Dependency Review scheitern an fehlender Advanced Security | Logs: `Resource not accessible by integration` beim SARIF-Upload, `Dependency review is not supported on this repository` | bestätigt. Die Fehlermeldungen sagen, dass GitHub Advanced Security für dieses Repo nicht aktiv ist | nicht im Repo lösbar, siehe Entscheidungen |
| H5 | Der Psalm-Schritt ist wirkungslos | Log: `composer require psalm/psalm` findet kein Paket | bestätigt. Richtiger Name wäre `vimeo/psalm`, aber der Schritt endet mit `|| echo` und setzt eine Konfiguration voraus, die fehlt | nicht geändert. Vorschlag: Schritt entfernen |
| H6 | `monitor.yml` und `pr-validation.yml` scheitern bei Push-Ereignissen | Läufe ohne Jobs, Status `failure`. YAML parst, `secrets` steht in keiner `if:`-Bedingung, die Trigger enthalten kein `push` | offen. Die Ursache liegt nicht im Dateiinhalt, und ich kann sie aus dem Repo nicht sicher bestimmen | nicht geändert. Nächster Schritt: Workflow-Ansicht in GitHub Actions prüfen |
| H7 | „Test Docker Compose Stack“ scheitert, weil `docker-compose` fehlt | Log: `docker-compose: command not found` (Exit 127) | bestätigt. Der Runner hat nur das Plugin `docker compose` | behoben in `e10c446`. „Test Docker Setup“ ist auf dem Head grün |
| H8 | Doku verweist noch auf entfernte PHP-Health-Endpunkte | Suche nach `health.php`, `check.json.php`, `metrics.json.php` | bestätigt | behoben: URLs auf `/`, `/news.html`, `/gallery.html`, Hinweis in den betroffenen Dokumenten |
| H10 | Testsuite schlägt auf `main` fehl: committete HTML weicht von den Vorlagen ab | `php scripts/test-site.php` | bestätigt. Commit `4c6cdb6` hat `public/*.html` von Hand geändert (http→https für 13 Hosts), ohne Vorlagen und Generator anzupassen. Die Tests sind nicht in CI eingebunden | behoben. Die Umstellung läuft jetzt über `HTTPS_VERIFIED_HOSTS` in `app/html.php` und wird vom Generator erzeugt. Die Gästebuch-Texte bleiben im Originalwortlaut, weil dort keine Links stehen. |
| H9 | Mutable Action-Tags (`@master`, `@v4`) in Workflows | Semgrep-Regel `github-actions-mutable-action-tag` | bestätigt, vorbestehend | offen. `codeql.yml` ist bereits per SHA gepinnt, die übrigen Workflows nicht |

## Lessons

Ein roter Check ist nur dann repariert, wenn der Ursprungsfehler im Log belegt und der Fix danach im nächsten Lauf sichtbar ist. Mehrere Fehler der letzten Runde waren Repo-Einstellungen, nicht Code.

Ein Heredoc mit `<< EOF` wird erst nach der Zeile des Befehls gelesen. Eine Klammer, die dort geöffnet wird, schließt Bash nicht über das Heredoc hinweg.

`add_header` in einem Nginx-`location` ersetzt die Header der Server-Ebene vollständig. Das hat die Sicherheits-Header für statische Assets entfernt, bis Semgrep es gefunden hat.

Ein Workflow-Lauf auf `main` ist nur ein Zustand zu einem bestimmten Commit. Ein Befund zu einem älteren Commit gilt für neuere nicht mehr, wie bei H3 zu sehen war.

## Plan

Priorität 1, Entscheidung durch den Repo-Admin: GitHub Advanced Security aktivieren (Settings, Code security). Danach laufen Trivy, Semgrep-Upload, CodeQL und Dependency Review ohne Code-Änderung durch.

Priorität 2, Entscheidung durch den Betreiber: die `http://`-Links in den generierten Seiten (Radio-Archiv, Links, Gästebuch) auf https umstellen, sofern das Ziel erreichbar ist, sonst entfernen. Das schließt den Semgrep-Befund `plaintext-http-link`.

Priorität 3, Entscheidung: den Psalm-Schritt in `php-lint.yml` entfernen (H5).

Priorität 4, Analyse: die Workflows `monitor.yml` und `pr-validation.yml` in der GitHub-Oberfläche auf die Ursache der Läufe ohne Jobs prüfen (H6).

Priorität 5, Hygiene: die Action-Tags in den übrigen Workflows per SHA pinnen, nach dem Muster von `codeql.yml` (H9).

Priorität 6, Webroot: auf dem Server klären, welcher Ordner ausgeliefert wird, und danach den Auto-Deploy in `deploy.yml` wieder auf `push` zu `main` setzen (siehe `DEPLOYMENT.md`).

## Offene Entscheidungen

Advanced Security aktivieren: Ja oder nein. Ohne diese Einstellung bleiben vier Checks rot, unabhängig vom Code.

Die `http://`-Links: umstellen oder entfernen.

Der Psalm-Schritt: entfernen.

Der Webroot des Servers: welcher Ordner, siehe `DEPLOYMENT.md`.

Die https-Umstellung ist per Regel im Generator umgesetzt, nur für Hosts aus `HTTPS_VERIFIED_HOSTS`. Neue Hosts nur aufnehmen, wenn sie über TLS antworten. Offen bleiben die Links ohne TLS (`www.123galaxy.ch`), die RealMedia-Streams auf Port 554 und Bilder von Hosts, die nicht geprüft wurden (`a1.soundcloud.com`, `a2.ec-images.myspacecdn.com`).
