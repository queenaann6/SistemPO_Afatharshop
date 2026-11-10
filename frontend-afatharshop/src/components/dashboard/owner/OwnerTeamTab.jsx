import React from 'react';
import {
  Badge,
  Button,
  Card,
  MetricCard,
  PageHead,
  SearchBox,
  Switch,
  TD,
  TH,
  TableWrap,
  fmtDate,
  levelTone,
  roleLabel,
  rp
} from '../poCore';
import { normalizeLevel } from '../../../services/adapters';

const DEFAULT_ROLE_TONE = {
  owner: 'amber',
  finance: 'blue',
  marketing: 'violet',
  mitra: 'emerald'
};

export default function OwnerTeamTab({
  team = [],
  mitra = [],
  teamTab = 'tim',
  setTeamTab = () => {},
  setTeamModal = () => {},
  toggleTeam = () => {},
  deleteTeam = () => {},
  deleteMitra = () => {},
  mitraSearch = '',
  setMitraSearch = () => {},
  me = {},
  roleTone = DEFAULT_ROLE_TONE
}) {
  const filteredMitra = mitra.filter((m) => {
    if (!mitraSearch.trim()) return true;
    const q = mitraSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHead
        title="Manajemen Tim & Hak Akses"
        desc="Kelola akun admin Finance dan Purchasing yang membantu operasional PO."
        badge={<Badge tone="gray">{team.length} akun</Badge>}
        actions={
          <Button
            variant="gold"
            icon="plus"
            onClick={() =>
              setTeamModal({ form: { name: '', email: '', role: 'finance', phone: '' } })
            }
          >
            Akun Tim Baru
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Akun" value={team.length} sub="seluruh peran" tone="gray" icon="users" />
        <MetricCard
          label="Aktif"
          value={team.filter((u) => u.active).length}
          sub="dapat login"
          tone="emerald"
          icon="check"
        />
        <MetricCard
          label="Admin Finance"
          value={team.filter((u) => u.role === 'finance').length}
          sub="verifikasi & kirim"
          tone="blue"
          icon="card"
        />
        <MetricCard
          label="Admin Purchasing"
          value={team.filter((u) => u.role === 'marketing').length}
          sub="ACC & katalog"
          tone="violet"
          icon="spark"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTeamTab('tim')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            teamTab === 'tim'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Akun Tim Admin ({team.length})
        </button>
        <button
          type="button"
          onClick={() => setTeamTab('mitra')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            teamTab === 'mitra'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Akun Mitra & Reseller ({mitra.length})
        </button>
      </div>

      {teamTab === 'tim' && (
        <Card title="Akun Tim" subtitle="Nonaktifkan atau hapus akun tim yang sudah tidak bertugas">
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Nama</th>
                <th className={TH}>Peran</th>
                <th className={TH}>Kontak</th>
                <th className={TH}>Dibuat</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {team.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/70">
                  <td className={TD}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {u.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-[10px] text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    <Badge tone={roleTone[u.role] || 'gray'}>{roleLabel(u.role)}</Badge>
                  </td>
                  <td className={TD}>
                    <p className="text-[11px] text-gray-700">{u.phone || '—'}</p>
                    <p className="text-[10px] text-gray-400">oleh {u.createdBy}</p>
                  </td>
                  <td className={TD}>{fmtDate(u.createdAt)}</td>
                  <td className={TD}>
                    <Badge tone={u.active ? 'emerald' : 'gray'} dot>
                      {u.active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setTeamModal({ mode: 'edit', id: u.id, form: { ...u, password: '' } })}
                      >
                        Edit
                      </Button>
                      <Switch checked={u.active} onChange={() => toggleTeam(u)} disabled={u.id === me.id} />
                      <Button
                        size="xs"
                        variant="danger"
                        disabled={u.id === me.id || u.role === 'owner'}
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
      )}

      {teamTab === 'mitra' && (
        <Card
          title="Akun Mitra & Reseller"
          subtitle="Seluruh mitra pre-order yang terdaftar pada sistem"
          action={
            <SearchBox
              value={mitraSearch}
              onChange={setMitraSearch}
              placeholder="Cari nama, email, kota..."
            />
          }
        >
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Mitra</th>
                <th className={TH}>Level</th>
                <th className={TH}>No. HP / WA</th>
                <th className={TH}>Kota / Domisili</th>
                <th className={`${TH} text-right`}>Saldo Deposit</th>
                <th className={`${TH} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMitra.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/70">
                  <td className={TD}>
                    <p className="font-semibold text-gray-900">{m.name}</p>
                    <p className="text-[10px] text-gray-400">{m.email || '—'}</p>
                  </td>
                  <td className={TD}>
                    <Badge tone={levelTone(m.level)}>{normalizeLevel(m.level)}</Badge>
                  </td>
                  <td className={TD}>{m.phone || '—'}</td>
                  <td className={TD}>{m.city || '—'}</td>
                  <td className={`${TD} text-right font-bold text-emerald-700`}>
                    {rp(m.depositBalance || m.balance || 0)}
                  </td>
                  <td className={`${TD} text-right`}>
                    <Button
                      size="xs"
                      variant="dangerOutline"
                      icon="trash"
                      onClick={() => deleteMitra(m)}
                      title="Hapus Akun Mitra"
                    >
                      Hapus Akun
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredMitra.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                    Tidak ada akun mitra pada pencarian ini.
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
