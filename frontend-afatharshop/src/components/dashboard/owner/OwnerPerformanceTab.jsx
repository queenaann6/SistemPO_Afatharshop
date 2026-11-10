import React from 'react';
import {
  Badge,
  Card,
  MetricCard,
  PageHead,
  TD,
  TH,
  TableWrap,
  roleLabel,
  sumBy
} from '../poCore';

const DEFAULT_ROLE_TONE = {
  owner: 'amber',
  finance: 'blue',
  marketing: 'violet',
  mitra: 'emerald'
};

export default function OwnerPerformanceTab({
  teamPerf = [],
  roleTone = DEFAULT_ROLE_TONE
}) {
  return (
    <>
      <PageHead
        title="Kinerja Tim Admin"
        desc="Rekap kontribusi tiap admin berdasarkan aktivitas yang tercatat pada sistem."
        badge={<Badge tone="gray">{teamPerf.length} anggota</Badge>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Total Aktivitas"
          value={sumBy(teamPerf, (u) => u.actions)}
          sub="seluruh tim"
          tone="violet"
          icon="spark"
        />
        <MetricCard
          label="ACC Purchasing"
          value={sumBy(teamPerf, (u) => u.marketingAcc)}
          sub="pesanan diproses"
          tone="emerald"
          icon="check"
        />
        <MetricCard
          label="Verifikasi Finance"
          value={sumBy(teamPerf, (u) => u.dpAcc + u.pelunasanAcc + u.ongkirAcc)}
          sub="DP · pelunasan · ongkir"
          tone="blue"
          icon="shield"
        />
        <MetricCard
          label="Pengajuan Direview"
          value={sumBy(teamPerf, (u) => u.prReviewed + u.prApproved)}
          sub="purchasing & owner"
          tone="amber"
          icon="file"
        />
      </div>

      <Card title="Rincian Kinerja" subtitle="Diurutkan dari aktivitas terbanyak">
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Nama</th>
              <th className={TH}>Peran</th>
              <th className={`${TH} text-right`}>ACC Pesanan</th>
              <th className={`${TH} text-right`}>Verif DP</th>
              <th className={`${TH} text-right`}>Verif Lunas</th>
              <th className={`${TH} text-right`}>Verif Ongkir</th>
              <th className={`${TH} text-right`}>Pesanan Dibuat</th>
              <th className={`${TH} text-right`}>Pengajuan</th>
              <th className={`${TH} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teamPerf
              .slice()
              .sort((a, b) => b.actions - a.actions)
              .map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/70">
                  <td className={TD}>
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <p className="text-[10px] text-gray-400">{u.email}</p>
                  </td>
                  <td className={TD}>
                    <Badge tone={roleTone[u.role] || 'gray'}>{roleLabel(u.role)}</Badge>
                  </td>
                  <td className={`${TD} text-right`}>{u.marketingAcc}</td>
                  <td className={`${TD} text-right`}>{u.dpAcc}</td>
                  <td className={`${TD} text-right`}>{u.pelunasanAcc}</td>
                  <td className={`${TD} text-right`}>{u.ongkirAcc}</td>
                  <td className={`${TD} text-right`}>{u.ordersCreated}</td>
                  <td className={`${TD} text-right`}>
                    {u.prCreated + u.prReviewed + u.prApproved}
                  </td>
                  <td className={`${TD} text-right`}>
                    <Badge tone="violet">{u.actions}</Badge>
                  </td>
                </tr>
              ))}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
