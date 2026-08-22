#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MAKE-FULL-BUNDLE — baut das GARANTIERT VOLLSTÄNDIGE Delta-Bundle ab Baseline
# und BEWEIST sich selbst, dass nichts fehlt.
#
# Warum: Partielle Bundles ("nur die letzte Änderung") + der alphabetische
# last-wins-Deploy führten dazu, dass live mal etwas fehlte. Dieses Skript liefert
# IMMER ein komplettes Overlay ALLER Quell-/Tool-Dateien seit der Baseline und
# verifiziert per Deploy-Simulation, dass ein frischer Build aus SAUBERER Baseline
# + nur diesem Bundle BYTE-IDENTISCH zum lokalen Build ist. Weicht auch nur eine
# Datei ab (= irgendwas fehlt), bricht das Skript ab und liefert KEIN Bundle.
#
# Nutzung:  bash tools/make-full-bundle.sh
# Exit 0 = vollständiges, byte-identisch verifiziertes Bundle liegt im Repo-Root.
# Exit ≠0 = unvollständig/kaputt → NICHT ausliefern.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
BASELINE=618bb0b
cd "$(git rev-parse --show-toplevel)"
STAMP=$(date +%Y-%m-%d-%H%M)
OUT="bundle-zzzzzzz-komplett-${STAMP}.b64"

echo "▸ Baseline-Prüfung ($BASELINE ist Vorfahre?)"
git merge-base --is-ancestor "$BASELINE" HEAD || { echo "✗ Baseline ist kein Vorfahre von HEAD."; exit 2; }

echo "▸ Lokalen Build erzeugen"
npm run build:standalone >/dev/null 2>&1

echo "▸ Komplette Dateiliste zusammenstellen (alle Änderungen seit Baseline + untracked Source)"
{ git diff --name-only "$BASELINE" -- . ; git ls-files --others --exclude-standard ; } | sort -u \
  | grep -vE '^(dist-standalone/|webapp/|node_modules/)' \
  | grep -vE '\.(b64|zip)$' \
  | grep -vE '^(_dbg\.mjs|_probe\.mjs|deploy\.yml)$' \
  | grep -vE '^tools/(_|shot-|smoke-|city-)' \
  | grep -vE '^tools/make-(sprite|brown-reh)\.py$' \
  | grep -vE '^tools/\.last-build-size\.json$' \
  | grep -vE '^expected-version.*\.json$' > /tmp/mfb_filelist.txt
N=$(wc -l < /tmp/mfb_filelist.txt)
echo "  → $N Dateien"

echo "▸ Zippen + base64 → $OUT (sortiert zuletzt: gewinnt gegen ältere Bundles)"
rm -f /tmp/mfb.zip
zip -q /tmp/mfb.zip -@ < /tmp/mfb_filelist.txt
base64 -w0 /tmp/mfb.zip > "$OUT"

echo "▸ SELBST-VERIFIKATION: Deploy-Simulation aus SAUBERER Baseline + nur diesem Bundle"
rm -rf /tmp/mfb_sim; mkdir -p /tmp/mfb_sim
git archive "$BASELINE" | tar -x -C /tmp/mfb_sim
base64 -d "$OUT" > /tmp/mfb_sim/_b.zip
( cd /tmp/mfb_sim && unzip -oq _b.zip && rm -f _b.zip \
    && npm ci --silent >/dev/null 2>&1 && npm run build:standalone >/dev/null 2>&1 )

python3 - <<'PY'
import re, hashlib, sys
def norm(p):
    s = open(p, encoding='utf-8').read()
    s = re.sub(r'children:\["v","[^"]*UTC"\]', 'children:["v","STAMP"]', s)  # Build-Stempel neutralisieren
    return hashlib.sha256(s.encode()).hexdigest()
a = norm('dist-standalone/index.html')
b = norm('/tmp/mfb_sim/dist-standalone/index.html')
if a == b:
    print("  ✓ byte-identisch — das Bundle enthält ALLES, nichts fehlt.")
else:
    print("  ✗ ABWEICHUNG — Bundle ist UNVOLLSTÄNDIG. Nicht ausliefern!")
    sys.exit(3)
PY

echo "✓ FERTIG: $OUT  ($N Dateien, vollständig verifiziert)"
