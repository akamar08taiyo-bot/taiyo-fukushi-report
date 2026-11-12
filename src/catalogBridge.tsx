// 特定福祉用具のカタログ（介援隊）から商品を選ぶ窓。
// ユーザーの指示「商品マスタでは、申請書レポジトリにある、特定福祉用具の商品カタログやカタログから商品をもってくる機能を
// そのまま利用できるようにしてください」（2026-11-12）。
//
// 申請書アプリ（akamar08taiyo-bot/- のブランチ claude/care-insurance-auto-transfer-3z0c9n。太陽ポータルの tokutei/）の
// 部品を src/tokutei-catalog/ にそのまま写して使う（写し方・変えた所は src/tokutei-catalog/SOURCE.md）：
//   種目（CategorySelect）→ 品目・メーカー → 📖 カタログから商品検索（CatalogPicker）・🔢 型番から検索（CodeLookup）→ 商品名、
//   カタログの窓（CatalogViewer。ページの商品を押すと入る）。商品の読み方（catalogItems.ts）・販売価格の出し方（calc.ts）も同じもの。
// カタログの中身（ページの絵・文字 text.json・罫線 rules.json）は太陽ポータルの tokutei/catalog/ を読む（このアプリには入れない。
// 定価はリポジトリに持たない＝申請書アプリと同じ決まり）。
// 選んだ商品は、報告書の特定福祉用具の明細（商品名・メーカー・TAIS・品目・価格）か、商品マスタに入る。

import {useEffect, useMemo, useState} from 'react';
import {CATALOG} from './tokutei-catalog/catalog.ts';
import type {CatalogPagesFilter} from './tokutei-catalog/catalog.ts';
import {catalogItemPatch} from './tokutei-catalog/catalogItems.ts';
import type {CatalogProduct, CatalogVariant} from './tokutei-catalog/catalogItems.ts';
import {CATEGORIES, guessCategory, subShort} from './tokutei-catalog/category.ts';
import {categoryTaxPatch, taxIncluded, unitPriceOf} from './tokutei-catalog/calc.ts';
import {CatalogOpenFor, CatalogPicker} from './tokutei-catalog/components/CatalogPicker.tsx';
import {CategorySelect} from './tokutei-catalog/components/CategorySelect.tsx';
import {CodeLookup} from './tokutei-catalog/components/CodeLookup.tsx';
import {TextInput} from './tokutei-catalog/components/ui.tsx';
import {CatalogViewer} from './tokutei-catalog/print/CatalogViewer.tsx';
import type {Sale, SaleItem} from './tokutei-catalog/types.ts';

// ---- カタログの置き場所（太陽ポータルの特定福祉用具のアプリ） ----
const PORTAL_ORIGIN = 'https://akamar08taiyo-bot.github.io';
/** 確かめるとき（ローカルのサーバー）は localStorage の taiyo_fukushi_catalog_base で置き場所を変えられる */
export function tokuteiBase(): string {
  try {
    const o = localStorage.getItem('taiyo_fukushi_catalog_base');
    if (o) return new URL(o, location.href).href;
  } catch {
    /* localStorage を使えなくても既定の置き場所 */
  }
  // 同じサイトなら同じサイトの中の道（ポータルと同じ版を見る）、ほか（ファイルで開いたときなど）はポータルの URL
  return location.origin === PORTAL_ORIGIN ? new URL('/taiyo-portal/tokutei/', location.href).href : `${PORTAL_ORIGIN}/taiyo-portal/tokutei/`;
}

/**
 * カタログを読む前に、置き場所と版（tokutei/version.json の build）を決める。
 * 版は text.json・ページの絵を取りに行くときの ?v= に付く（ポータルのカタログが新しくなったら読み直す。申請書アプリと同じ）
 */
let prepared: Promise<void> | null = null;
function prepareCatalog(): Promise<void> {
  const g = globalThis as unknown as {__TOKUTEI_BASE__?: string; __TOKUTEI_BUILD__?: string};
  g.__TOKUTEI_BASE__ = tokuteiBase();
  if (!prepared) {
    prepared = fetch(new URL('version.json', g.__TOKUTEI_BASE__).href, {cache: 'no-cache'})
      .then((r) => (r.ok ? r.json() : null))
      .then((j: {build?: unknown} | null) => {
        if (j && typeof j.build === 'string') g.__TOKUTEI_BUILD__ = j.build;
      })
      .catch(() => {
        /* 版が分からなくても読める（?v= が空になるだけ） */
      });
  }
  return prepared;
}

