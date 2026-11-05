# Incident: Live-Edge-Ausfall djjessejay.ch

Datum: 2026-11-05  
Status: offen — Massnahmen ausstehend

---

## 1. Befund (verifiziert in dieser Session)

### Was im Repo existiert

- Deployment-Workflow: `.github/workflows/deploy.yml` — SFTP-Deploy auf Origin-Server, kein Cloudflare-Schritt.
- Monitoring: `.github/workflows/monitor.yml` — HTTP-Checks auf `djjessejay.ch/`, `news.html`, `gallery.html`.
- Performance-System: `performance-system/api-server/` — Express-API, Healthcheck-Endpoint `/health` auf Port 5000.
- Öffentliches Verzeichnis: `public/` — wird via SFTP nach `public_html/` deployt; GitHub Pages liefert ebenfalls aus `public/`.

### Was NICHT im Repo existiert (Stand main, Commit 7f50af9)

- `infra/cloudflare/` — Verzeichnis nicht vorhanden.
- `wrangler.toml` / `wrangler.json` — keine Cloudflare-Worker-Konfiguration.
- `API_ORIGIN_HOST` — kein einziger Treffer im gesamten Codebase (Grep über alle Dateitypen).
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `ORIGIN_HOST` — nicht referenziert.
- Cloudflare-Worker- oder Pages-Deploy-Schritt in einem Workflow — nicht vorhanden.

### Nicht zugänglich (Einschränkungen dieser Session)

- PR #120: existiert nicht in `MarcelRaschke/Blue-Dimension-` (höchste PR-Nummer: 47).
- Workflow-Run 38246122897: existiert nicht (aktuelle Run-IDs: ~41xxx).  
  Mögliche Ursachen: anderes Repo, ältere History vor einem Force-Push, oder externe CI-Pipeline.
- `gh secret list`: gh CLI nicht im Container verfügbar, GitHub MCP hat kein Secret-List-Tool.
- `wrangler secret list`: nicht ausführbar, da kein `infra/cloudflare/`-Verzeichnis vorhanden.

### Symptome laut geliefertem Kontext (nicht von dieser Session verifiziert)

| Endpoint | Status |
|---|---|
| `https://djjessejay.ch/` (Apex via Cloudflare Proxy) | 522 Timeout |
| GitHub Pages direkt | 200 OK |
| `https://djjessejay.ch/api/health` | 403 |
| `https://origin.djjessejay.ch/health` | 403 |

---

## 2. Ursache

Die Cloudflare-Edge-Schicht (Worker oder Pages-Proxy) leitet Anfragen an einen Origin-Host weiter,
der in `API_ORIGIN_HOST` / `ORIGIN_HOST` konfiguriert ist. Dieser Wert wurde durch einen
Workflow-Lauf leer überschrieben.

Konkrete Kausalkette (aus geliefertem Kontext):

1. Workflow-Run 38246122897 schrieb das Cloudflare-Worker-Secret `API_ORIGIN_HOST` mit einem
   leeren String — vermutlich weil `secrets.ORIGIN_HOST` im auslösenden Job nicht gesetzt war
   und `wrangler secret put` trotzdem ausgeführt wurde.
2. Der Worker proxiert seitdem ins Leere: 522 (Connection Timeout) am Apex.
3. `origin.djjessejay.ch` liefert 403, weil Cloudflare Origin Protection (WAF-Regel
   "allow only Cloudflare IPs") greift — der direkte Aufruf kommt nicht durch.
4. Die Repo-Secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` und `ORIGIN_HOST` fehlen,
   sodass kein Workflow den Schaden selbst beheben kann.

---

## 3. Massnahmen (ausschliesslich manuell, keine automatischen Deploys)

### 3.1 Sofortmassnahme: Leeres Secret reparieren

```bash
# Voraussetzungen: wrangler CLI installiert, Account-Token gesetzt
# Wechsel ins Worker-Verzeichnis (sobald infra/cloudflare/ im Repo vorhanden ist)
cd infra/cloudflare

