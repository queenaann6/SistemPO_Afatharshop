import React, { useState, useEffect, useMemo } from 'react';
import { XIcon } from './Icons';
import {
  PROVINCES,
  getCitiesForProvince,
  getDistrictsForCity,
  getSubdistrictsForDistrict
} from '../data/indonesiaRegions';
import { formatFullAddress } from './dashboard/mitra/mitraAddressBook';

// Solid House Icon
const SolidHomeIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

// Sleek Chevron Down Icon
const ChevronDownIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 9l-7 7-7-7" />
  </svg>
);

export default function AddressFormModal({
  isOpen,
  onClose,
  onSave,
  editingAddress = null,
  currentUser = null
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    province: '',
    city: '',
    district: '',
    subdistrict: '',
    postalCode: ''
  });

  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityText, setCustomCityText] = useState('');
  const [isCustomDistrict, setIsCustomDistrict] = useState(false);
  const [customDistrictText, setCustomDistrictText] = useState('');
  const [isCustomSubdistrict, setIsCustomSubdistrict] = useState(false);
  const [customSubdistrictText, setCustomSubdistrictText] = useState('');

  // Sync form with editingAddress or defaults
  useEffect(() => {
    if (!isOpen) return;

    if (editingAddress) {
      const cleanPhone = (editingAddress.phone || '').replace(/^\+?62/, '').replace(/^0/, '');
      setFormData({
        name: editingAddress.recipient || editingAddress.name || '',
        phone: cleanPhone,
        email: editingAddress.email || currentUser?.email || '',
        address: editingAddress.street || editingAddress.address || '',
        province: editingAddress.province || '',
        city: editingAddress.city || '',
        district: editingAddress.district || '',
        subdistrict: editingAddress.subdistrict || '',
        postalCode: editingAddress.postalCode || ''
      });
      setIsCustomCity(false);
      setIsCustomDistrict(false);
      setIsCustomSubdistrict(false);
    } else {
      // Default initial state: use current logged-in user name & email if available, else blank
      setFormData({
        name: currentUser?.name || '',
        phone: currentUser?.phone || '',
        email: currentUser?.email || '',
        address: '',
        province: '',
        city: '',
        district: '',
        subdistrict: '',
        postalCode: ''
      });
      setIsCustomCity(false);
      setIsCustomDistrict(false);
      setIsCustomSubdistrict(false);
    }
  }, [isOpen, editingAddress, currentUser]);

  // Dynamic Options based on cascading selections
  const cityList = useMemo(() => {
    return getCitiesForProvince(formData.province);
  }, [formData.province]);

  const districtList = useMemo(() => {
    return getDistrictsForCity(formData.city);
  }, [formData.city]);

  const subdistrictList = useMemo(() => {
    return getSubdistrictsForDistrict(formData.district);
  }, [formData.district]);

  // Handlers for cascading dropdowns
  const handleProvinceChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      province: val,
      city: '',
      district: '',
      subdistrict: '',
      postalCode: ''
    }));
    setIsCustomCity(false);
    setIsCustomDistrict(false);
    setIsCustomSubdistrict(false);
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCity(true);
      setFormData((prev) => ({
        ...prev,
        city: customCityText,
        district: '',
        subdistrict: ''
      }));
    } else {
      setIsCustomCity(false);
      setFormData((prev) => ({
        ...prev,
        city: val,
        district: '',
        subdistrict: ''
      }));
    }
    setIsCustomDistrict(false);
    setIsCustomSubdistrict(false);
  };

  const handleDistrictChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomDistrict(true);
      setFormData((prev) => ({
        ...prev,
        district: customDistrictText,
        subdistrict: '',
        postalCode: ''
      }));
    } else {
      setIsCustomDistrict(false);
      setFormData((prev) => ({
        ...prev,
        district: val,
        subdistrict: '',
        postalCode: ''
      }));
    }
    setIsCustomSubdistrict(false);
  };

  const handleSubdistrictChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomSubdistrict(true);
      setFormData((prev) => ({
        ...prev,
        subdistrict: customSubdistrictText
      }));
    } else {
      setIsCustomSubdistrict(false);
      const match = subdistrictList.find((s) => s.name === val);
      setFormData((prev) => ({
        ...prev,
        subdistrict: val,
        postalCode: match?.postalCode || prev.postalCode || ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Nama penerima wajib diisi');
      return;
    }
    if (!formData.address.trim()) {
      alert('Alamat lengkap wajib diisi');
      return;
    }

    const cleanPhone = formData.phone.replace(/^0+/, '').trim();
    const formattedAddress = formatFullAddress({
      address: formData.address,
      subdistrict: formData.subdistrict,
      district: formData.district,
      city: formData.city,
      province: formData.province,
      postalCode: formData.postalCode
    });

    const result = {
      ...(editingAddress || {}),
      id: editingAddress ? editingAddress.id : Date.now(),
      name: formData.name.trim(),
      recipient: formData.name.trim(),
      phone: cleanPhone,
      phoneDisplay: cleanPhone ? `(+62) ${cleanPhone}` : '(+62)',
      email: formData.email.trim(),
      street: formData.address.trim(),
      address: formattedAddress,
      province: formData.province,
      city: formData.city,
      district: formData.district,
      subdistrict: formData.subdistrict,
      postalCode: formData.postalCode.trim()
    };

    onSave(result);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SolidHomeIcon className="w-4 h-4 text-stone-900" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight">
              {editingAddress ? 'Ubah Alamat Pengiriman' : 'Tambah Alamat Baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-800 transition cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
            {/* Row 1: Nama Penerima & Nomor Telepon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-stone-700 font-medium block">Nama Penerima</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama Penerima"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 text-stone-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-medium block">Nomor Telepon</label>
                <div className="flex rounded-lg border border-stone-300 overflow-hidden focus-within:ring-1 focus-within:ring-stone-500 focus-within:border-stone-500 bg-white">
                  <span className="bg-stone-50 border-r border-stone-300 px-3 py-2 text-stone-600 font-semibold text-xs flex items-center select-none">
                    +62
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.startsWith('62')) val = val.slice(2);
                      if (val.startsWith('0')) val = val.slice(1);
                      setFormData({ ...formData, phone: val });
                    }}
                    placeholder="Nomor Telepon"
                    className="w-full px-3 py-2 text-xs focus:outline-none text-stone-900 placeholder-stone-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Email */}
            <div className="space-y-1">
              <label className="text-stone-700 font-medium block">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 text-stone-900 bg-white"
              />
            </div>

            {/* Row 3: Alamat Lengkap */}
            <div className="space-y-1">
              <label className="text-stone-700 font-medium block">Alamat Lengkap</label>
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Tambahkan alamat lengkap"
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 text-stone-900 text-xs bg-white resize-none"
              />
            </div>

            {/* Row 4: Provinsi */}
            <div className="space-y-1">
              <label className="text-stone-700 font-medium block">Provinsi</label>
              <div className="relative">
                <select
                  value={formData.province}
                  onChange={handleProvinceChange}
                  className={`w-full appearance-none bg-white px-3 py-2 pr-9 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 cursor-pointer ${
                    formData.province ? 'text-stone-900' : 'text-stone-400'
                  }`}
                >
                  <option value="" disabled hidden>
                    Provinsi
                  </option>
                  {PROVINCES.map((prov) => (
                    <option key={prov} value={prov} className="text-stone-900">
                      {prov}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-400">
                  <ChevronDownIcon className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Row 5: Kota */}
            <div className="space-y-1">
              <label className="text-stone-700 font-medium block">Kota</label>
              <div className="relative">
                <select
                  value={isCustomCity ? '__custom__' : formData.city}
                  onChange={handleCityChange}
                  className={`w-full appearance-none bg-white px-3 py-2 pr-9 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 cursor-pointer ${
                    formData.city || isCustomCity ? 'text-stone-900' : 'text-stone-400'
                  }`}
                >
                  <option value="" disabled hidden>
                    Kota
                  </option>
                  {cityList.map((city) => (
                    <option key={city} value={city} className="text-stone-900">
                      {city}
                    </option>
                  ))}
                  <option value="__custom__" className="text-stone-700 italic">
                    + Ketik Kota/Kabupaten Lainnya...
                  </option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-400">
                  <ChevronDownIcon className="w-4 h-4" />
                </div>
              </div>
              {isCustomCity && (
                <input
                  type="text"
                  placeholder="Ketik nama Kota / Kabupaten..."
                  value={customCityText}
                  onChange={(e) => {
                    setCustomCityText(e.target.value);
                    setFormData({ ...formData, city: e.target.value });
                  }}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 text-stone-900 bg-white"
                />
              )}
            </div>

            {/* Row 6: Kecamatan */}
            <div className="space-y-1">
              <label className="text-stone-700 font-medium block">Kecamatan</label>
              <div className="relative">
                <select
                  value={isCustomDistrict ? '__custom__' : formData.district}
                  onChange={handleDistrictChange}
                  className={`w-full appearance-none bg-white px-3 py-2 pr-9 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 cursor-pointer ${
                    formData.district || isCustomDistrict ? 'text-stone-900' : 'text-stone-400'
                  }`}
                >
                  <option value="" disabled hidden>
                    Kecamatan
                  </option>
                  {districtList.map((dist) => (
                    <option key={dist} value={dist} className="text-stone-900">
                      {dist}
                    </option>
                  ))}
                  <option value="__custom__" className="text-stone-700 italic">
                    + Ketik Kecamatan Lainnya...
                  </option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-400">
                  <ChevronDownIcon className="w-4 h-4" />
                </div>
              </div>
              {isCustomDistrict && (
                <input
                  type="text"
                  placeholder="Ketik nama Kecamatan..."
                  value={customDistrictText}
                  onChange={(e) => {
                    setCustomDistrictText(e.target.value);
                    setFormData({ ...formData, district: e.target.value });
                  }}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 text-stone-900 bg-white"
                />
              )}
            </div>

            {/* Row 7: Kelurahan */}
            <div className="space-y-1">
              <label className="text-stone-700 font-medium block">Kelurahan</label>
              <div className="relative">
                <select
                  value={isCustomSubdistrict ? '__custom__' : formData.subdistrict}
                  onChange={handleSubdistrictChange}
                  className={`w-full appearance-none bg-white px-3 py-2 pr-9 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 cursor-pointer ${
                    formData.subdistrict || isCustomSubdistrict ? 'text-stone-900' : 'text-stone-400'
                  }`}
                >
                  <option value="" disabled hidden>
                    Kelurahan
                  </option>
                  {subdistrictList.map((sub) => (
                    <option key={sub.name} value={sub.name} className="text-stone-900">
                      {sub.name}
                    </option>
                  ))}
                  <option value="__custom__" className="text-stone-700 italic">
                    + Ketik Kelurahan Lainnya...
                  </option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-400">
                  <ChevronDownIcon className="w-4 h-4" />
                </div>
              </div>
              {isCustomSubdistrict && (
                <input
                  type="text"
                  placeholder="Ketik nama Kelurahan / Desa..."
                  value={customSubdistrictText}
                  onChange={(e) => {
                    setCustomSubdistrictText(e.target.value);
                    setFormData({ ...formData, subdistrict: e.target.value });
                  }}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 text-stone-900 bg-white"
                />
              )}
            </div>

            {/* Row 8: Kode Pos */}
            <div className="space-y-1">
              <label className="text-stone-700 font-medium block">Kode pos</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Kodepos"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 text-stone-900 bg-white"
              />
            </div>

            {/* Form Footer / Button Simpan */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-6 border border-stone-800 rounded-lg text-xs font-bold text-stone-900 hover:bg-stone-50 active:bg-stone-100 transition cursor-pointer text-center"
              >
                Simpan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
