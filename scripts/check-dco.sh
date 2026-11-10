#!/usr/bin/env bash
#
# Prüft die Developer Certificate of Origin (DCO 1.1) für alle Commits in BASE..HEAD.
# Jeder Commit braucht eine Signed-off-by-Zeile, deren E-Mail mit der Autor-E-Mail
# übereinstimmt. Merge-Commits werden übersprungen.
#
# Aufruf: scripts/check-dco.sh <base-ref> <head-ref>

set -euo pipefail

BASE="${1:?Aufruf: check-dco.sh <base-ref> <head-ref>}"
HEAD="${2:?Aufruf: check-dco.sh <base-ref> <head-ref>}"

fail=0
checked=0

while read -r sha; do
    [ -n "$sha" ] || continue
    checked=$((checked + 1))

    author=$(git log -1 --format='%ae' "$sha" | tr '[:upper:]' '[:lower:]')
    subject=$(git log -1 --format='%s' "$sha")
    signoff_emails=$(git log -1 --format='%B' "$sha" \
        | sed -n -E 's/^Signed-off-by: .+ <([^>]+)>[[:space:]]*$/\1/p' \
        | tr '[:upper:]' '[:lower:]')

    if printf '%s\n' "$signoff_emails" | grep -Fxq -- "$author"; then
        continue
    fi

    echo "::error title=DCO fehlt::${sha:0:12} '${subject}': keine Signed-off-by-Zeile mit ${author}"
    fail=1
done < <(git rev-list --no-merges "$BASE..$HEAD")

if [ "$fail" -ne 0 ]; then
    cat <<EOF

Behebung für betroffene Commits (lokal, Branch danach mit --force-with-lease pushen):
  git rebase --signoff $BASE
Die E-Mail im Trailer muss der Autor-E-Mail (git config user.email) entsprechen.
EOF
    exit 1
fi

echo "DCO ok: ${checked} Commit(s) geprüft."
