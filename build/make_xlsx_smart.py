# 実物SMART様式（1明細=2行・列固定）を模した検証用xlsxを生成
import zipfile, html

# セル: (row0start, col0start, value)  列: B=1 E=4 J=9 O=14 Q=16 R=17 U=20  月/単位数は後方の列に置く
cells = []
def put(r, c, v): cells.append((r, c, v))

# 宛名・メタ（0始まり行）
put(0, 4, '2026年7月17日')
put(1, 1, '苅田町地域包括支援センターおばせ')   # B2 = 居宅
put(2, 1, '長谷川　晴美　様')                    # B3 = ケアマネ
put(4, 1, 'ご利用者名'); put(4, 3, '釘宮　恒雄様')
put(4, 9, '担当：'); put(4, 11, '久保　匠史')

# ヘッダー行(hr=6): サービス名(E=4) TAISコード(J=9) 7月(22) 8月(26)
HR = 6
put(HR, 4, 'サービス名'); put(HR, 9, 'TAISコード')
put(HR, 22, '7月'); put(HR, 26, '8月')
# サブヘッダー(hr+1): 単位数(22,26) と 区分/料金など
put(HR + 1, 14, '区分'); put(HR + 1, 17, '料金区分')
put(HR + 1, 21, '日数'); put(HR + 1, 22, '単位数')
put(HR + 1, 25, '日数'); put(HR + 1, 26, '単位数')

# 明細（2行=1件）: 種目行(r) と 商品行(r+1)
items = [
    # service, tais, kubun, qty, rate, price, m1(7月), m2(8月), 商品名
    ('予防手すり貸与', '01265-000055', '納品', '1', '半月', '2,260', '113', '226', 'たよレールＮ　２型'),
    ('予防歩行器貸与', '00170-002047', '納品', '1', '半月', '4,000', '200', '400', '歩行車 WALK-ALL(ｳｫﾙｵﾙ)'),
    ('予防手すり貸与', '01265-000248', '解約済', '1', '半月', '4,200', '210', '', 'たよレールＳＯＴＯＥ　片手すり　標準型'),
    ('予防手すり貸与', '01265-000260', '解約済', '1', '半月', '5,200', '260', '', 'SOTOE片手すりｽﾘﾑ+わたﾚｰﾙEK(900-1200)'),
    ('予防手すり貸与', '01265-000083', '継続', '1', '月額', '3,580', '358', '358', 'たよレールｄａｎロータイプ片手すり踏台無'),
]
r = HR + 2
for (service, tais, kubun, qty, rate, price, m1, m2, name) in items:
    put(r, 4, service); put(r, 9, tais); put(r, 14, kubun); put(r, 16, qty)
    put(r, 17, rate); put(r, 20, price)
    if m1: put(r, 22, m1)
    if m2: put(r, 26, m2)
    put(r + 1, 1, name)
    r += 2
put(r, 4, '合計'); put(r, 22, '1,401'); put(r, 26, '984')


def colref(i):
    s = ''; i += 1
    while i > 0:
        i, rem = divmod(i - 1, 26); s = chr(65 + rem) + s
    return s

# 共有文字列
sst = []; idx = {}
for (_, _, v) in cells:
    v = str(v)
    if v and v not in idx:
        idx[v] = len(sst); sst.append(v)

rows = {}
for (r, c, v) in cells:
    rows.setdefault(r, []).append((c, str(v)))

sheet = ['<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
for r in sorted(rows):
    sheet.append('<row r="%d">' % (r + 1))
    for (c, v) in sorted(rows[r]):
        sheet.append('<c r="%s%d" t="s"><v>%d</v></c>' % (colref(c), r + 1, idx[v]))
    sheet.append('</row>')
sheet.append('</sheetData></worksheet>')

sstxml = '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">' % (len(sst), len(sst))
for s in sst:
    sstxml += '<si><t xml:space="preserve">%s</t></si>' % html.escape(s)
sstxml += '</sst>'

ct = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'
rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
wb = '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
wbrels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'

out = r'C:\Users\akama\taiyo-fukushi-report\_smart.xlsx'
z = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
z.writestr('[Content_Types].xml', ct)
z.writestr('_rels/.rels', rels)
z.writestr('xl/workbook.xml', wb)
z.writestr('xl/_rels/workbook.xml.rels', wbrels)
z.writestr('xl/sharedStrings.xml', sstxml)
z.writestr('xl/worksheets/sheet1.xml', ''.join(sheet))
z.close()
print('created', out)
