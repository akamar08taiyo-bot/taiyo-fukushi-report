// 【福祉用具相談報告書アプリ用の差し替え】申請書アプリ（特定福祉用具）の src/tokutei/import/pdfText.ts の代わり。
// 元のファイルは Vite 専用の import.meta.glob で CMap を同梱し、pdf.js v6 を使う。このアプリは esbuild でまとめ、
// pdf.js v4（単位数報告書の取込で使っているもの）と window.__PDF_CMAPS の CMap をすでに同梱しているので、それを使う。
// カタログで使うのは openPdf だけ（print/catalogPdf.ts。text.json・絵が読めないときの予備）。
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/** pdf.js が CMap を取りに来たときに、同梱したもの（window.__PDF_CMAPS）を渡す（本体の InlineCMapReaderFactory と同じ） */
class InlineCMapReaderFactory {
  async fetch({name}: {name: string}) {
    const b64 = ((window as unknown as {__PDF_CMAPS?: Record<string, string>}).__PDF_CMAPS || {})[name];
    if (!b64) throw new Error('CMap not bundled: ' + name);
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return {cMapData: arr, isCompressed: true};
  }
}

/** PDF を開く（元の openPdf と同じく、pdf.js の読み込みの仕事＝promise と destroy を返す） */
export async function openPdf(data: Uint8Array) {
  return pdfjsLib.getDocument({
    data,
    CMapReaderFactory: InlineCMapReaderFactory as never,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
}
