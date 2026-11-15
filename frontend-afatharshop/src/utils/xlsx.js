/* Penulis XLSX ringan tanpa dependensi eksternal.
   ZIP disusun store-only (tanpa kompresi) + OOXML minimal, cukup untuk
   Excel/LibreOffice/Google Sheets membuka workbook multi-sheet dengan
   header berwarna, lebar kolom, freeze pane, format angka, dan baris total. */

const encoder = new TextEncoder();
const utf8 = (text) => encoder.encode(text);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const concatBytes = (chunks) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
};

/* ZIP store-only: header lokal + central directory + EOCD. */
const zipStore = (entries) => {
  const chunks = [];
  const central = [];
  let offset = 0;

  entries.forEach(({ name, data }) => {
    const nameBytes = utf8(name);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);

    const entry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    central.push(entry);

    offset += local.length + data.length;
  });

  const centralSize = central.reduce((sum, entry) => sum + entry.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return concatBytes([...chunks, ...central, end]);
};

const escXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const columnRef = (index) => {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    label = String.fromCharCode(65 + mod) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
};

const localDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return localDate(value);
  return String(value);
};

const cellNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;
  const text = String(value ?? '').trim();
  if (!text) return null;
  let normalized = text.replace(/[^\d,.-]/g, '');
  if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) normalized = normalized.replace(/\./g, '');
  normalized = normalized.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeSheetName = (name, index, used) => {
  const base = String(name || `Sheet${index + 1}`)
    .replace(/[[\]:*?/\\]/g, '-')
    .slice(0, 31)
    .trim() || `Sheet${index + 1}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base.slice(0, 28)} ${suffix}`;
    suffix += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4">
<numFmt numFmtId="164" formatCode="#,##0"/>
<numFmt numFmtId="165" formatCode="&quot;Rp&quot;#,##0"/>
<numFmt numFmtId="166" formatCode="0"/>
<numFmt numFmtId="167" formatCode="dd/mm/yyyy"/>
</numFmts>
<fonts count="3">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF6B1416"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF5F5F4"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD6D3D1"/></left><right style="thin"><color rgb="FFD6D3D1"/></right><top style="thin"><color rgb="FFD6D3D1"/></top><bottom style="thin"><color rgb="FFD6D3D1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="166" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const excelSerial = (value) => {
  if (value === null || value === undefined || value === '') return null;
  let year;
  let month;
  let day;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    year = value.getFullYear();
    month = value.getMonth();
    day = value.getDate();
  } else {
    const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]) - 1;
    day = Number(match[3]);
  }
  return Math.round((Date.UTC(year, month, day) - Date.UTC(1899, 11, 30)) / 86400000);
};

const sheetXml = (sheet) => {
  const headers = sheet.headers || [];
  const rows = sheet.rows || [];
  const numericCols = new Set(sheet.numericCols || []);
  const currencyCols = new Set(sheet.currencyCols || []);
  const integerCols = new Set(sheet.integerCols || []);
  const dateCols = new Set(sheet.dateCols || []);
  const sumCols =
    sheet.sum === true
      ? new Set([...numericCols].filter((index) => !dateCols.has(index)))
      : new Set(Array.isArray(sheet.sum) ? sheet.sum : []);
  const lastCol = columnRef(Math.max(0, headers.length - 1));
  const totalRow = sheet.sum
    ? headers.map((_, index) =>
        sumCols.has(index)
          ? rows.reduce((sum, row) => sum + (cellNumber(row[index]) || 0), 0)
          : index === 0
          ? 'TOTAL'
          : null
      )
    : null;

  const widths = headers.map((header, index) => {
    let longest = cellText(header).length;
    const sample = rows.slice(0, 300);
    sample.forEach((row) => {
      const length = cellText(row[index]).length;
      if (length > longest) longest = length;
    });
    return Math.min(42, Math.max(10, longest + 2));
  });

  const rowXml = (values, rowNumber, isHeader, isTotal) => {
    const cells = values.map((value, index) => {
      const ref = `${columnRef(index)}${rowNumber}`;
      if (isHeader) {
        return `<c r="${ref}" s="1" t="inlineStr"><is><t xml:space="preserve">${escXml(
          cellText(value)
        )}</t></is></c>`;
      }
      if (dateCols.has(index)) {
        const serial = excelSerial(value);
        return serial === null
          ? `<c r="${ref}" s="${isTotal ? 4 : 2}"/>`
          : `<c r="${ref}" s="8"><v>${serial}</v></c>`;
      }
      if (numericCols.has(index) || currencyCols.has(index) || integerCols.has(index)) {
        const number = cellNumber(value);
        let style;
        if (isTotal) style = currencyCols.has(index) ? 7 : integerCols.has(index) ? 10 : 5;
        else style = currencyCols.has(index) ? 6 : integerCols.has(index) ? 9 : 3;
        return number === null
          ? `<c r="${ref}" s="${style}"/>`
          : `<c r="${ref}" s="${style}"><v>${number}</v></c>`;
      }
      if (isTotal) {
        return `<c r="${ref}" s="4" t="inlineStr"><is><t xml:space="preserve">${escXml(
          cellText(value)
        )}</t></is></c>`;
      }
      const text = cellText(value);
      return text
        ? `<c r="${ref}" s="2" t="inlineStr"><is><t xml:space="preserve">${escXml(text)}</t></is></c>`
        : `<c r="${ref}" s="2"/>`;
    });
    return `<row r="${rowNumber}"${isHeader ? ' ht="26" customHeight="1"' : ''}>${cells.join('')}</row>`;
  };

  const body = [];
  body.push(rowXml(headers, 1, true, false));
  rows.forEach((row, index) => body.push(rowXml(row, index + 2, false, false)));
  if (totalRow) body.push(rowXml(totalRow, rows.length + 2, false, true));

  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');

  const filterRef = rows.length
    ? `A1:${lastCol}${rows.length + 1}`
    : `A1:${lastCol}1`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${body.join('')}</sheetData>
<autoFilter ref="${filterRef}"/>
</worksheet>`;
};

export const buildXlsx = (sheets = []) => {
  const used = new Set();
  const normalized = sheets.map((sheet, index) => ({
    ...sheet,
    name: sanitizeSheetName(sheet.name, index, used)
  }));

  const files = [];
  const sheetOverrides = normalized
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('');

  files.push({
    name: '[Content_Types].xml',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheetOverrides}
</Types>`)
  });

  files.push({
    name: '_rels/.rels',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)
  });

  files.push({
    name: 'xl/workbook.xml',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${normalized
      .map((sheet, index) => `<sheet name="${escXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
      .join('')}</sheets>
</workbook>`)
  });

  files.push({
    name: 'xl/_rels/workbook.xml.rels',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${normalized
      .map(
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
      )
      .join('')}
<Relationship Id="rId${normalized.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)
  });

  files.push({ name: 'xl/styles.xml', data: utf8(STYLES) });

  normalized.forEach((sheet, index) => {
    files.push({ name: `xl/worksheets/sheet${index + 1}.xml`, data: utf8(sheetXml(sheet)) });
  });

  return zipStore(files);
};

export const downloadXlsx = (filename, sheets = []) => {
  if (!sheets.length || typeof window === 'undefined') return;
  const blob = new Blob([buildXlsx(sheets)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
