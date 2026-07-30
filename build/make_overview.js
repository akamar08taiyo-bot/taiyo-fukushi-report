// 「福祉用具相談報告書アプリ 概要・機能解説書」Word生成（上長・本社・同僚向け）
// 実行: cd build && node make_overview.js
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, PageBreak,
  LevelFormat, convertMillimetersToTwip,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'docs', 'img');
const OUT = path.join(ROOT, 'docs', '福祉用具相談報告書アプリ_概要解説書_第1版.docx');
const URL = 'https://akamar08taiyo-bot.github.io/taiyo-fukushi-report/';
const VERSION = '第1版 / 2026年7月';
const FONT = 'Yu Gothic';

const CONTENT_PX = 620;
const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });
function img(name, maxPx = CONTENT_PX) {
  const data = fs.readFileSync(path.join(IMG, name + '.png'));
  const { w, h } = pngSize(data);
  const scale = Math.min(1, maxPx / w);
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: 'png', data, transformation: { width: Math.round(w * scale), height: Math.round(h * scale) } })],
  });
}
const caption = (s) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
  children: [new TextRun({ text: s, font: FONT, size: 18, color: '6B7280' })] });

const t = (text, opts = {}) => new TextRun({ text, font: FONT, ...opts });
const b = (s) => t(s, { bold: true });
const p = (text, opts = {}) => new Paragraph({ spacing: { after: 120, line: 320 }, children: Array.isArray(text) ? text : [t(text)], ...opts });
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 160 }, children: [t(text, { bold: true, size: 30, color: '1E3A8A' })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [t(text, { bold: true, size: 24, color: '1E40AF' })] });
const bullet = (children) => new Paragraph({ numbering: { reference: 'ovb', level: 0 }, spacing: { after: 80, line: 320 }, children: Array.isArray(children) ? children : [t(children)] });

const note = (title, lines, fill = 'FFF7ED', color = 'B45309') => new Table({
  columnWidths: [9000], width: { size: 9000, type: WidthType.DXA },
  rows: [new TableRow({ cantSplit: true, children: [new TableCell({
    width: { size: 9000, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [t(title, { bold: true, color })] }),
      ...lines.map(l => new Paragraph({ spacing: { after: 40, line: 300 }, children: Array.isArray(l) ? l : [t(l, { size: 20 })] })),
    ],
  })] })],
});

const table = (headers, rows, widths) => new Table({
  columnWidths: widths, width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA },
  rows: [
    new TableRow({ tableHeader: true, children: headers.map((htxt, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: 'DBEAFE' },
      margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [t(htxt, { bold: true, size: 20 })] })] })) }),
    ...rows.map(r => new TableRow({ children: r.map((cell, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [t(cell, { size: 20 })] })] })) })),
  ],
});
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const children = [];

