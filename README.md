# 福祉用具相談報告書アプリ（taiyo-fukushi-report）

太陽シルバーサービス㈱の営業担当が、現場写真を貼るだけでケアマネ向けの
「福祉用具相談報告書」（A4・写真台帳つき）を作れる単一HTMLアプリ。

- 公開形態: `index.html` 1ファイル（CDN依存ゼロ・オフライン動作）
- データ保存: localStorage（報告書・商品マスタ・設定）+ IndexedDB（写真本体）
- 標準スタック: React 18 + Tailwind（taiyo-mitsumori と同じビルド構成）

## 主な機能

| 機能 | 説明 |
|---|---|
| 写真取込 | 添付/カメラ撮影 → 長辺1400pxへ自動リサイズ・EXIF向き補正・JPEG圧縮 |
| PDF取込 | レンタル単位数報告書やカタログPDFから商品名・TAISコード・単位数を自動抽出（日本語CMap同梱）。候補をチェックして明細へ一括反映 |
| AI認識（任意） | 設定でAnthropic APIキーを入れると、写真から商品名/TAIS/設置場所を認識、スキャンPDFの読み取り、報告事項の下書き生成が使える |
| 商品マスタ学習 | 保存・取込のたびに商品名→TAIS/単位数を学習。次回から入力補完 |
| A4帳票 | 明朝・ネイビーの企業文書。1ページ目=ヘッダー+報告事項+写真4枚、以降6枚/頁。印刷 & PDF保存 |
| データ移行 | JSONエクスポート/インポート（写真込み）で営業所間の受け渡し |

## ビルド

```bash
cd build
npm install
node build.js   # src/index.html → ../index.html（単一ファイル・約4MB）
```

動作確認: ルートで `node _serve.cjs` → http://localhost:5599

## 構成

```
src/index.html     … 開発ソース（JSX: text/babel ブロック）
build/build.js     … esbuild + Tailwind静的生成 + pdf.js CMap同梱
index.html         … 配布物（これだけ配ればよい）
```

## セキュリティ・品質（6観点の並列レビュー実施済み 2026-07-18）

- 印刷HTMLへの挿入は全フィールド `escapeHTML` 済み。写真は `data:image/` 形式のみ許可
- JSONインポートは構造・型を強制（`sanitizeImportedReport`）してから取込
- pdf.js は **4.10.38**（CVE-2024-4367 修正済み版）。加えて `isEvalSupported:false` を多層防御として設定
  - v4 では CMap 読み込みの戻り値が `{cMapData, isCompressed}` に変更（v3 の `compressionType` から）。`InlineCMapReaderFactory` はこれに準拠
- APIキーは端末のlocalStorageに平文保存（設定画面に注意書きあり。共用PCでは使用後に消す運用）
- 下書きは報告書ID別に保存。写真の実体削除は起動時GCに一本化（誤削除防止）
- 特定福祉用具（販売品）は「価格（円）」として入力・印字され、貸与の合計単位数とは分離集計
- 印刷ダイアログでは「余白: なし」を選ぶこと（既定余白のプリンタでは端が欠ける場合あり）

## メモ

- pdf.js は fake worker（同一バンドル）で動作。日本語PDFのため cmaps 168ファイルを base64 で `window.__PDF_CMAPS` に同梱している（ビルド時に build.js が注入）
- AI認識は `@anthropic-ai/sdk`（`dangerouslyAllowBrowser`）でブラウザから直接 Messages API を呼ぶ。モデルは設定で Opus 4.8 / Haiku 4.5 を選択。structured outputs でJSONを保証
- 帳票は DOM 注入方式（`#print-content-holder`）。PDF保存は html2canvas(scale2) + jsPDF
- デバッグ: コンソールで `window.__debugPdf.pdfToLines(buf)` / `parseCandidatesFromLines(spans)` が使える。エラーは `window.__appErrors` に蓄積