# Secret setzen — WERT kommt aus eigenem Passwort-Manager / Notizen
wrangler secret put API_ORIGIN_HOST
# Prompt erscheint: Origin-Hostname eingeben (z.B. "origin.djjessejay.ch" oder die IP)

wrangler secret put ORIGIN_HOST
# Prompt erscheint: gleiches oder separates Ziel
```

### 3.2 Fehlende Repo-Secrets setzen

Im GitHub-Repository unter Settings > Secrets and variables > Actions folgende Secrets anlegen:

| Secret-Name | Inhalt |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account-ID (Dash > rechte Seite) |
| `CLOUDFLARE_ZONE_ID` | Zone-ID für djjessejay.ch (Dash > Zone-Übersicht) |
| `ORIGIN_HOST` | Hostname oder IP des Origin-Servers |

### 3.3 Origin Protection prüfen

Cloudflare Dash > djjessejay.ch > Security > WAF:

- Prüfen, ob eine Regel "Block non-Cloudflare IPs" auf Origin-Route greift.
- Für `origin.djjessejay.ch`: entweder DNS-Proxy deaktivieren (grauer Wolke, DNS-only)
  oder WAF-Regel temporär auf "Log" setzen, bis der Worker wieder korrekt routet.

### 3.4 Git-Integration für main in Cloudflare Pages deaktivieren (falls Pages genutzt)

Cloudflare Dash > Pages > Blue-Dimension > Settings > Builds & deployments:

- "Disable automatic deployments" für main aktivieren.
- Hintergrund: Jeder Push auf main triggert sonst automatisch einen Pages-Build,
  der wiederum den leeren Secret-Wert neu setzt, falls der Buildschritt nicht sauber ist.

### 3.5 Workflow-Fix (vorzubereiten, erst nach Zustimmung deployen)

Damit ein Workflow-Run `API_ORIGIN_HOST` nie leer überschreiben kann:

```yaml
# Schutzmuster vor jedem 'wrangler secret put'-Schritt:
- name: Guard against empty ORIGIN_HOST
  run: |
    if [ -z "${{ secrets.ORIGIN_HOST }}" ]; then
      echo "::error::ORIGIN_HOST secret is empty — aborting to protect live worker"
      exit 1
    fi
```

---

## 4. Verifikation nach den Massnahmen

```bash
# 1. Cloudflare-Worker-Secret bestätigen (zeigt nur Namen, nie Wert)
wrangler secret list

# 2. Apex-Erreichbarkeit
curl -i https://djjessejay.ch/api/health

# Erwartetes Ergebnis: HTTP 200, JSON-Body {"status":"ok"} oder ähnlich

# 3. Origin direkt (nur aus vertrauenswürdiger IP / VPN, da Origin Protection aktiv)
curl -i https://origin.djjessejay.ch/health

# Erwartetes Ergebnis: HTTP 200 (sobald WAF-Regel angepasst oder IP whitelisted)

# 4. GitHub Pages Baseline
curl -i https://marcelraschke.github.io/Blue-Dimension-/

# Erwartetes Ergebnis: HTTP 200 (Referenz — diese Route ist unabhängig von Cloudflare)
```

---

## 5. Offene Fragen (vor weiteren Schritten klären)

1. Welches Repo / welche Repo-URL enthält den Cloudflare-Worker-Code und `infra/cloudflare/`?
   (In `MarcelRaschke/Blue-Dimension-` ist dieses Verzeichnis nicht vorhanden.)
2. In welchem Workflow und welchem Schritt genau wurde `wrangler secret put` mit leerem Wert
   aufgerufen? (Run 38246122897 ist in diesem Repo nicht sichtbar.)
3. Ist `origin.djjessejay.ch` eine separates DNS-A-Eintrag auf den Origin-IP?
   Falls nein: DNS-Eintrag anlegen (A-Record, DNS-only / grau, nicht proxied).

---

_Letzte Aktualisierung: 2026-11-05 — diese Datei wurde nur lokal ins Repo geschrieben, nicht veröffentlicht._
