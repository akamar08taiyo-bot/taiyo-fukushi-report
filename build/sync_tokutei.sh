#!/usr/bin/env bash
# 申請書アプリ（特定福祉用具）のカタログの部品を src/tokutei-catalog/ に写し直す（src/tokutei-catalog/SOURCE.md）
# 使い方: bash build/sync_tokutei.sh <申請書アプリのチェックアウト（claude/care-insurance-auto-transfer-3z0c9n）>
set -euo pipefail
SRC="${1:?申請書アプリのチェックアウトの場所を指定してください}/src/tokutei"
DST="$(cd "$(dirname "$0")/.." && pwd)/src/tokutei-catalog"
[ -d "$SRC" ] || { echo "見つかりません: $SRC" >&2; exit 1; }
while read -r f; do
  [ -n "$f" ] || continue
  [ "$f" = "import/pdfText.ts" ] && continue   # 差し替えたものを残す
  mkdir -p "$DST/$(dirname "$f")"
  cp "$SRC/$f" "$DST/$f"
done < "$DST/FILES.txt"
# catalogUrl をポータルの tokutei/ から見るように（SOURCE.md の 2）
python3 - "$DST/print/catalogPdf.ts" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = "export const catalogUrl = (file: string) => new URL(`catalog/${file}`, document.baseURI).href;"
new = """// 【福祉用具相談報告書アプリ用の変更】カタログは太陽ポータルの特定福祉用具のアプリの隣（tokutei/catalog/）にある。
// このアプリ（taiyo-fukushi-report/）からはそこを見る（src/catalogBridge.tsx の TOKUTEI_BASE。元は document.baseURI）
export const catalogUrl = (file: string) =>
  new URL(`catalog/${file}`, (globalThis as unknown as {__TOKUTEI_BASE__?: string}).__TOKUTEI_BASE__ || document.baseURI).href;"""
if old in s:
    s = s.replace(old, new)
elif '__TOKUTEI_BASE__' not in s:
    sys.exit('catalogUrl の書き方が変わっています。print/catalogPdf.ts を手で直してください')
open(p, 'w', encoding='utf-8').write(s)
PY
echo "写し直しました: $DST"
