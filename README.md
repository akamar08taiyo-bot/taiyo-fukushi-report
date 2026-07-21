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
| 報告書取込（STEP1） | レンタル単位数報告書を **PDF / Excel(.xlsx) / CSV** から取込。商品名・TAISコード・単位数に加え、**利用者名・居宅介護支援事業所・ケアマネジャー名**も自動入力。詳細は下記「単位数報告書の抽出ルール」 |
| 取込データ一覧（2枚目） | 取り込んだ全明細を帳票2枚目に表として出力し、納品分に色を付ける（色付け・表そのものはチェックでON/OFF） |
| 合計単位数 | 帳票に出すかをチェックで選択（既定はOFF） |
| AI認識 | **既定でOFF**（APIキーの保管リスクを避けるため）。`src/index.html` の `AI_ENABLED = false` を `true` にして `node build.js` するだけで復活する |
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

## 単位数報告書の抽出ルール（実物様式に対応）

PDFを取り込むと、まず**レンタル単位数報告書（表形式）**として解釈し、該当しなければカタログとして解釈する。

実物様式は「1商品 = 3行ブロック」:

```
[種目行] 予防手すり貸与                      01265-000055
[商品行] たよレールN　2型 │納品│1│2,260│半月│1,130│11│113│31│226│
[日付行] 2026年07月21日　～
```

列見出しは `… │区分│料金│日数│単位数│日数│単位数` で、手前の単位数は日割り。

| 取得項目 | ルール |
|---|---|
| TAISコード | 種目行の `#####-######` |
| 品目 | 種目行のTAIS以外の文字列を正規化（`予防手すり貸与` → 品目`手すり` ＋ 区分`介護予防福祉用具貸与`） |
| 商品名 | 商品行の先頭〜「区分 or 数値」が現れる直前まで（複数spanに分割されても連結） |
| 単位数 | 商品行の**最後の数値＝月額**（226 / 400。日割りの113/200は取らない） |
| 区分 | 納品・引取 等。**納品のみ既定でチェックON**（他は一覧に残すがOFF） |
| メーカー名 | **取得しない**（運用方針） |
| 納品箇所 | **取得しない**（営業担当が任意で選択） |

実装: `parseRentalUnitReport()` / 種目名の正規化は `normalizeItemLabel()`。
デバッグは `localStorage.setItem('taiyo_fukushi_debug','1')` 後に `window.__debugPdf` から呼べる。

## セキュリティ・品質（6観点の並列レビュー実施済み 2026-07-18）

- 印刷HTMLへの挿入は全フィールド `escapeHTML` 済み。写真は `data:image/` 形式のみ許可
- JSONインポートは構造・型を強制（`sanitizeImportedReport`）してから取込
- pdf.js は **4.10.38**（CVE-2024-4367 修正済み版）。加えて `isEvalSupported:false` を多層防御として設定
  - v4 では CMap 読み込みの戻り値が `{cMapData, isCompressed}` に変更（v3 の `compressionType` から）。`InlineCMapReaderFactory` はこれに準拠
- **AI機能は既定でOFF**（`AI_ENABLED = false`）。APIキー入力欄・AI認識・AI下書き・スキャンPDFのAI読取をすべて非表示にし、過去に保存されたAPIキーも起動時に消去する。
  戻すときは `src/index.html` の `AI_ENABLED` を `true` にして再ビルドするだけ（コードは残してある）
- 下書きは報告書ID別に保存。写真の実体削除は起動時GCに一本化（誤削除防止）
- 特定福祉用具（販売品）は「価格（円）」として入力・印字され、貸与の合計単位数とは分離集計
- 印刷ダイアログでは「余白: なし」を選ぶこと（既定余白のプリンタでは端が欠ける場合あり）

## メモ

- pdf.js は fake worker（同一バンドル）で動作。日本語PDFのため cmaps 168ファイルを base64 で `window.__PDF_CMAPS` に同梱している（ビルド時に build.js が注入）
- AI認識は `@anthropic-ai/sdk`（`dangerouslyAllowBrowser`）でブラウザから直接 Messages API を呼ぶ。モデルは設定で Opus 4.8 / Haiku 4.5 を選択。structured outputs でJSONを保証
- 帳票は DOM 注入方式（`#print-content-holder`）。PDF保存は html2canvas(scale2) + jsPDF
- デバッグ: コンソールで `window.__debugPdf.pdfToLines(buf)` / `parseCandidatesFromLines(spans)` が使える。エラーは `window.__appErrors` に蓄積
