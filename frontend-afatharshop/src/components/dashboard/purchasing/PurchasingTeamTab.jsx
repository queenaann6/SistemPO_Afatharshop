import React from 'react';
import {
  Badge,
  Button,
  Card,
  Icon,
  PageHead,
  TD,
  TH,
  TableWrap,
  fmtDate,
  roleLabel
} from '../poCore';

export default function PurchasingTeamTab({
  team = [],
  setTeamModal = () => {},
  toggleTeam = () => {},
  deleteTeam = () => {}
}) {
  return (
    <>
      <PageHead
        title="Tim Admin"
        desc="Buat akun tim finance & purchasing. Setiap akun hanya dapat mengakses menu sesuai perannya."
        badge={<Badge tone="gray">{team.length} akun</Badge>}
        actions={
          <Button
            icon="plus"
            onClick={() =>
              setTeamModal({
                form: { name: '', email: '', phone: '', role: 'marketing' }
              })
            }
          >
            Akun Tim Baru
          </Button>
        }
      />

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[11px] text-gray-600 flex items-start gap-2">
        <Icon name="shield" className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
        <p>
          Admin purchasing dapat membuat akun finance dan purchasing. Akun <b>owner</b> hanya dapat dibuat dari
          portal owner untuk menjaga pemisahan hak akses.
        </p>
      </div>

      <Card>
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Nama</th>
              <th className={TH}>Email</th>
              <th className={TH}>Peran</th>
              <th className={TH}>Telepon</th>
              <th className={TH}>Dibuat</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {team.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{u.name}</p>
                  <p className="text-[10px] text-gray-400">oleh {u.createdBy || 'System'}</p>
                </td>
                <td className={TD}>{u.email}</td>
                <td className={TD}>
                  <Badge tone={u.role === 'finance' ? 'emerald' : u.role === 'marketing' ? 'red' : 'amber'}>
                    {roleLabel(u.role)}
                  </Badge>
                </td>
                <td className={TD}>{u.phone || '—'}</td>
                <td className={TD}>{fmtDate(u.createdAt)}</td>
                <td className={TD}>
                  <Badge tone={u.active ? 'emerald' : 'gray'}>{u.active ? 'Aktif' : 'Nonaktif'}</Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={u.role === 'owner'}
                      onClick={() => setTeamModal({ mode: 'edit', id: u.id, form: { ...u, password: '' } })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant={u.active ? 'dangerOutline' : 'primary'}
                      disabled={u.role === 'owner'}
                      onClick={() => toggleTeam(u)}
                    >
                      {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      disabled={u.role === 'owner'}
                      onClick={() => deleteTeam(u)}
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
