# Pi auf Android mit Termux

Pi läuft unter Android über Termux, eine Terminal-Emulation mit Linux-Umgebung. Unterstützt werden Texteingabe, Datei-Tools und Shell-Befehle. Mit Termux:API kann Pi Text über die Android-Zwischenablage kopieren und einfügen. Bilder aus der Zwischenablage werden nicht unterstützt.

## Voraussetzungen

Termux von GitHub oder F-Droid installieren. Die veraltete Google-Play-Version nicht verwenden.

Termux:API ist optional. Es wird nur benötigt, wenn Pi Text über die Android-Zwischenablage kopieren oder einfügen soll oder Shell-Befehle Android-Geräte-APIs nutzen müssen.

## Installation

Termux-Pakete aktualisieren:

```sh
pkg update && pkg upgrade
```

Node.js und Git installieren:

```sh
pkg install nodejs git
```

Pi installieren:

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Installation prüfen:

```sh
pi --version
```

Arbeitsverzeichnis öffnen und Pi starten:

```sh
cd /pfad/zum/arbeitsordner
pi
```

## Optional: Zwischenablage und Android-APIs

Termux:API-App und Kommandozeilenpaket installieren. Die App muss aus derselben Quelle stammen wie Termux.

```sh
pkg install termux-api
```

Integration prüfen (außerhalb von Pi ausführen):

```sh
printf 'Pi clipboard test' | termux-clipboard-set
termux-clipboard-get
```

Der zweite Befehl gibt `Pi clipboard test` aus. Pi verwendet `termux-clipboard-set` zum Kopieren und `termux-clipboard-get` für das Einfügen.

## Optional: Zugriff auf Android-Speicher

Termux kann erst auf den gemeinsamen Android-Speicher zugreifen, nachdem die Berechtigung erteilt wurde. Der Befehl muss einmalig ausgeführt werden:

```sh
termux-setup-storage
```

Danach ist der gemeinsame Speicher unter `/storage/emulated/0` sowie über die von Termux angelegten Links unter `~/storage/` erreichbar.

Die Berechtigung nur erteilen, wenn Pi auf diese Dateien zugreifen soll. Befehle und Tools in Termux verwenden dieselben Speicherrechte wie der Termux-Prozess.

## Umgebungshinweise für Pi

Pi erkennt, dass es in Termux läuft, kann aber nicht ableiten, wie es mit Android interagieren soll. Nur die für die Arbeit relevanten Angaben in `~/.pi/agent/AGENTS.md` ablegen:

```markdown
# Termux environment

- Pi runs in Termux on Android.
- Shared Android storage is under `/storage/emulated/0`.
- Open URLs with `termux-open-url "https://example.com"`.
- Open files with `termux-open <path>`.
- Do not access shared storage unless the task requires it.
```

Nach einer Änderung während einer laufenden Sitzung `/reload` in Pi ausführen.

Diese Datei liegt auf dem Gerät und gehört nicht ins Repository.

## Fehlerbehebung

Zwischenablage funktioniert nicht: Prüfen, ob sowohl die Termux:API-App als auch das Paket `termux-api` installiert sind. Die Prüfbefehle oben außerhalb von Pi ausführen. Schlagen sie fehl, zuerst die Termux:API-Installation reparieren.

Shared Storage meldet "permission denied": `termux-setup-storage` erneut ausführen, die Android-Berechtigung bestätigen und den Pfad unter `~/storage/` oder `/storage/emulated/0` erneut versuchen.

Pi wird nach der Installation nicht gefunden: In einer neuen Termux-Shell ausführen:

```sh
npm prefix -g
command -v pi
```

Danach prüfen, ob das globale npm-Binärverzeichnis im `PATH` liegt. Fehlt das Paket, Pi neu installieren.