// ---- 報告書の品目（このアプリ）⇔ 申請書アプリの種目・細目 ----
/** このアプリの品目 → 申請書アプリの種目・細目（窓を開いたときに初めから選んでおく） */
const FROM_ITEM: Record<string, [string, string]> = {
  シャワーチェア: ['入浴補助用具', '入浴用いす'],
  シャワーキャリー: ['入浴補助用具', '入浴用いす'],
  浴槽手すり: ['入浴補助用具', '浴槽用手すり'],
  浴槽台: ['入浴補助用具', '浴槽内いす'],
  バスボード: ['入浴補助用具', '入浴台'],
  入浴用介助ベルト: ['入浴補助用具', '入浴用介助ベルト'],
  ポータブルトイレ: ['腰掛便座', '移動できる便器（ポータブルトイレ）'],
  補高便座: ['腰掛便座', '洋式便器の高さを補うもの'],
  据置式便座: ['腰掛便座', '和式便器を腰掛式にするもの'],
  昇降便座: ['腰掛便座', '立ち上がりを補助するもの'],
  多点杖: ['歩行補助つえ', '多点杖'],
  歩行器: ['歩行器', ''],
  固定用スロープ: ['固定用スロープ', ''],
  簡易浴槽: ['簡易浴槽', ''],
  移動用リフトのつり具の部分: ['移動用リフトのつり具の部分', ''],
  自動排泄処理装置の交換可能部品: ['自動排泄処理装置の交換可能部品', ''],
  排泄予測支援機器: ['排泄予測支援機器', ''],
};

/** 申請書アプリの種目・細目（と商品名）→ このアプリの品目（シャワーチェア・ポータブルトイレ・多点杖 など） */
export function reportItemOf(category: string, sub: string, name: string): string {
  const short = subShort(sub, category);
  // このアプリにはシャワーキャリーの品目がある（申請書アプリでは入浴用いす＝シャワーチェアの中）
  if (short === 'シャワーチェア' && /キャリー|シャワー用車いす/.test(name)) return 'シャワーキャリー';
  return short || '';
}

const blankItem = (): SaleItem => ({
  id: 'catalog-pick',
  productId: null,
  name: '',
  maker: '',
  code: '',
  tais: '',
  category: '',
  sub: '',
  unit: '台',
  supplier: '',
  taxType: '10%',
  listPrice: 0,
  cost: 0,
  qty: 1,
  discountRate: 20,
  unitPrice: null,
  reason: '',
});

/** 窓から返す商品（このアプリの明細・商品マスタに入れる形） */
export type CatalogResult = {
  productName: string;
  maker: string;
  code: string; // 品番
  tais: string;
  item: string; // このアプリの品目
  listPrice: number; // 定価（税抜）
  price: number; // 販売価格（税抜）
  priceTaxIn: number; // 販売価格（税込。非課税はそのまま）
  taxFree: boolean;
  units: number; // 帳票の「価格」に入れる値（税込／税抜は選んだほう）
};

const yen = (n: number) => `${Math.max(0, Math.round(n)).toLocaleString('ja-JP')}円`;

