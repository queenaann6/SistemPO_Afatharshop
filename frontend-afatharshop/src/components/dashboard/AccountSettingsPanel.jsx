import React, { useState, useRef, useEffect } from 'react';
import api, { mediaUrl } from '../../services/api';
import { Card, PageHead, Badge, Button, Icon, Field, Input } from './poCore';

export default function AccountSettingsPanel({
  currentUser,
  onUpdateUser,
  onUpdateAvatar,
  toast,
  role = 'admin'
}) {
  const me = currentUser || {};

  // Profile Information State
  const [name, setName] = useState(me.name || me.nama || '');
  const [email, setEmail] = useState(me.email || '');
  const [phone, setPhone] = useState(me.phone || '');
  const [city, setCity] = useState(me.city || '');
  const [avatar, setAvatar] = useState(
    me.avatar && !me.avatar.includes('unsplash.com') ? me.avatar : ''
  );

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (me.name || me.nama) setName(me.name || me.nama || '');
    if (me.email) setEmail(me.email || '');
    if (me.phone) setPhone(me.phone || '');
    if (me.city) setCity(me.city || '');
    if (me.avatar && !me.avatar.includes('unsplash.com')) {
      setAvatar(me.avatar);
    }
  }, [me]);

  const initials = (str) =>
    (str || 'U')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Ukuran berkas foto maksimal 5 MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await api.uploadFile(file, 'avatar');
      let finalUrl = '';
      if (res?.data?.path) {
        finalUrl = mediaUrl(res.data.path);
      } else if (res?.url) {
        finalUrl = mediaUrl(res.url);
      }

      if (!finalUrl) {
        throw new Error('Gagal mendapatkan tautan foto dari respon server.');
      }

      // Update backend profile with new avatar URL
      await api.updateProfile({ avatar: finalUrl });

      setAvatar(finalUrl);
      if (onUpdateAvatar) {
        await onUpdateAvatar(finalUrl, file);
      }
      if (onUpdateUser) {
        await onUpdateUser({ avatar: finalUrl });
      }

      setProfileSuccess('Foto profil berhasil diunggah dan disimpan ke database!');
      toast && toast('Foto profil berhasil diperbarui.', 'success');
    } catch (err) {
      setProfileError(err?.message || 'Gagal mengunggah foto profil.');
      toast && toast(err?.message || 'Gagal unggah foto profil.', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Hapus foto profil dan gunakan inisial nama?')) return;

    setIsUploadingAvatar(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await api.updateProfile({ avatar: '' });
      setAvatar('');
      if (onUpdateAvatar) {
        await onUpdateAvatar('', null);
      }
      if (onUpdateUser) {
        await onUpdateUser({ avatar: '' });
      }
      setProfileSuccess('Foto profil dihapus. Menggunakan inisial nama.');
      toast && toast('Foto profil dihapus.', 'success');
    } catch (err) {
      setProfileError(err?.message || 'Gagal menghapus foto profil.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Nama lengkap wajib diisi.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const payload = {
        name: name.trim(),
        nama: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        avatar: avatar
      };

      await api.updateProfile(payload);

      if (onUpdateUser) {
        await onUpdateUser({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          avatar: avatar
        });
      }

      setProfileSuccess('Informasi profil berhasil diperbarui di database.');
      toast && toast('Profil berhasil disimpan.', 'success');
    } catch (err) {
      setProfileError(err?.message || 'Gagal memperbarui profil akun.');
      toast && toast(err?.message || 'Gagal simpan profil.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword) {
      setPasswordError('Password saat ini wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setIsSavingPassword(true);

    try {
      await api.changePassword({
        current_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      });

      setPasswordSuccess(
        'Password berhasil diperbarui di server! Gunakan password baru saat login berikutnya.'
      );
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast && toast('Password akun berhasil diperbarui.', 'success');
    } catch (err) {
      setPasswordError(
        err?.message || 'Gagal memperbarui password. Pastikan password saat ini sudah benar.'
      );
      toast && toast(err?.message || 'Gagal perbarui password.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const roleLabelText =
    role === 'owner'
      ? 'Owner & Eksekutif'
      : role === 'marketing'
      ? 'Admin Purchasing'
      : role === 'finance'
      ? 'Admin Finance'
      : 'Admin';

  const badgeTone =
    role === 'owner' ? 'amber' : role === 'marketing' ? 'red' : 'emerald';

  return (
    <div className="space-y-6">
      <PageHead
        title="Pengaturan Akun & Keamanan"
        desc="Kelola profil akun, unggah foto avatar, dan perbarui kata sandi Anda yang tersimpan di server."
        badge={<Badge tone={badgeTone}>{roleLabelText}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* BAGIAN 1: FOTO PROFIL & INFORMASI PENGGUNA */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <div className="p-5 sm:p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Icon name="users" className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">
                  Foto Profil & Data Diri
                </h3>
              </div>

              {profileSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Icon name="check" className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Icon name="alert" className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Avatar Preview & Upload Action */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 bg-gray-50/70 border border-gray-200/60 rounded-2xl">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center text-lg font-bold text-gray-600">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name || 'Avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials(name)}</span>
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      Mengunggah...
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Foto Avatar Akun</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Format didukung: JPG, PNG, WEBP (maks. 5 MB). Foto langsung disimpan ke backend.
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFile}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon="upload"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      {isUploadingAvatar ? 'Mengunggah...' : 'Pilih Foto Baru'}
                    </Button>

                    {avatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isUploadingAvatar}
                        onClick={handleRemoveAvatar}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        Hapus Foto
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Input Data Diri */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nama Lengkap" required>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Lengkap"
                      required
                    />
                  </Field>

                  <Field label="Alamat Email" hint="Digunakan untuk login portal">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nomor WhatsApp / HP">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                    />
                  </Field>

                  <Field label="Kota / Domisili">
                    <Input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Contoh: Bandung, Jawa Barat"
                    />
                  </Field>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    icon="check"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? 'Menyimpan ke Server...' : 'Simpan Perubahan Profil'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>

        {/* BAGIAN 2: KEAMANAN & UBAH PASSWORD */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Icon name="key" className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">
                  Ubah Kata Sandi Akun
                </h3>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Untuk keamanan akun, gunakan password unik minimal 6 karakter. Password langsung dienkripsi aman di database server.
              </p>

              {passwordSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Icon name="check" className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Icon name="alert" className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <Field label="Password Saat Ini" required>
                  <div className="relative">
                    <Input
                      type={showOld ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan password lama"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                      title={showOld ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      <Icon name="eye" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Field>

                <Field label="Password Baru" required hint="Minimal 6 karakter">
                  <div className="relative">
                    <Input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password baru"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                      title={showNew ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      <Icon name="eye" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Field>

                <Field label="Konfirmasi Password Baru" required>
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru persis sama"
                    required
                  />
                </Field>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    icon="key"
                    className="w-full justify-center"
                    disabled={isSavingPassword}
                  >
                    {isSavingPassword ? 'Menyimpan Password...' : 'Perbarui Kata Sandi'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
