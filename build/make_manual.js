// 営業所配布用「操作マニュアル」Word生成
// 実行: cd build && node make_manual.js
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
  LevelFormat, convertMillimetersToTwip,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'docs', 'img');
const OUT = path.join(ROOT, 'docs', '福祉用具相談報告書アプリ_操作マニュアル_第1版.docx');

const URL = 'https://akamar08taiyo-bot.github.io/taiyo-fukushi-report/';
const VERSION = '第1版 / 2026年7月';
const FONT = 'Yu Gothic';

// ---- 画像: PNGヘッダから実寸を読み、本文幅に収める ----
const CONTENT_PX = 620; // 本文幅の目安(px)
function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function img(name, maxPx = CONTENT_PX) {
  const file = path.join(IMG, name + '.png');
  const data = fs.readFileSync(file);
  const { w, h } = pngSize(data);
  const scale = Math.min(1, maxPx / w);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 160 },
    children: [new ImageRun({
      type: 'png', data,
      transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
    })],
  });
}

// ---- 段落ヘルパ ----
const t = (text, opts = {}) => new TextRun({ text, font: FONT, ...opts });
const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 100, line: 300 },
  children: Array.isArray(text) ? text : [t(text)],
  ...opts,
});
// 章ごとに手順番号を 1. から振り直すため、見出しで採番インスタンスを進める
let stepInstance = 0;
const h1 = (text) => {
  stepInstance += 1;
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 },
    children: [t(text, { bold: true, size: 32, color: '1E3A8A' })],
  });
};
// 小見出しでも手順番号を 1. から振り直す（「方法1／方法2」が続き番号にならないように）
const h2 = (text) => {
  stepInstance += 1;
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 },
    children: [t(text, { bold: true, size: 26, color: '1E40AF' })],
  });
};
// 手順（番号付き・1文1動作）
// Wordは同じ採番定義を共有すると番号が続いてしまうため、見出しごとに別定義を使う
const step = (text) => new Paragraph({
  numbering: { reference: 'steps' + stepInstance, level: 0 },
  spacing: { after: 80, line: 300 },
  children: Array.isArray(text) ? text : [t(text)],
});
const bullet = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: 60, line: 300 },
  children: Array.isArray(text) ? text : [t(text)],
});
const b = (s) => t(s, { bold: true });

// 注意ボックス（1行の枠付き段落）
const note = (title, lines) => {
  const rows = [new TableRow({
    cantSplit: true, // ページ跨ぎで枠が割れないようにする
    children: [new TableCell({
      width: { size: 9000, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: 'FFF7ED' },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [t(title, { bold: true, color: 'B45309' })] }),
        ...lines.map(l => new Paragraph({ spacing: { after: 40, line: 280 }, children: [t(l, { size: 20 })] })),
      ],
    })],
  })];
  return new Table({ columnWidths: [9000], width: { size: 9000, type: WidthType.DXA }, rows });
};

// うまくいかないとき（各操作の末尾）
const trouble = (lines) => note('うまくいかないとき', lines);

// 表
const table = (headers, rows, widths) => new Table({
  columnWidths: widths,
  width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA },
  rows: [
    new TableRow({
      tableHeader: true,
      children: headers.map((htxt, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'DBEAFE' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [t(htxt, { bold: true, size: 20 })] })],
      })),
    }),
    ...rows.map(r => new TableRow({
      children: r.map((cell, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [t(cell, { size: 20 })] })],
      })),
    })),
  ],
});

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ================= 本文 =================
const children = [];