export function TokuteiCatalogDialog({
  initial,
  mode,
  discountRate,
  priceTax,
  makerChoices,
  onSettings,
  onApply,
  onManual,
  onClose,
}: {
  /** 窓を開いた明細（品目・商品名・メーカー・TAIS）。新しく足すときは空 */
  initial?: {item?: string; productName?: string; maker?: string; tais?: string};
  /** report：報告書の明細に入れる、master：商品マスタに入れる */
  mode: 'report' | 'master';
  discountRate: number;
  priceTax: '税込' | '税抜';
  makerChoices: string[];
  onSettings: (patch: {discountRate?: number; priceTax?: '税込' | '税抜'}) => void;
  onApply: (r: CatalogResult, opts: {alsoMaster: boolean}) => void;
  /** 「カタログを使わずに入れる」（報告書に空の特定福祉用具の明細を足す） */
  onManual?: () => void;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    // 版を聞くのに時間がかかっても待ちすぎない（3秒で読み始める）
    const t = setTimeout(() => alive && setReady(true), 3000);
    void prepareCatalog().then(() => alive && setReady(true));
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const [item, setItem] = useState<SaleItem>(() => {
    const b = blankItem();
    const from = initial?.item ? FROM_ITEM[initial.item] : undefined;
    const guess = !from && initial?.productName ? guessCategory(initial.productName) : null;
    const category = from?.[0] ?? guess?.category ?? '';
    return {
      ...b,
      category,
      sub: from?.[1] ?? guess?.sub ?? '',
      name: initial?.productName ?? '',
      maker: initial?.maker ?? '',
      tais: initial?.tais ?? '',
      discountRate,
      ...categoryTaxPatch(b, category),
    };
  });
  const change = (patch: Partial<SaleItem>) => setItem((i) => ({...i, ...patch}));
  // 割引率は設定のもの（窓の中で変えると、次からもその割引率）
  useEffect(() => {
    setItem((i) => (i.discountRate === discountRate ? i : {...i, discountRate}));
  }, [discountRate]);

  // カタログの窓（申請書アプリの SaleEditor と同じ持ち方）
  const [view, setView] = useState<{query: string; filter?: CatalogPagesFilter; target?: string} | null>(null);
  const sale = useMemo(() => ({items: [item]}) as unknown as Sale, [item]);
  const pickFromCatalog = (p: CatalogProduct, v: CatalogVariant) => {
    change(catalogItemPatch(p, v, item, discountRate));
    setView(null);
  };

  const [alsoMaster, setAlsoMaster] = useState(true);
  const fromCatalog = !!item.code && item.listPrice > 0;
  const {price} = unitPriceOf(item, {markupRate: 0});
  const taxFree = item.taxType === '非課税';
  const priceTaxIn = taxIncluded(price, item.taxType);
  const reportItem = reportItemOf(item.category, item.sub, item.name);
  const result: CatalogResult = {
    productName: item.name.trim(),
    maker: item.maker.trim(),
    code: item.code.trim(),
    tais: item.tais.trim(),
    item: reportItem,
    listPrice: item.listPrice,
    price,
    priceTaxIn,
    taxFree,
    units: priceTax === '税抜' ? price : priceTaxIn,
  };

  // 印刷（カタログの窓の「🖨 印刷」）：絞ったページの絵を新しいタブで出して印刷（このアプリにはカタログの印刷の画面がないため）
  const printPages = (only?: CatalogPagesFilter) => {
    const pages = only?.pages?.length ? CATALOG.filter((c) => only.pages.includes(c.page)) : CATALOG;
    const base = tokuteiBase();
    const w = window.open('', '_blank');
    if (!w) return;
    const d = w.document;
    d.title = '介援隊カタログ';
    const style = d.createElement('style');
    style.textContent = '@page{size:A4;margin:0}body{margin:0}img{display:block;width:210mm;height:297mm;object-fit:contain;page-break-after:always}';
    d.head.appendChild(style);
    const loads = pages.map((c) => {
      const img = d.createElement('img');
      img.alt = `p.${c.page}`;
      const done = new Promise<void>((r) => {
        img.onload = img.onerror = () => r();
      });
      img.src = new URL(`catalog/${c.file.replace(/\.pdf$/, '.jpg')}`, base).href;
      d.body.appendChild(img);
      return done;
    });
    void Promise.all(loads).then(() => w.print());
  };

  const canApply = !!result.productName;
  return (
    <CatalogOpenFor.Provider value={view?.target ?? null}>
      <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-start sm:items-center justify-center p-2 sm:p-3" role="dialog" aria-label="カタログから選ぶ">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
            <span aria-hidden="true">📖</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-800">特定福祉用具をカタログから選ぶ</h2>
              <p className="text-[11px] text-slate-500">申請書アプリと同じカタログ（介援隊）・同じ選び方です。{mode === 'master' ? '選んだ商品を商品マスタに登録します' : '選んだ商品を明細に入れます'}</p>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none" onClick={onClose} aria-label="閉じる">
              ✕
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-3 grid gap-2 content-start">
            {/* 申請書アプリの商品の欄（components/EstimateInputs.tsx の ItemBlock）と同じ並び：種目 → 品目・メーカー・カタログから商品検索・型番から検索 → 商品名と品番 */}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">種目</span>
              <CategorySelect category={item.category} sub={item.sub} onChange={(category, sub) => change({category, sub, ...categoryTaxPatch(item, category)})} className="w-44" />
              {!item.category && <span className="text-[11px] text-amber-700">種目を選ぶと、品目・メーカーとカタログの商品が出ます</span>}
            </div>
            {ready ? (
              <CodeLookup item={item} products={[]} settings={{discountRate}} onPick={change}>
                {(code) => (
                  <>
                    <CatalogPicker
                      item={item}
                      onPick={change}
                      onCatalog={(query, filter, target) => setView({query, filter, target})}
                      onPicked={() => setView(null)}
                      makerChoices={makerChoices}
                      discountRate={discountRate}
                      code={code.button}
                      codeNote={code.note}
                    />
                    <div className="flex min-w-0 items-center gap-2 sm:ml-8">
                      <TextInput value={item.name} onChange={(name) => change({name})} placeholder="商品名" className="min-w-0 flex-1 text-sm" aria-label="商品名" />
                      {code.input}
                    </div>
                  </>
                )}
              </CodeLookup>
            ) : (
              <p className="text-xs text-slate-500">📖 カタログを用意しています…</p>
            )}

            {/* 入れる内容の確かめ（商品名・メーカー・品番・TAIS・価格） */}
            {canApply && (
              <div className="mt-1 rounded-md border border-teal-200 bg-teal-50/60 p-2.5 text-xs text-slate-700 grid gap-1">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>
                    品目：<b>{reportItem || '（品目なし）'}</b>
                  </span>
                  {result.maker && <span>メーカー：{result.maker}</span>}
                  {result.code && <span>品番：{result.code}</span>}
                  <span>TAIS：{result.tais || '―'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {item.listPrice > 0 ? (
                    <>
                      <span>
                        定価 {yen(item.listPrice)}（{taxFree ? '非課税' : '税抜'}）
                      </span>
                      <label className="flex items-center gap-1">
                        割引率
                        <input
                          type="text"
                          inputMode="decimal"
                          className="h-7 w-14 rounded border border-slate-300 bg-white px-1 text-right text-sm"
                          value={String(discountRate)}
                          onChange={(e) => {
                            const n = Number(e.target.value.replace(/[^\d.]/g, ''));
                            if (Number.isFinite(n) && n >= 0 && n <= 100) onSettings({discountRate: n});
                          }}
                          aria-label="販売価格の割引率"
                        />
                        %
                      </label>
                      <span>
                        → 販売価格 <b>{yen(price)}</b>（{taxFree ? '非課税' : `税抜・税込 ${yen(priceTaxIn)}`}）
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-700">定価がカタログから読めない商品です（価格はあとで明細に手で入れてください）</span>
                  )}
                </div>
                {item.listPrice > 0 && !taxFree && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>帳票の「価格」に入れる値：</span>
                    {(['税込', '税抜'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="catalog-price-tax" className="accent-teal-600" checked={priceTax === t} onChange={() => onSettings({priceTax: t})} />
                        {t}（{yen(t === '税込' ? priceTaxIn : price)}）
                      </label>
                    ))}
                  </div>
                )}
                {!fromCatalog && <span className="text-slate-500">（カタログから選んでいない商品は、入れたあとに明細で価格・TAISを確かめてください）</span>}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
            {mode === 'report' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer w-full sm:w-auto">
                <input type="checkbox" className="w-4 h-4 accent-teal-600" checked={alsoMaster} onChange={(e) => setAlsoMaster(e.target.checked)} />
                商品マスタにも登録する
              </label>
            )}
            {onManual && (
              <button type="button" className="text-xs text-slate-500 underline px-1 py-2" onClick={onManual}>
                カタログを使わずに空の明細を追加
              </button>
            )}
            <div className="flex gap-2 ml-auto w-full sm:w-auto">
              <button type="button" className="inline-flex items-center justify-center bg-slate-600 hover:bg-slate-700 text-white px-3.5 py-2.5 rounded-md shadow-sm text-sm font-bold flex-1 sm:flex-none" onClick={onClose}>
                キャンセル
              </button>
              <button
                type="button"
                disabled={!canApply}
                className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2.5 rounded-md shadow-sm text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex-[2] sm:flex-none"
                onClick={() => onApply(result, {alsoMaster: mode === 'master' || alsoMaster})}
              >
                {mode === 'master' ? '＋ 商品マスタに登録' : '＋ この商品を明細に入れる'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* カタログの窓は、この窓（z-70）より上に出す（窓の中の z-40 は、この入れ物の中での重なり） */}
      {view && (
        <div className="relative z-[80]">
          <CatalogViewer sale={sale} query={view.query} filter={view.filter} onClose={() => setView(null)} onPrint={printPages} onPick={pickFromCatalog} pickTo="この商品" />
        </div>
      )}
    </CatalogOpenFor.Provider>
  );
}

/** 種目の一覧（このアプリの品目の候補を足すときに使う） */
export const TOKUTEI_CATEGORIES = CATEGORIES;
