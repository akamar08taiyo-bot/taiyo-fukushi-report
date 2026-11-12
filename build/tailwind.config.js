/** @type {import('tailwindcss').Config} */
// 太陽見積アプリ用：ソース ../index.html を走査して使用クラスのみを静的生成し、
// cdn.tailwindcss.com（外部CDN）依存をなくす。
module.exports = {
  // 特定福祉用具のカタログの部品（申請書アプリの写し）と、つなぎの catalogBridge.tsx のクラスも作る
  content: ['../src/index.html', '../src/catalogBridge.tsx', '../src/tokutei-catalog/**/*.{ts,tsx}'],
  theme: { extend: {} },
  // 動的生成はソースに無いが、念のため主要な色トーンを安全リスト化（万一の取りこぼし防止）
  safelist: [],
  corePlugins: { preflight: true },
};
