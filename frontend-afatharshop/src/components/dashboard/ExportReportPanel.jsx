import React, { useState } from 'react';
import { Badge, Button, Card, PageHead, todayISO } from './poCore';
import { downloadXlsx } from '../../utils/xlsx';

export default function ExportReportPanel({
  title = 'Ekspor Laporan',
  desc = 'Semua baris ikut diekspor, tidak mengikuti halaman atau filter yang sedang tampil. Setiap kelompok data menjadi satu sheet dalam file Excel yang sama.',
  sections = [],
  fileName = 'laporan_afatharshop'
}) {
  const [selected, setSelected] = useState(() => sections.map((section) => section.id));

  const allSelected = selected.length === sections.length;
  const chosen = sections.filter((section) => selected.includes(section.id));
  const totalRows = chosen.reduce((sum, section) => sum + section.rows.length, 0);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const toggleAll = () => setSelected(allSelected ? [] : sections.map((section) => section.id));

  const download = () => {
    if (!chosen.length) return;
    downloadXlsx(
      `${fileName}_${todayISO()}`,
      chosen.map((section) => ({
        name: section.sheetName || section.label,
        headers: section.headers,
        rows: section.rows,
        numericCols: section.numericCols,
        currencyCols: section.currencyCols,
        integerCols: section.integerCols,
        dateCols: section.dateCols,
        sum: section.sum !== undefined ? section.sum : true
      }))
    );
  };

  return (
    <>
      <PageHead
        title={title}
        desc={desc}
        badge={<Badge tone="gray">{chosen.length} sheet · {totalRows} baris</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allSelected ? 'Kosongkan Pilihan' : 'Pilih Semua'}
            </Button>
            <Button icon="download" onClick={download} disabled={!chosen.length}>
              Unduh Excel (.xlsx)
            </Button>
          </div>
        }
      />

      <Card
        title="Isi Laporan"
        subtitle="Centang kelompok data yang ingin dimasukkan ke file. Nominal tersimpan sebagai angka asli supaya bisa dijumlahkan ulang di Excel."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {sections.map((section) => {
            const active = selected.includes(section.id);
            return (
              <label
                key={section.id}
                className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                  active ? 'border-[#6B1416]/30 bg-[#6B1416]/[0.03]' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(section.id)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#6B1416] cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-900">{section.label}</span>
                    <Badge tone={section.rows.length ? 'teal' : 'gray'}>{section.rows.length} baris</Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{section.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3 text-[11px] text-gray-500 leading-relaxed">
          File berisi {chosen.length || 0} sheet: {chosen.map((section) => section.sheetName || section.label).join(', ') || '—'}.
          Header berwarna, lebar kolom, dan baris TOTAL di bawah otomatis.
        </div>
      </Card>
    </>
  );
}