// ---- 表紙 ----
children.push(
  new Paragraph({ spacing: { before: 2400, after: 200 }, alignment: AlignmentType.CENTER,
    children: [t('福祉用具相談報告書アプリ', { bold: true, size: 48, color: '1E3A8A' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [t('操作マニュアル', { bold: true, size: 40, color: '1E3A8A' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [t('現場の写真とレンタル単位数報告書から、', { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 },
    children: [t('ケアマネジャー向けの報告書を作るアプリです。', { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [t(VERSION, { size: 24, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [t('太陽シルバーサービス株式会社', { size: 24 })] }),
  pageBreak(),
);

// ---- 目次代わりの全体像 ----
children.push(
  h1('この冊子の使い方'),
  p('この冊子は、はじめてアプリを使う方が、上から順に読めば報告書を1枚作れるように書いています。'),
  p('1つの章に1つの操作だけを書いています。困ったときは最後の「こんなときは」をご覧ください。'),
  h2('作業の流れ（4ステップ）'),
  table(
    ['順番', 'やること', '目安'],
    [
      ['1', 'レンタル単位数報告書を取り込む', '10秒'],
      ['2', '利用者名などを確認する', '30秒'],
      ['3', '写真を付ける', '1分'],
      ['4', '印刷する・PDFにする', '30秒'],
    ],
    [1000, 5800, 2200],
  ),
  p(''),
  note('大切なこと', [
    'データはお使いのパソコンの中に保存されます。ほかのパソコンからは見えません。',
    'パソコンを替えるときは「11. 別のパソコンにデータを移す」の手順で移してください。',
  ]),
  pageBreak(),
);

// ---- 1. はじめに ----
children.push(
  h1('1. はじめに（アプリの開き方）'),
  p('このアプリはインターネットの画面上で動きます。インストールは不要です。'),
  h2('開き方'),
  step([t('パソコンで '), b('Google Chrome'), t(' または '), b('Microsoft Edge'), t(' を開きます。')]),
  step([t('画面上の住所欄に、次のURLを入力します。')]),
  new Paragraph({
    spacing: { before: 80, after: 120 }, alignment: AlignmentType.CENTER,
    children: [t(URL, { bold: true, size: 22, color: '1D4ED8' })],
  }),
  step([t('次回から探さなくてよいように、'), b('お気に入り'), t('（ブックマーク）に登録してください。')]),
  p('下の画面が出れば成功です。'),
  img('01_list'),
  trouble([
    '画面が真っ白なときは、キーボードの Ctrl キーを押しながら F5 を押して読み込み直してください。',
    'Internet Explorer では動きません。Chrome か Edge をお使いください。',
  ]),
  pageBreak(),
);

// ---- 2. 最初の設定 ----
children.push(
  h1('2. 最初の設定（営業所と担当者）'),
  p('はじめて使うときだけ、自分の営業所と名前を入れます。次回からは自動で入ります。'),
  step([b('新しい報告書を作成'), t(' を押します。')]),
  step([t('画面の中ほどにある '), b('営業所'), t(' から自分の営業所を選びます。')]),
  step([t('その下の '), b('担当者（自社）'), t(' に自分の名前を入れます。')]),
  img('05_step2'),
  p('選んだ営業所は、選んだ時点でこのパソコンが覚えます。保存を押す必要はありません。'),
  p('次に新しい報告書を作るときは、最初から入った状態で始まります。'),
  trouble([
    '別の営業所の名前が入っているときは、選び直せばそのまま覚え直します。',
    '担当者名は案件ごとに書き換えても構いません。書き換えた名前を次から覚えます。',
  ]),
  pageBreak(),
);

// ---- 3. STEP1 取り込む ----
children.push(
  h1('3. レンタル単位数報告書を取り込む'),
  p('いちばん最初にこの操作をすると、商品名・TAISコード・単位数に加えて、利用者名・居宅・ケアマネジャー名・担当者名まで自動で入ります。'),
  step([t('紫色の '), b('STEP 1 レンタル単位数報告書を取り込む'), t(' を押します。')]),
  img('02_step1', 470),
  step([t('パソコンの中から単位数報告書のファイルを選びます。')]),
  p('PDF のほか、Excel（.xlsx）や CSV も取り込めます。'),
  step([t('読み取った商品の一覧が出ます。'), b('納品'), t(' の行にだけ、あらかじめチェックが付いています。')]),
  img('03_cands', 415),
  step([t('報告書に載せたい行にチェックを付けます。')]),
  step([b('選択した商品を明細へ反映'), t(' を押します。')]),
  trouble([
    '「テキストを抽出できませんでした」と出るときは、紙をスキャンしたPDF（画像として保存されたPDF）です。お手数ですが手で入力してください。',
    '「保険外」と書かれた商品は、単位数の一覧には取り込まれません（仕様です）。',
  ]),
  pageBreak(),
);

// ---- 4. 取り込んだ明細を直す ----
children.push(
  h1('4. 取り込んだ明細を直す'),
  p('取り込んだ内容は、あとから自由に直せます。報告書に載せたくない行（特価ベッドなど）もここで消せます。'),
  step([b('取り込んだ明細を編集する'), t(' を押して開きます。')]),
  img('04_importedit'),
  step([t('直したいところをそのまま書き換えます。商品名・区分・TAIS・種目・料金区分・単位数のすべてが直せます。')]),
  step([t('いらない行は、右端のごみ箱の絵を押すとすぐに消えます。')]),
  p('いちばん下の「合計」は、直すとその場で計算し直します。'),
  p('ここで直した内容は、報告書の2枚目「レンタル単位数一覧」にそのまま出ます。'),
  trouble([
    '単位数は数字だけを入れてください。',
    '消しすぎたときは、もう一度 STEP 1 から取り込み直してください。',
  ]),
  pageBreak(),
);

// ---- 5. 写真を付ける ----
children.push(
  h1('5. 写真を付ける'),
  p('写真は明細1つにつき1枚付けられます。付け方は3通りあります。どれでも構いません。'),
  h2('方法1: ファイルから選ぶ'),
  step([t('明細の左にある '), b('写真を添付'), t(' を押します。')]),
  step([t('パソコンの中から写真を選びます。')]),
  h2('方法2: ドラッグして落とす'),
  step([t('写真のファイルを、画面の上まで指で運んで離します。')]),
  h2('方法3: 切り取った画面を貼り付ける'),
  step([t('キーボードの '), b('Windows'), t(' ＋ '), b('Shift'), t(' ＋ '), b('S'), t(' を押して、画面の必要な部分を切り取ります。')]),
  step([t('貼り付けたい明細の '), b('貼り付け'), t(' を押します。')]),
  img('06_card'),
  p('写真はアプリが自動で軽くします。枚数が多くても重くなりません。'),
  p('納品箇所（玄関・浴室など）は入れなくても構いません。選んだときだけ報告書に出ます。'),
  trouble([
    '「貼り付け」を押したときに画面の上に許可を聞く表示が出たら「許可」を選んでください。',
    '写真がすでにある明細では、ボタンの文字が「貼替え」に変わります。押すと差し替わります。',
  ]),
  pageBreak(),
);

// ---- 6. 明細を足す ----
children.push(
  h1('6. 明細を足す（マスタ・特定福祉用具）'),
  p('単位数報告書に載らない商品は、次の2つのボタンから足します。'),
  img('07_options'),
  h2('過去に使った商品から足す'),
  step([b('マスタから選ぶ'), t(' を押します。')]),
  step([t('種目ごとに並んだ商品名にチェックを付けます。')]),
  step([b('選択した商品を報告書へ追加'), t(' を押します。')]),
  img('12_master'),
  p('商品名は、報告書を保存するたびに自動で覚えていきます。使うほど楽になります。'),
  h2('特定福祉用具（入浴補助用具など）を足す'),
  step([b('特定福祉用具'), t(' を押します。')]),
  step([t('品目の欄で、右の下向き記号を押して一覧から選びます。手で入力もできます。')]),
  p('入浴補助用具はシャワーチェア・浴槽手すり・浴槽台・バスボード・シャワーキャリーから、腰掛便座はポータブルトイレ・補高便座から選べます。'),
  p('特定福祉用具は単位数ではなく「価格（円）」で入れてください。'),
  trouble([
    '品目を選び直したいときは、右の下向き記号を押すと全部の品目が出ます。',
    '一覧にない品目は、そのまま文字で入力できます。',
  ]),
  pageBreak(),
);

// ---- 7. 報告事項 ----
children.push(
  h1('7. 報告事項を書く（任意）'),
  p('報告事項は、書かなくても報告書は作れます。書きたいときだけチェックを付けます。'),
  step([b('報告事項を記載する'), t(' にチェックを付けます。')]),
  step([t('文章を入力します。')]),
  step([t('下に出るサンプル文を押すと、その文がそのまま入ります。')]),
  img('08_remarks', 400),
  p('サンプル文は「納品」「モニタリング」「入替・変更」「相談・デモ」「共通・結び」に分かれています。'),
  trouble([
    'チェックを外すと、報告書に報告事項の欄そのものが出なくなります。',
  ]),
  pageBreak(),
);

// ---- 8. 印刷・PDF ----
children.push(
  h1('8. 印刷する・PDFにする'),
  step([t('画面のいちばん下の '), b('印刷プレビュー'), t(' を押します。')]),
  step([t('できあがりが表示されます。左側の3つのボタンで操作します。')]),
  img('11_printbtns', 200),
  table(
    ['ボタン', 'すること'],
    [
      ['印刷', 'プリンターで印刷します'],
      ['PDF保存', 'PDFファイルにして保存します'],
      ['閉じる', '編集の画面に戻ります'],
    ],
    [2200, 6800],
  ),
  p(''),
  note('印刷するときのお願い', [
    '印刷の設定画面で、用紙は A4、余白は「なし」を選んでください。余白ありのままだと端が欠けることがあります。',
  ]),
  pageBreak(),
  h2('1枚目（報告書）'),
  img('09_page1', 430),
  pageBreak(),
  h2('2枚目（レンタル単位数一覧）'),
  p('取り込んだ明細がすべて一覧で出ます。今回納品した商品には色が付きます。いちばん下の行が合計単位数です。'),
  img('10_page2', 430),
  trouble([
    '2枚目を出したくないときは、「帳票に載せるもの」の「取込データの一覧表を付ける」のチェックを外します。',
    '色を付けたくないときは、その下の「一覧表で納品分に色を付ける」のチェックを外します。',
  ]),
  pageBreak(),
);

// ---- 9. 保存 ----
children.push(
  h1('9. 保存する・あとで開く'),
  step([t('画面のいちばん下の '), b('保存'), t(' を押します。')]),
  step([t('左上の矢印を押すと、報告書の一覧に戻ります。')]),
  step([t('一覧から報告書名を押すと、続きから編集できます。')]),
  img('13_saved_list'),
  trouble([
    '保存した報告書が見当たらないときは、別のパソコンや別の画面（ChromeとEdgeなど）で作っていないか確認してください。',
  ]),
  pageBreak(),
);

// ---- 10. データを移す ----
children.push(
  h1('10. 別のパソコンにデータを移す'),
  p('データはパソコンごとに保存されます。パソコンを替えるときは、次の手順で移してください。'),
  h2('元のパソコンで書き出す'),
  step([t('報告書の一覧の下にある '), b('全データをエクスポート'), t(' を押します。')]),
  step([t('ファイルが1つ保存されます。これを新しいパソコンに渡します（USBメモリや社内メールなど）。')]),
  h2('新しいパソコンで取り込む'),
  step([t('同じ画面の '), b('インポート'), t(' を押します。')]),
  step([t('先ほどのファイルを選びます。')]),
  note('定期的に書き出してください', [
    'ブラウザの履歴の削除（クッキーやサイトデータの削除）を行うと、保存した報告書が消えることがあります。',
    '大事な報告書は、月に1回など決めて「全データをエクスポート」で控えを取ってください。',
  ]),
  pageBreak(),
);

// ---- 11. Q&A ----
children.push(
  h1('11. こんなときは'),
  table(
    ['こんなとき', 'こうしてください'],
    [
      ['画面が古いまま変わらない', 'Ctrl キーを押しながら F5 を押して読み込み直します。'],
      ['保存した報告書がない', '別のパソコン、別のブラウザで作っていないか確認します。'],
      ['利用者名などが自動で入らない', '手で入力できます。すでに入っている欄は取込で上書きされません。'],
      ['ケアマネ名が違う人になる', '担当ケアマネジャーの欄を手で直してください。'],
      ['単位数報告書が読み取れない', '画像として保存されたPDFの可能性があります。手で入力してください。'],
      ['印刷で端が欠ける', '印刷設定で用紙A4・余白「なし」を選びます。'],
      ['写真の向きがおかしい', '写真アプリで回転して保存し直してから付け直します。'],
      ['品目を選び直せない', '品目欄の右の下向き記号を押すと、全部の品目が出ます。'],
      ['特価ベッドを一覧から消したい', '「取り込んだ明細を編集する」を開き、その行のごみ箱を押します。'],
    ],
    [3200, 5800],
  ),
  pageBreak(),
);

// ---- 12. 問い合わせ ----
children.push(
  h1('12. お問い合わせ'),
  p('操作で分からないことや、「こうしてほしい」というご要望は、下記までご連絡ください。'),
  p(''),
  table(
    ['項目', '内容'],
    [
      ['アプリの住所（URL）', URL],
      ['担当', '（　　　　　　　　　　）'],
      ['連絡先', '（　　　　　　　　　　）'],
      ['版数', VERSION],
    ],
    [2600, 6400],
  ),
  p(''),
  note('この冊子について', [
    'アプリの機能追加のたびに版数を上げて、全ページを配り直します。',
    '古い版と混ざらないよう、新しい版が届いたら古い冊子は処分してください。',
  ]),
);

// ================= 出力 =================
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
  },
  numbering: {
    config: [
      // 見出しの数だけ独立した採番定義を用意（各セクションで 1. から始まる）
      ...Array.from({ length: stepInstance + 1 }, (_, i) => ({
        reference: 'steps' + i,
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 420, hanging: 420 } }, run: { bold: true, font: FONT } },
        }],
      })),
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 460, hanging: 260 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertMillimetersToTwip(18), bottom: convertMillimetersToTwip(18),
          left: convertMillimetersToTwip(18), right: convertMillimetersToTwip(18),
        },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log('created:', OUT, Math.round(buf.length / 1024) + 'KB');
});
