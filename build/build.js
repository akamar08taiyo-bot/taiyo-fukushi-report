// JSX を事前コンパイル＋全依存をバンドルして単一HTMLに同梱するビルドスクリプト
// 入力: ../index.html (text/babel ブロックを含む)
// 出力: ./index.html (text/babel → type=module + 依存込み圧縮JS)
// 目的: 外部CDN(esm.sh/unpkg/gstatic)に依存せず、GitHub Pagesに繋がれば必ず起動する。
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

const SRC = process.argv[2] || path.join(__dirname, '..', 'src', 'index.html');
const DST = process.argv[3] || path.join(__dirname, '..', 'index.html');

(async () => {
  const html = fs.readFileSync(SRC, 'utf8');

  // --- Tailwind CSS をソースから静的生成（cdn.tailwindcss.com 依存を排除） ---
  console.log('Tailwind CSS 生成中…');
  execSync('npx tailwindcss -c tailwind.config.js -i tailwind.input.css -o tailwind.output.css --minify', { cwd: __dirname, stdio: 'pipe' });
  const tailwindCss = fs.readFileSync(path.join(__dirname, 'tailwind.output.css'), 'utf8');
  console.log(`Tailwind CSS size: ${tailwindCss.length} bytes (minified)`);
  const re = /(<script type="text\/babel"[^>]*>)([\s\S]*?)(<\/script>)/;
  const m = html.match(re);
  if (!m) { console.error('text/babel script not found'); process.exit(1); }
  const jsx = m[2];
  console.log(`JSX size: ${jsx.length} bytes`);

  // esbuild で JSX をバンドル（react/react-dom/firebase/lucide-react を node_modules から解決し全て同梱）
  const result = await esbuild.build({
    stdin: {
      contents: jsx,
      resolveDir: __dirname,   // node_modules はこのディレクトリにある
      loader: 'jsx',
      sourcefile: 'app.jsx',
    },
    bundle: true,
    format: 'esm',
    // @anthropic-ai/sdk が Node 実行時用に動的 import する組み込みモジュール。
    // ブラウザでは APIキー明示指定のため呼ばれないコードパスなので external で残す。
    external: ['node:fs', 'node:path', 'node:os', 'node:crypto', 'node:child_process', 'node:util', 'node:stream', 'node:process', 'node:url'],
    // 古めのブラウザ(?. や ?? 未対応のEdge/Safari等)でも構文エラーで落ちないよう
    // es2017 まで下げてビルドする（?. ?? オブジェクトスプレッド等を互換コードに変換）。
    target: 'es2017',
    jsx: 'transform',
    minify: true,
    legalComments: 'none',
    write: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  });
  const code = result.outputFiles[0].text;
  console.log(`Bundled size: ${code.length} bytes (minified, 依存込み)`);

  // 重要: 置換文字列内の `$&` などが特殊解釈されないよう関数形式を使用
  let out = html.replace(m[0], () => `<script type="module">${code}</script>`);

  // --- 外部CDN依存を除去（同梱したので不要 / 社内NW遮断でも起動するように） ---
  // Babel-standalone
  out = out.replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"><\/script>\s*\n?/g, '');
  // es-module-shims（importmap polyfill）
  out = out.replace(/<script async src="https:\/\/ga\.jspm\.io\/npm:es-module-shims[^"]*"><\/script>\s*\n?/g, '');
  // importmap ブロック
  out = out.replace(/<script type="importmap">[\s\S]*?<\/script>\s*\n?/g, '');
  // esm.sh / unpkg / jspm / tailwind 等への preconnect / dns-prefetch を全除去
  out = out.replace(/<link rel="(?:preconnect|dns-prefetch)" href="https:\/\/(?:esm\.sh|unpkg\.com|www\.googleapis\.com|ga\.jspm\.io|cdn\.tailwindcss\.com)"[^>]*>\s*\n?/g, '');
  // 不要になったコメント
  out = out.replace(/<!-- リソースのプリコネクト[^>]*-->\s*\n?/g, '');
  out = out.replace(/<!-- importmap polyfill[^>]*-->\s*\n?/g, '');
  out = out.replace(/<!-- 必要 CDN[^>]*-->\s*\n?/g, '');

  // --- Tailwind: cdn.tailwindcss.com の <script> を、生成した静的CSSの <style> に置換 ---
  const twTag = '<script src="https://cdn.tailwindcss.com"></script>';
  if (out.includes(twTag)) {
    out = out.replace(twTag, () => `<style id="tailwind">${tailwindCss}</style>`);
  } else {
    console.warn('⚠ 警告: tailwind CDN タグが見つかりませんでした');
  }

  // ローディングテキスト
  out = out.replace(/初回は10〜20秒、2回目以降は数秒です/, '読み込んでいます…（数秒）');

  // 同梱できているかの簡易検証：バンドル後JSに 'esm.sh' 等のCDN参照が残っていないこと
  if (/esm\.sh|unpkg\.com|ga\.jspm\.io/.test(code)) {
    console.warn('⚠ 警告: バンドル後JSにCDN参照が残っています');
  }
  if (/type="importmap"|es-module-shims/.test(out)) {
    console.warn('⚠ 警告: HTMLにimportmap/polyfillが残っています');
  }
  if (/cdn\.tailwindcss\.com/.test(out)) {
    console.warn('⚠ 警告: HTMLにtailwind CDN参照が残っています');
  }

  // --- pdf.js 用 CMap（日本語PDFのテキスト抽出に必須）を base64 で同梱 ---
  const cmapDir = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'cmaps');
  const cmapObj = {};
  for (const f of fs.readdirSync(cmapDir)) {
    if (!f.endsWith('.bcmap')) continue;
    cmapObj[f.replace(/\.bcmap$/, '')] = fs.readFileSync(path.join(cmapDir, f)).toString('base64');
  }
  const cmapScript = `<script>window.__PDF_CMAPS=${JSON.stringify(cmapObj)}</script>`;
  console.log(`CMap 同梱: ${Object.keys(cmapObj).length} files (${cmapScript.length} bytes)`);
  out = out.replace('</head>', () => cmapScript + '\n</head>');

  fs.writeFileSync(DST, out);
  console.log(`Built: ${DST} (${out.length} bytes)`);
})().catch(e => { console.error(e); process.exit(1); });
