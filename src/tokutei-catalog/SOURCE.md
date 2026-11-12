# 特定福祉用具のカタログ部品（申請書アプリの写し）

このフォルダは、申請書アプリ（特定福祉用具 購入申請書・見積もり作成。太陽ポータルの `tokutei/`）の
ソースの一部を **そのまま写したもの** です。福祉用具相談報告書アプリの「📖 カタログから選ぶ」
（`src/catalogBridge.tsx`）で、申請書アプリと同じカタログ・同じ選び方を使うために置いています。

- 写した元：リポジトリ `akamar08taiyo-bot/-` のブランチ `claude/care-insurance-auto-transfer-3z0c9n`、
  `src/tokutei/` の下（コミット `92a41d9`、2026-11-09）
- 写したファイル：`FILES.txt`（カタログの部品から import をたどったもの。パスは元の `src/tokutei/` からの位置）
- カタログの中身（ページの絵 `catalog/*.jpg`・文字 `catalog/text.json`・罫線 `catalog/rules.json`）は写さない。
  太陽ポータルの `tokutei/catalog/` を読む（定価をリポジトリに持たない＝申請書アプリと同じ決まり）

## 元から変えた所（2つだけ）

1. `import/pdfText.ts` は差し替え：元は Vite 専用の `import.meta.glob` と pdf.js v6 を使うため。
   このアプリが同梱している pdf.js v4 と CMap（`window.__PDF_CMAPS`）で `openPdf` だけを用意した
2. `print/catalogPdf.ts` の `catalogUrl`：カタログの置き場所を `globalThis.__TOKUTEI_BASE__`（ポータルの `tokutei/`）から見る

ほかに、ビルド（`build/build.js`）で次をしている：
- `__APP_BUILD__` → `globalThis.__TOKUTEI_BUILD__`（ポータルの `tokutei/version.json` の版。`catalogBridge.tsx` が読む）
- `pdfjs-dist/legacy/build/pdf.min.mjs` → `pdf.mjs`（pdf.js を2つ同梱しない）
- JSX は automatic（申請書アプリの書き方）

## 申請書アプリのカタログが直ったとき（取り込み直し）

```bash
git clone --branch claude/care-insurance-auto-transfer-3z0c9n https://github.com/akamar08taiyo-bot/- /tmp/tokutei
bash build/sync_tokutei.sh /tmp/tokutei
cd build && node build.js
```

`sync_tokutei.sh` は `FILES.txt` のファイルを写し直し、上の 2 の変更をかけ直す（1 の差し替えはそのまま残す）。
カタログの部品が新しいファイルを import するようになったら、ビルドが「見つからない」で止まるので、`FILES.txt` に足してもう一度。
