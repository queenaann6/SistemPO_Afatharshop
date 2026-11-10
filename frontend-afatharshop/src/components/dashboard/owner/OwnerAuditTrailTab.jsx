import React from 'react';
import {
  Badge,
  Button,
  Card,
  PageHead,
  SearchBox,
  Select,
  TD,
  TH,
  TableWrap,
  fmtDate
} from '../poCore';

export default function OwnerAuditTrailTab({
  filteredAudit = [],
  handleClearAuditLogs = () => {},
  auditSearch = '',
  setAuditSearch = () => {},
  auditType = 'all',
  setAuditType = () => {},
  auditTypes = [],
  deleteAuditLog = () => {}
}) {
  return (
    <>
      <PageHead
        title="Jejak Audit Aktivitas"
        desc="Rekam jejak tindakan admin, mitra, dan owner lintas modul PO."
        badge={<Badge tone="gray">{filteredAudit.length} aktivitas</Badge>}
        actions={
          <Button
            variant="dangerOutline"
            icon="trash"
            onClick={handleClearAuditLogs}
          >
            Bersihkan Riwayat Log
          </Button>
        }
      />

      <Card
        title="Log Aktivitas"
        subtitle="Gunakan filter untuk menelusuri kejadian tertentu"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <SearchBox value={auditSearch} onChange={setAuditSearch} placeholder="Cari aktor / referensi..." />
            <Select value={auditType} onChange={(e) => setAuditType(e.target.value)} className="w-44">
              <option value="all">Semua tipe</option>
              {auditTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Tanggal</th>
              <th className={TH}>Aktor</th>
              <th className={TH}>Tipe</th>
              <th className={TH}>Referensi</th>
              <th className={TH}>Detail</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAudit.slice(0, 200).map((e, i) => (
              <tr key={`${e.ref}-${e.type}-${i}`} className="hover:bg-gray-50/70">
                <td className={`${TD} whitespace-nowrap`}>{fmtDate(e.date)}</td>
                <td className={`${TD} font-semibold text-gray-900`}>{e.actor}</td>
                <td className={TD}>
                  <Badge tone="violet">{e.type}</Badge>
                </td>
                <td className={TD}>
                  <span className="font-semibold text-sky-700">{e.ref}</span>
                </td>
                <td className={TD}>
                  <p className="text-[11px] text-gray-600 max-w-[320px] leading-snug">{e.detail}</p>
                </td>
                <td className={`${TD} text-right`}>
                  <Button
                    size="xs"
                    variant="dangerOutline"
                    icon="trash"
                    onClick={() => deleteAuditLog(e)}
                    title="Hapus rekaman audit ini"
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
            {filteredAudit.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                  Tidak ada aktivitas pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
