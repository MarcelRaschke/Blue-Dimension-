# Pi auf Android mit Termux

Diese Anleitung beschreibt, wie Pi unter Android in Termux läuft. Texteingabe, Dateiwerkzeuge und Shell-Befehle werden unterstützt. Über Termux:API kann Pi Text aus der Android-Zwischenablage kopieren und einfügen. Bilder aus der Zwischenablage kann Pi nicht einfügen.

## Voraussetzungen

Termux über GitHub oder F-Droid installieren. Die veraltete Google-Play-Version nicht verwenden.

Termux:API ist optional. Es wird nur benötigt, wenn Pi Text über die Android-Zwischenablage kopieren oder einfügen soll oder wenn Shell-Befehle Android-Geräte-APIs brauchen.

## Pi installieren

Termux-Pakete aktualisieren:

```
pkg update && pkg upgrade
```

Node.js und Git installieren:

```
pkg install nodejs git
```

Pi installieren:

```
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Installation prüfen:

```
pi --version
```

Arbeitsordner öffnen und Pi starten:

```
cd /pfad/zum/arbeitsordner
pi
```

Danach mit dem Quickstart fortfahren, um ein Modell anzubinden und die erste Aufgabe auszuführen.

## Zugriff auf den gemeinsamen Android-Speicher

Termux braucht eine einmalige Freigabe, bevor es auf den gemeinsamen Speicher zugreifen kann:

```
termux-setup-storage
```

Nach der Freigabe liegt der gemeinsame Speicher unter `/storage/emulated/0` und über die Links unter `~/storage/`.

Die Berechtigung nur erteilen, wenn Pi auf diese Dateien zugreifen soll. Befehle und Werkzeuge in Termux haben dieselben Speicherrechte wie der Termux-Prozess.

## Zwischenablage nutzen

Pi kopiert Text mit `termux-clipboard-set` und fügt Text mit `termux-clipboard-get` ein. Die Termux:API-App und das Kommandozeilenpaket installieren:

```
pkg install termux-api
```

Integration prüfen:

```
printf 'Pi clipboard test' | termux-clipboard-set
termux-clipboard-get
```

Der zweite Befehl muss `Pi clipboard test` ausgeben.

Die Termux-Zwischenablage unterstützt nur Text. Pis Einfüge-Kurzbefehl fügt Text in den Editor ein, Bilder können nicht angehängt werden.

## Termux-Hinweise für Pi

Pi erkennt, dass es in Termux läuft, weiß aber nicht, wie du mit Android arbeiten willst. Nur die Angaben eintragen, die für deine Arbeit wichtig sind, in `~/.pi/agent/AGENTS.md`:

```
# Termux-Umgebung

- Pi läuft in Termux auf Android.
- Der gemeinsame Android-Speicher liegt unter `/storage/emulated/0`.
- URLs öffnen mit `termux-open-url "https://example.com"`.
- Dateien öffnen mit `termux-open <pfad>`.
- Auf den gemeinsamen Speicher nur zugreifen, wenn die Aufgabe es verlangt.
```

Nach einer Änderung an der Datei während einer laufenden Sitzung `/reload` ausführen.

## Fehlerbehebung

**Zwischenablage funktioniert nicht.** Prüfen, ob beide Komponenten installiert sind: die Termux:API-App aus derselben Quelle wie Termux und das Paket `termux-api`. Danach die Prüfbefehle oben außerhalb von Pi ausführen. Schlagen sie fehl, zuerst die Termux:API-Installation reparieren.

**Gemeinsamer Speicher meldet „Permission denied“.** `termux-setup-storage` ausführen, die Android-Abfrage bestätigen und den Pfad unter `~/storage/` oder `/storage/emulated/0` erneut versuchen.

**Pi wird nach der Installation nicht gefunden.** Eine neue Termux-Shell öffnen und ausführen:

```
npm prefix -g
command -v pi
```

Prüfen, ob das globale npm-Bin-Verzeichnis im `PATH` liegt. Fehlt das Paket, Pi neu installieren.