// ---- 表紙 ----
children.push(
  new Paragraph({ spacing: { before: 2600, after: 160 }, alignment: AlignmentType.CENTER, children: [t('福祉用具相談報告書アプリ', { bold: true, size: 44, color: '1E3A8A' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 560 }, children: [t('概要・機能解説書', { bold: true, size: 38, color: '1E3A8A' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [t('現場写真とレンタル単位数報告書から、', { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [t('ケアマネジャー向けの報告書を自動で組み立てる社内ツールです。', { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [t(VERSION, { size: 24, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [t('太陽シルバーサービス株式会社', { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [t('（本書は概要説明用です。操作手順は別冊「操作マニュアル」をご覧ください）', { size: 18, color: '6B7280' })] }),
  pageBreak(),
);

// ---- 1. このアプリとは ----
children.push(
  h1('1. このアプリとは'),
  p([t('営業担当が現場で撮った写真と、'), b('レンタル単位数報告書'), t('を取り込むだけで、ケアマネジャーへお渡しする体裁の整った'), b('「福祉用具相談報告書」（A4・写真台帳つき）'), t('を、その場で作成・印刷できる社内アプリです。')]),
  p([t('商品名・TAISコード・単位数はもちろん、利用者名・居宅介護支援事業所・ケアマネジャー名・担当者名までを'), b('自動で読み取って転記'), t('します。営業担当の手入力を極力なくすことを狙いにしています。')]),
  img('01_list'),
  caption('起動直後の画面。「新しい報告書を作成」から始めます。'),
  note('ひとことで言うと', [
    '「取り込む → 写真を貼る → 印刷する」の3手だけで、報告書が完成します。',
    'インストール不要。パソコンのブラウザ（Chrome / Edge）で開くだけで使えます。',
  ], 'EFF6FF', '1E3A8A'),
  pageBreak(),
);

// ---- 2. 背景・目的 ----
children.push(
  h1('2. 開発の背景と目的'),
  h2('これまでの課題'),
  bullet('レンタル単位数報告書を見ながら、商品名・TAISコード・単位数を手作業で報告書へ転記していた。'),
  bullet('現場写真の取り込み・サイズ調整・貼り付けに手間がかかっていた。'),
  bullet('利用者名やケアマネジャー名などの記入も毎回必要で、作成に時間がかかっていた。'),
  h2('このアプリで目指したこと'),
  bullet([b('転記をなくす'), t('：単位数報告書を取り込めば、商品情報も宛名も自動で入る。')]),
  bullet([b('写真は貼るだけ'), t('：サイズ調整や向きの補正は自動。')]),
  bullet([b('その場で提出物が完成'), t('：A4の報告書として印刷・PDF保存まで一気通貫。')]),
  p('「営業担当がめんどうにならない仕組み」を最優先に設計しています。'),
  pageBreak(),
);

// ---- 3. できること ----
children.push(
  h1('3. できること（機能一覧）'),
  table(
    ['機能', '内容', '効果'],
    [
      ['報告書の自動取込', 'レンタル単位数報告書（PDF / Excel / CSV）を読み取り、商品情報と宛名を自動入力', '転記の手間をなくす'],
      ['写真の取り込み', '添付・ドラッグ＆ドロップ・貼り付け。長辺を自動縮小、向きも自動補正', '写真整理の手間を削減'],
      ['取込明細の編集', '商品名・区分・単位数などを画面上で修正、不要行は削除、合計は自動再計算', '例外にもその場で対応'],
      ['商品マスタ学習', '使った商品名を自動で記憶し、次回から呼び出し', '入力がどんどん楽に'],
      ['A4帳票の自動組版', '1枚目＝報告書、2枚目＝レンタル単位数一覧（納品分を色付け）', '見栄えの良い提出物'],
      ['報告事項サンプル', '納品・モニタリング等の区分別に定型文を用意', '文章づくりを時短'],
      ['印刷・PDF保存', 'そのまま印刷、またはPDFにして保存・送付', '提出まで完結'],
    ],
    [2200, 4600, 2200],
  ),
  pageBreak(),
);

// ---- 4. 主な機能の解説 ----
children.push(
  h1('4. 主な機能の解説'),
  h2('4-1. 単位数報告書の自動取込'),
  p([t('レンタル単位数報告書のファイルを取り込むと、商品を自動で読み取り、'), b('納品分にだけ'), t('あらかじめチェックを付けた一覧を表示します。必要な行を選んで報告書へ反映します。')]),
  p([t('PDF・Excel・CSV に対応。「保険外」の品目は自動で対象から外します。')]),
  img('03_cands'),
  caption('取り込んだ商品の候補一覧。納品分が選択済みで表示されます。'),
  p([t('同時に、'), b('利用者名・居宅介護支援事業所・ケアマネジャー名・担当者名'), t('も読み取って、報告書の情報欄へ自動で入力します（下図はダミーの氏名です）。')]),
  img('ov_step2'),
  caption('取込により自動入力された報告書の情報欄。'),
  pageBreak(),

  h2('4-2. 取り込んだ明細の編集'),
  p('取り込んだ内容は画面上で自由に直せます。商品名・区分・TAIS・種目・料金区分・各月の単位数のすべてを編集でき、合計はその場で計算し直します。報告書に載せたくない行（特価品など）は削除できます。'),
  img('ov_importedit'),
  caption('取込明細の編集表。単位数は手入力、合計は自動計算。'),
  pageBreak(),

  h2('4-3. A4帳票の自動組版'),
  p('入力内容から、A4サイズの報告書を自動で組み立てます。1枚目は宛名・報告事項・写真台帳、2枚目は取り込んだレンタル単位数の一覧表（今回納品した用具に色付け）です。そのまま印刷、またはPDFで保存できます。'),
  img('ov_page1', 430),
  caption('1枚目：福祉用具相談報告書（氏名はダミー）。'),
  pageBreak(),
  img('ov_page2', 430),
  caption('2枚目：レンタル単位数一覧。最下行が合計単位数。'),
  pageBreak(),
);

// ---- 5. 使い方の流れ ----
children.push(
  h1('5. 使い方の流れ'),
  p('日々の操作は次の4ステップだけです。詳しい操作は別冊「操作マニュアル」をご覧ください。'),
  table(
    ['順番', 'やること', '内容'],
    [
      ['STEP 1', '取り込む', 'レンタル単位数報告書を取り込む（商品情報・宛名が自動入力）'],
      ['STEP 2', '確認する', '利用者名・営業所・担当者などを確認する'],
      ['STEP 3', '写真を足す', '各明細に現場写真を付ける（貼るだけ）'],
      ['STEP 4', '印刷する', '印刷、またはPDFで保存して提出'],
    ],
    [1400, 2000, 5600],
  ),
  pageBreak(),
);

// ---- 6. 導入効果 ----
children.push(
  h1('6. 期待できる効果'),
  table(
    ['観点', 'これまで', 'このアプリ'],
    [
      ['商品情報の記入', '報告書を見ながら手で転記', '取り込むだけで自動入力'],
      ['宛名の記入', '毎回手入力', '取込時に自動入力'],
      ['写真の準備', 'サイズ調整して貼り付け', '貼るだけ（自動で縮小・補正）'],
      ['提出物の体裁', '担当者ごとにばらつき', '統一されたA4帳票'],
      ['作成場所', '事務所に戻ってから', 'その場で作成・PDF化'],
    ],
    [2000, 3500, 3500],
  ),
  p(''),
  note('ねらい', ['報告書づくりの手間を減らし、営業担当が「訪問・提案」に使える時間を増やすことを目的としています。'], 'EFF6FF', '1E3A8A'),
  pageBreak(),
);

// ---- 7. データ・セキュリティ ----
children.push(
  h1('7. データの取り扱いとセキュリティ'),
  bullet([b('データはパソコンの中だけに保存'), t('されます。外部のサーバーへ送信することはありません。別のパソコンとの受け渡しは、書き出し／取り込み機能で行います。')]),
  bullet([b('インターネット上の外部部品に依存せず動作'), t('します（オフラインでも起動）。社内ネットワークの制限下でも使えます。')]),
  bullet([b('AIによる自動認識機能は既定でオフ'), t('にしています（APIキー保管のリスクを避けるため）。将来必要になれば有効化できるよう、仕組みは残しています。')]),
  bullet([t('ブラウザの履歴（サイトデータ）を削除すると保存内容が消える場合があるため、'), b('大事な報告書は定期的に書き出して控えを取る'), t('ことを推奨しています。')]),
  note('ご注意', ['本書内のスクリーンショットの氏名（山田 花子ほか）はすべてダミーです。実際の画面には利用者・ケアマネジャーの氏名が表示されるため、画面の共有・配布時は取り扱いにご注意ください。']),
  pageBreak(),
);

// ---- 8. 基本情報 ----
children.push(
  h1('8. 基本情報'),
  table(
    ['項目', '内容'],
    [
      ['名称', '福祉用具相談報告書アプリ'],
      ['利用方法', 'ブラウザでURLを開くだけ（インストール不要）'],
      ['推奨環境', 'Google Chrome / Microsoft Edge'],
      ['アプリのURL', URL],
      ['対応する取込形式', 'PDF / Excel（.xlsx）/ CSV'],
      ['関連資料', '操作マニュアル（手順書・別冊）'],
      ['版数', VERSION],
    ],
    [2400, 6600],
  ),
  p(''),
  note('本書について', ['アプリの機能追加のたびに版数を上げて改訂します。表紙の版数・年月をご確認ください。'], 'EFF6FF', '1E3A8A'),
);

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [{ reference: 'ovb', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] }] },
  sections: [{
    properties: { page: { margin: {
      top: convertMillimetersToTwip(18), bottom: convertMillimetersToTwip(18),
      left: convertMillimetersToTwip(18), right: convertMillimetersToTwip(18) } } },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('created:', OUT, Math.round(buf.length / 1024) + 'KB'); });
