/**
 * Utility: openInvoicePrintTab
 * Opens the official Afatharshop Pre-Order invoice directly in a clean browser tab.
 * - Logo Afatharshop resmi dari index dengan background transparan (/logo-nobg.png)
 * - Varian & spesifikasi produk ditampilkan dengan sangat jelas (Varian, Warna, Ukuran)
 * - Rincian tagihan: ditagihkan kepada siapa, rekening tujuan, dan skema termin
 * - Riwayat pembayaran tersinkron: tanggal, rekening, keterangan, jumlah transfer
 * - Background putih bersih tanpa kontainer abu-abu
 * - Format penulisan Rupiah rapi (tabular-nums, right-aligned)
 */

export function openInvoicePrintTab(order, bankAccounts = []) {
  if (!order) return;

  const clean = (v) => String(v == null ? '' : v).trim();
  const esc = (v) =>
    clean(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const withoutSuffix = (s) => clean(s).replace(/\s*\(.*\)\s*$/, '');
  const formatOrderDate = (raw) => {
    const val = clean(raw);
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const [y, m, d] = val.slice(0, 10).split('-');
      return `${d}-${m}-${y}`;
    }
    const parsed = new Date(val);
    if (val && !Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    }
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  };

  const formatRupiah = (val) => {
    const num = Math.round(Number(val) || 0);
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  const orderNo = clean(order.orderNo) || clean(order.invoice) || '-';
  const orderDate = formatOrderDate(order.date || order.checkoutDate || order.settledAt || order.created_at);

  const addressObj = order.address && typeof order.address === 'object' ? order.address : null;
  const recipientName =
    clean(order.recipientName) ||
    withoutSuffix(order.mitraName) ||
    clean(addressObj && addressObj.recipient) ||
    'Mitra Afatharshop';
  const recipientPhone =
    clean(order.recipientPhone) || clean(order.phone) || clean(addressObj && addressObj.phone);
  const recipientAddress =
    clean(order.recipientAddress) ||
    (typeof order.address === 'string' ? clean(order.address) : '') ||
    (addressObj
      ? [
          addressObj.street,
          addressObj.kelurahan,
          addressObj.kecamatan,
          addressObj.city,
          addressObj.province,
          addressObj.postalCode,
          addressObj.note
        ]
          .map(clean)
          .filter(Boolean)
          .join(', ')
      : '') ||
    'Alamat pengiriman belum diisi';

  // Helper untuk membersihkan dan memperjelas varian, warna, dan ukuran
  const parseSpecs = (it) => {
    const title = clean(it.title) || clean(it.produk) || 'Produk Pre-Order';
    let rawVariant = clean(it.variant) || clean(it.variation) || '';
    let color = clean(it.color) || clean(it.warna) || clean(it.selectedColor) || '';
    let size = clean(it.size) || clean(it.ukuran) || clean(it.selectedSize) || '';

    // Handle format "SCARF MOM ALL : IVORY"
    if (rawVariant.includes(' : ')) {
      const parts = rawVariant.split(' : ');
      if (parts[1] && !color) color = parts[1].trim();
      rawVariant = parts[0].trim();
    }

    // Normalisasi teks varian agar jelas dan tidak berulang dengan nama produk
    let variant = rawVariant;
    const lowerVar = rawVariant.toLowerCase();
    const lowerTitle = title.toLowerCase();

    if (lowerVar === 'hera bag all' || lowerVar === 'all' || lowerVar === 'all varian') {
      variant = 'All Size';
    } else if (lowerVar.startsWith(lowerTitle) && lowerVar.length > lowerTitle.length) {
      variant = rawVariant.slice(lowerTitle.length).replace(/^[\s-:–]+/, '').trim() || 'All Size';
    } else if (!variant) {
      variant = 'All Size';
    }

    return { title, variant, color, size };
  };

  const rawItems =
    (Array.isArray(order.items) && order.items.length && order.items) ||
    (Array.isArray(order._projectMeta?.items) && order._projectMeta.items.length && order._projectMeta.items) ||
    null;

  // Satu perhitungan untuk pesanan admin (harga ecer + diskon %) maupun toko
  // (harga sudah dipotong fee mitra). Diskon selalu diturunkan dari selisih
  // harga ecer dan harga mitra agar kolom invoice tidak pernah kosong/berbeda.
  const orderFeeTotal = Number(order.feeMitraNominal) || Number(order.discountNominal) || 0;
  const orderDiscountPct = Number(order.discountPct) || 0;
  const orderSubtotal = Number(order.subtotal) || 0;

  const normalizeItem = (it, index = 0) => {
    const qty = Math.max(1, Number(it.qty) || 1);
    const basePrice = Number(it.basePrice) || Number(it.retailPrice) || Number(it.hargaEcer) || 0;
    const storedPrice = Number(it.price) || 0;
    const storedPct =
      Number(it.discountPct) || (!rawItems || rawItems.length === 1 ? orderDiscountPct : 0);
    const feeTotal = Number(it.feeMitraNominal) || Number(it.discountNominal) || 0;
    let feePerUnit = Number(it.feeNominal) || (feeTotal > 0 ? feeTotal / qty : 0);
    if (!feePerUnit && orderFeeTotal > 0) {
      const share =
        rawItems && rawItems.length > 1 && orderSubtotal > 0
          ? orderFeeTotal * ((storedPrice * qty) / orderSubtotal)
          : orderFeeTotal;
      feePerUnit = share / qty;
    }
    const addonTotal = Number(it.addonTotal) || Number(it.addonNominal) || 0;
    const addon = Number(it.addon) || (addonTotal > 0 ? addonTotal / qty : 0);

    // Pesanan admin menyimpan harga ecer di `price`, pesanan toko menyimpan
    // harga bersih di `price` + harga ecer di `basePrice`.
    const hasBasePrice = basePrice > 0;
    const retailPrice = hasBasePrice ? basePrice : storedPrice;

    let netMitraPrice;
    if (storedPct > 0 && storedPct < 100) {
      netMitraPrice = Math.round(retailPrice * (1 - storedPct / 100));
    } else if (feePerUnit > 0) {
      netMitraPrice = retailPrice - feePerUnit;
    } else if (hasBasePrice && storedPrice > 0 && storedPrice < retailPrice) {
      netMitraPrice = storedPrice;
    } else {
      netMitraPrice = retailPrice;
    }
    netMitraPrice = Math.max(0, Math.round(netMitraPrice));

    const discountNominal = Math.max(0, retailPrice - netMitraPrice);
    const discountPct = storedPct > 0 ? storedPct : retailPrice > 0 ? Math.round((discountNominal / retailPrice) * 1000) / 10 : 0;
    const addonUnit = Math.max(0, Math.round(addon));
    const specs = parseSpecs(it);

    return {
      id: it.id ?? index + 1,
      title: specs.title,
      variant: specs.variant,
      color: specs.color,
      size: specs.size,
      retailPrice,
      discountNominal,
      discountPct,
      netMitraPrice,
      qty,
      addon: addonUnit,
      subtotal: (netMitraPrice + addonUnit) * qty
    };
  };

  const items = rawItems
    ? rawItems.map((it, index) => normalizeItem(it, index))
    : [normalizeItem({ ...order, title: order.title || order.produk })];


  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const totalRetail = items.reduce((sum, item) => sum + Number(item.retailPrice) * Number(item.qty), 0);
  const totalDiscount = items.reduce((sum, item) => sum + Number(item.discountNominal) * Number(item.qty), 0);
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const totalAddon = items.reduce((sum, item) => sum + Number(item.addon) * Number(item.qty), 0);
  const ongkir = Number(order.ongkir) || 0;
  const totalDue = totalPrice + ongkir;

  const rawStatus = clean(order.status || order.paymentStatus || '');
  const cleanStatus = rawStatus.toLowerCase();
  const dpVerified = order.dpStatus === 'ACC' || cleanStatus.includes('dp terbayar');
  const pelunasanVerified = order.pelunasanStatus === 'ACC';
  const ongkirVerified = order.ongkirStatus === 'ACC';
  const statusLunas =
    cleanStatus === 'selesai' || cleanStatus === 'lunas' || cleanStatus === 'paid' || cleanStatus.startsWith('lunas');

  const dpNominal = Number(order.dpNominal) || 0;
  const pelunasanDue = Number(order.pelunasanNominal) || Math.max(0, (totalPrice || orderSubtotal) - dpNominal);
  const dpPaid = dpVerified ? dpNominal : 0;
  const pelunasanPaid = pelunasanVerified ? pelunasanDue : 0;
  const ongkirPaid = ongkirVerified ? ongkir : 0;
  const paidAmount = statusLunas ? totalDue : Number(order.paidAmount) || dpPaid + pelunasanPaid + ongkirPaid;
  const isPaid = statusLunas || (totalDue > 0 && paidAmount >= totalDue - 1);
  const isWaitingVerification =
    !isPaid &&
    (String(order.dpStatus || '').toLowerCase().includes('menunggu') ||
      String(order.pelunasanStatus || '').toLowerCase().includes('menunggu') ||
      String(order.ongkirStatus || '').toLowerCase().includes('menunggu') ||
      cleanStatus.includes('menunggu') ||
      cleanStatus.includes('verifikasi'));

  const statusText = isPaid
    ? 'LUNAS'
    : isWaitingVerification
    ? 'MENUNGGU VERIFIKASI'
    : paidAmount > 0
    ? dpPaid > 0 && !pelunasanPaid && !ongkirPaid
      ? 'DP TERVERIFIKASI'
      : 'DIBAYAR SEBAGIAN'
    : 'BELUM BAYAR';
  const statusClass = isPaid
    ? 'status-paid'
    : isWaitingVerification
    ? 'status-waiting'
    : paidAmount > 0
    ? 'status-partial'
    : 'status-unpaid';

  const remainingAmount = Math.max(0, totalDue - paidAmount);

  /* ---------------- Rincian tagihan & riwayat transfer (tersinkron) -------- */
  const activeBanks = (Array.isArray(bankAccounts) ? bankAccounts : []).filter(
    (b) => b && b.active !== false && clean(b.bank) && clean(b.accountNo)
  );
  const defaultBank = activeBanks[0] || null;

  const mitraName = withoutSuffix(order.mitraName) || recipientName;
  const mitraLevel = clean(order.level) || clean(order.mitraLevel);
  const mitraPhone = clean(order.mitraPhone) || clean(order.phone) || recipientPhone;
  const mitraCity = clean(order.city) || clean(addressObj && addressObj.city);
  const mitraEmail = clean(order.email) || clean(order.mitraEmail);

  const dpPctInvoice =
    Number(order.dpPct) ||
    (totalDue > 0 && dpNominal > 0 ? Math.round((dpNominal / totalDue) * 100) : 0);

  const schemeStages =
    Array.isArray(order.paymentStages) && order.paymentStages.length
      ? order.paymentStages.map((s, i, arr) => ({
          label:
            clean(s.label) ||
            (i === 0 ? 'DP' : i === arr.length - 1 ? 'Pelunasan' : `Termin ${i + 1}`),
          pct: Number(s.pct) || 0,
          date: clean(s.date)
        }))
      : [
          { label: 'DP', pct: dpPctInvoice, date: '' },
          {
            label: 'Pelunasan',
            pct: Math.max(0, 100 - dpPctInvoice),
            date: clean(order.pelunasanDueDate)
          }
        ];

  const isWaitingStatus = (value) => String(value || '').toLowerCase().includes('menunggu');
  const bankOf = (bankField, accountField) => ({
    bank: clean(order[bankField]) || (defaultBank ? clean(defaultBank.bank) : ''),
    account: clean(order[accountField]) || (defaultBank ? clean(defaultBank.accountNo) : '')
  });

  const paymentRows = [];

  const dpRowDate = clean(order.dpVerifiedAt) || clean(order.dpSubmittedAt);
  if (dpNominal > 0 || dpRowDate) {
    const bank = bankOf('dpBank', 'dpBankAccount');
    paymentRows.push({
      date: dpRowDate,
      ...bank,
      label: `DP${dpPctInvoice ? ` ${dpPctInvoice}%` : ''}`,
      amount: dpNominal,
      verified: dpVerified,
      waiting: isWaitingStatus(order.dpStatus) || Boolean(order.dpProof)
    });
  }

  const pelunasanAmount = Number(order.pelunasanSubmittedNominal) || pelunasanDue || 0;
  const pelunasanDate = clean(order.pelunasanVerifiedAt) || clean(order.pelunasanSubmittedAt);
  if (pelunasanAmount > 0 && (pelunasanVerified || pelunasanDate || order.pelunasanProof)) {
    const bank = bankOf('pelunasanBank', 'pelunasanBankAccount');
    paymentRows.push({
      date: pelunasanDate,
      ...bank,
      label: 'Pelunasan',
      amount: pelunasanAmount,
      verified: pelunasanVerified,
      waiting: isWaitingStatus(order.pelunasanStatus) || Boolean(order.pelunasanProof)
    });
  }

  const ongkirAmount = Number(order.ongkirSubmittedNominal) || ongkir || 0;
  const ongkirDate = clean(order.ongkirVerifiedAt) || clean(order.ongkirSubmittedAt);
  if (ongkirAmount > 0 && (ongkirVerified || ongkirDate || order.ongkirProof)) {
    const bank = bankOf('ongkirBank', 'ongkirBankAccount');
    paymentRows.push({
      date: ongkirDate,
      ...bank,
      label: 'Ongkos Kirim',
      amount: ongkirAmount,
      verified: ongkirVerified,
      waiting: isWaitingStatus(order.ongkirStatus) || Boolean(order.ongkirProof)
    });
  }

  if (!paymentRows.length && paidAmount > 0) {
    const bank = bankOf('bank', 'bankAccount');
    paymentRows.push({
      date: clean(order.date),
      ...bank,
      label: 'Pembayaran diterima',
      amount: paidAmount,
      verified: true,
      waiting: false
    });
  }

  const totalTransfer = paymentRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : '';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />
  <title>Invoice ${orderNo} - Afatharshop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    /* Screen Toolbar (hidden in print) */
    .screen-toolbar {
      max-width: 780px;
      margin: 12px auto 16px auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .toolbar-info {
      font-size: 11.5px;
      color: #374151;
    }
    .toolbar-info strong {
      color: #111827;
      font-family: monospace;
    }
    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
    .btn-print {
      background: #6B1416;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-close {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }

    /* Printable Invoice Container (Pure White) */
    .invoice-card {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px 32px;
    }

    /* Top Row: Title & Status Box */
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .invoice-title {
      font-size: 26px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }

    /* Status Badge */
    .status-box {
      display: inline-block;
      padding: 4px 18px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 2px;
      background: transparent;
    }
    .status-unpaid {
      border: 1.5px solid #dc2626;
      color: #dc2626;
    }
    .status-paid {
      border: 1.5px solid #16a34a;
      color: #16a34a;
    }
    .status-waiting {
      border: 1.5px solid #d97706;
      color: #d97706;
    }
    .status-partial {
      border: 1.5px solid #2563eb;
      color: #2563eb;
    }

    /* Brand Logo matching index (Seamless Transparent Background) */
    .brand-logo-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
    }
    .brand-logo-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
      background: transparent;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-size: 15px;
      font-weight: 800;
      color: #92400e;
      letter-spacing: 0.8px;
      line-height: 1.1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .brand-sub {
      font-size: 8.5px;
      color: #b45309;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 2px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* Diterbitkan Oleh */
    .publisher-section {
      margin-top: 14px;
    }
    .publisher-label {
      font-size: 9.5px;
      font-weight: 600;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .publisher-name {
      font-size: 11px;
      font-weight: 700;
      color: #111827;
      margin-top: 2px;
    }

    /* 2-Column Meta Table (Nomor Invoice & Tanggal Order) */
    table.two-col-meta {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
      margin-top: 8px;
      background: transparent;
    }
    td.two-col-cell {
      width: 50%;
      padding: 7px 12px;
      text-align: center;
      border: 1px solid #d1d5db;
      background: transparent;
    }
    .cell-lbl {
      font-size: 9.5px;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .cell-val {
      font-size: 11.5px;
      font-weight: 700;
      color: #111827;
    }
    .cell-val.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Tujuan Pengiriman */
    .shipping-section {
      margin-top: 10px;
    }
    .shipping-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .shipping-content {
      background: transparent;
      font-size: 10.5px;
      color: #1f2937;
      line-height: 1.4;
    }
    .shipping-recipient {
      font-size: 11px;
      color: #111827;
    }
    .shipping-address {
      font-size: 10px;
      color: #4b5563;
      margin-top: 2px;
    }

    /* Products Table */
    table.products-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      border: 1px solid #d1d5db;
      font-size: 10px;
      background: transparent;
    }
    table.products-table th {
      background: #ffffff;
      border: 1px solid #d1d5db;
      padding: 6px 7px;
      font-weight: 700;
      color: #374151;
      font-size: 9.5px;
    }
    table.products-table td {
      border: 1px solid #d1d5db;
      padding: 6px 7px;
      vertical-align: top;
      background: #ffffff;
    }
    table.products-table tr.total-row td {
      border-top: 1.5px solid #9ca3af;
      background: #f9fafb;
    }
    .product-title {
      font-weight: 700;
      font-size: 11px;
      color: #111827;
    }
    .product-specs {
      margin-top: 3px;
      font-size: 10px;
      color: #111827;
      line-height: 1.4;
    }
    .product-specs strong {
      color: #4b5563;
      font-size: 9.5px;
    }
    .spec-val {
      font-weight: 600;
      color: #111827;
    }

    .num-rp {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }

    /* Financial Summary (Right Aligned) */
    .summary-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .summary-table {
      width: 360px;
      font-size: 10.5px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2.5px 0;
      color: #1f2937;
    }
    .summary-row.bold {
      font-weight: 700;
      color: #111827;
    }
    .summary-row .lbl {
      color: #374151;
    }
    .summary-row.bold .lbl {
      color: #111827;
    }

    /* Rincian Tagihan */
    .section-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 4px;
    }
    .billing-section,
    .payment-section {
      margin-top: 10px;
    }
    .billing-grid {
      display: flex;
      gap: 10px;
      align-items: stretch;
    }
    .billing-box {
      flex: 1 1 50%;
      border: 1px solid #d1d5db;
      padding: 7px 10px 8px;
      background: #ffffff;
    }
    .billing-head {
      font-size: 8.5px;
      font-weight: 700;
      color: #6b7280;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }
    .billing-row {
      display: flex;
      gap: 6px;
      font-size: 10px;
      line-height: 1.5;
    }
    .billing-key {
      flex: 0 0 52px;
      color: #6b7280;
    }
    .billing-val {
      flex: 1 1 auto;
      font-weight: 600;
      color: #111827;
      word-break: break-word;
    }
    .billing-val.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
    }
    .bank-line {
      font-size: 10px;
      line-height: 1.45;
      padding: 2px 0;
    }
    .bank-line + .bank-line {
      border-top: 1px dashed #e5e7eb;
      margin-top: 2px;
      padding-top: 3px;
    }
    .bank-line .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .bank-holder {
      font-size: 9px;
      color: #6b7280;
    }
    .bank-empty {
      font-size: 10px;
      color: #9ca3af;
    }
    .scheme-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
      font-size: 10px;
    }
    .scheme-line .billing-key {
      flex: 0 0 auto;
    }
    .scheme-chip {
      border: 1px solid #d1d5db;
      border-radius: 3px;
      padding: 1px 7px;
      font-size: 9.5px;
      font-weight: 600;
      color: #374151;
      background: #f9fafb;
    }

    /* Riwayat Pembayaran */
    table.payment-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
      font-size: 10px;
      background: #ffffff;
    }
    table.payment-table th {
      border: 1px solid #d1d5db;
      padding: 5px 7px;
      font-size: 9px;
      font-weight: 700;
      color: #374151;
      text-align: left;
      background: #f9fafb;
    }
    table.payment-table td {
      border: 1px solid #d1d5db;
      padding: 5px 7px;
      vertical-align: top;
    }
    table.payment-table tr.pay-total td {
      background: #f9fafb;
      font-weight: 700;
      border-top: 1.5px solid #9ca3af;
    }
    .pay-label {
      font-weight: 600;
      color: #111827;
    }
    .pay-state {
      display: inline-block;
      margin-left: 5px;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .pay-state.ok { color: #16a34a; }
    .pay-state.wait { color: #d97706; }
    .pay-state.none { color: #9ca3af; }
    .pay-rek {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      color: #1f2937;
    }
    .pay-bank {
      font-weight: 600;
      color: #111827;
    }
    .pay-empty {
      font-size: 10px;
      color: #9ca3af;
      padding: 5px 2px 0;
    }

    /* Clean 1-Page Footer */
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      font-size: 9px;
      color: #9ca3af;
    }

    /* Print Overrides: Pure White 1-Page Output */
    @media print {
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .screen-toolbar {
        display: none !important;
      }
      .invoice-card {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      .billing-box,
      .payment-section,
      .summary-container,
      table.products-table {
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Toolbar (Only visible on browser screen) -->
  <div class="screen-toolbar no-print">
    <div class="toolbar-info">
      Pratinjau invoice <strong>${esc(orderNo)}</strong>
    </div>
    <div class="toolbar-actions">
      <button onclick="window.print()" class="btn-print">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        <span>Print</span>
      </button>
      <button onclick="window.close()" class="btn-close">
        Tutup
      </button>
    </div>
  </div>

  <!-- Printable Invoice Document -->
  <div class="invoice-card">

    <!-- Top Row: Title & Status Box -->
    <div class="top-row">
      <div>
        <div class="invoice-title">Invoice</div>
        
        <!-- Official Afatharshop Logo from Index (Transparent Background) -->
        <div class="brand-logo-wrap">
          <img src="/logo-nobg.png" alt="Afathar Shop" class="brand-logo-img" />
          <div class="brand-text">
            <div class="brand-name">AFATHAR SHOP</div>
            <div class="brand-sub">MOSLEM WOMENS NEEDS</div>
          </div>
        </div>
      </div>

      <div class="status-box ${statusClass}">
        ${statusText}
      </div>
    </div>

    <!-- Diterbitkan Oleh -->
    <div class="publisher-section">
      <div class="publisher-label">DITERBITKAN OLEH :</div>
      <div class="publisher-name">Afathar Shop Official</div>
    </div>

    <!-- Nomor Invoice & Tanggal Order -->
    <table class="two-col-meta">
      <tr>
        <td class="two-col-cell">
          <div class="cell-lbl">Nomor Invoice</div>
          <div class="cell-val mono">${esc(orderNo)}</div>
        </td>
        <td class="two-col-cell">
          <div class="cell-lbl">Tanggal Order</div>
          <div class="cell-val">${orderDate}</div>
        </td>
      </tr>
    </table>

    <!-- RINCIAN TAGIHAN: ditagihkan kepada & rekening tujuan -->
    <div class="billing-section">
      <div class="section-label">Rincian Tagihan</div>
      <div class="billing-grid">
        <div class="billing-box">
          <div class="billing-head">Ditagihkan Kepada</div>
          <div class="billing-row"><span class="billing-key">Nama</span><span class="billing-val">${esc(mitraName)}</span></div>
          ${mitraLevel ? `<div class="billing-row"><span class="billing-key">Level</span><span class="billing-val">${esc(mitraLevel)}</span></div>` : ''}
          ${mitraPhone ? `<div class="billing-row"><span class="billing-key">WhatsApp</span><span class="billing-val mono">${esc(mitraPhone)}</span></div>` : ''}
          ${mitraCity ? `<div class="billing-row"><span class="billing-key">Kota</span><span class="billing-val">${esc(mitraCity)}</span></div>` : ''}
          ${mitraEmail ? `<div class="billing-row"><span class="billing-key">Email</span><span class="billing-val">${esc(mitraEmail)}</span></div>` : ''}
        </div>
        <div class="billing-box">
          <div class="billing-head">Rekening Tujuan Transfer</div>
          ${
            activeBanks.length
              ? activeBanks
                  .map(
                    (b) => `<div class="bank-line">
            <span class="pay-bank">${esc(b.bank)}</span> <span class="mono">${esc(b.accountNo)}</span>
            <div class="bank-holder">a.n. ${esc(b.holder)}</div>
          </div>`
                  )
                  .join('')
              : '<div class="bank-empty">Rekening belum diatur oleh admin.</div>'
          }
        </div>
      </div>
      <div class="scheme-line">
        <span class="billing-key">Skema Pembayaran</span>
        ${schemeStages
          .map(
            (s) =>
              `<span class="scheme-chip">${esc(s.label)} · ${s.pct}%${
                s.date ? ` · ${formatOrderDate(s.date)}` : ''
              }</span>`
          )
          .join('')}
        <span class="scheme-chip">Total Tagihan · ${formatRupiah(totalDue)}</span>
      </div>
    </div>

    <!-- TUJUAN PENGIRIMAN -->
    <div class="shipping-section">
      <div class="shipping-label">TUJUAN PENGIRIMAN</div>
      <div class="shipping-content">
        <div class="shipping-recipient">
          <strong>${esc(recipientName)}</strong> ${recipientPhone ? `<span style="font-family: monospace;">(${esc(recipientPhone)})</span>` : ''}
        </div>
        <div class="shipping-address">${esc(recipientAddress)}</div>
      </div>
    </div>

    <!-- Products Table -->
    <table class="products-table">
      <thead>
        <tr>
          <th style="width: 25px; text-align: center;">No</th>
          <th style="text-align: left;">Nama Produk</th>
          <th style="width: 35px; text-align: center;">Qty</th>
          <th style="width: 85px; text-align: right;">Harga Ecer</th>
          ${totalDiscount > 0 ? '<th style="width: 85px; text-align: right;">Diskon Mitra</th>' : ''}
          <th style="width: 85px; text-align: right;">Harga Mitra</th>
          ${totalAddon > 0 ? '<th style="width: 85px; text-align: right;">Tambahan Harga</th>' : ''}
          <th style="width: 90px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item, index) => {
            const disc = Number(item.discountPct) || 0;
            const discNominal = Number(item.discountNominal) || 0;
            const netPrice = Number(item.netMitraPrice) || 0;
            const addon = Number(item.addon) || 0;
            const qtyItem = Number(item.qty) || 1;
            const itemSubtotal = Number(item.subtotal) || 0;
            const discLabel =
              discNominal > 0 ? `<span style="color: #b91c1c;">-${formatRupiah(discNominal)}</span>` : '<span style="color: #9ca3af;">&mdash;</span>';

            return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>
              <div class="product-title">${esc(item.title)}</div>
              <div class="product-specs">
                <strong>Varian:</strong> <span class="spec-val">${esc(item.variant)}</span>
                ${
                  item.color
                    ? `&nbsp;&bull;&nbsp;<strong>Warna:</strong> <span class="spec-val">${esc(item.color)}</span>`
                    : ''
                }
                ${
                  item.size
                    ? `&nbsp;&bull;&nbsp;<strong>Ukuran:</strong> <span class="spec-val">${esc(item.size)}</span>`
                    : ''
                }
              </div>
            </td>
            <td style="text-align: center; font-weight: 700;">${qtyItem}</td>
            <td class="num-rp">${formatRupiah(item.retailPrice)}</td>
            ${
              totalDiscount > 0
                ? '<td class="num-rp" style="color: #b91c1c;">' +
                  discLabel +
                  (disc > 0
                    ? '<div style="font-size: 8.5px; color: #9ca3af; text-align: right;">' + disc + '%</div>'
                    : '') +
                  '</td>'
                : ''
            }
            <td class="num-rp">${formatRupiah(netPrice)}</td>
            ${totalAddon > 0 ? '<td class="num-rp">' + (addon > 0 ? formatRupiah(addon * qtyItem) : '<span style="color: #9ca3af;">&mdash;</span>') + '</td>' : ''}
            <td class="num-rp" style="font-weight: 700; color: #111827;">${formatRupiah(itemSubtotal)}</td>
          </tr>
        `;
          })
          .join('')}
        <tr class="total-row">
          <td colspan="2" style="text-align: center; font-weight: 700; letter-spacing: 0.8px;">TOTAL</td>
          <td style="text-align: center; font-weight: 700;">${totalQty}</td>
          <td class="num-rp" style="font-weight: 700;">${formatRupiah(totalRetail)}</td>
          ${totalDiscount > 0 ? '<td class="num-rp" style="font-weight: 700; color: #b91c1c;">-' + formatRupiah(totalDiscount) + '</td>' : ''}
          <td class="num-rp" style="font-weight: 700;">${formatRupiah(totalRetail - totalDiscount)}</td>
          ${totalAddon > 0 ? '<td class="num-rp" style="font-weight: 700;">' + formatRupiah(totalAddon) + '</td>' : ''}
          <td class="num-rp" style="font-weight: 700; color: #111827;">${formatRupiah(totalPrice)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Financial Summary (Right Aligned) -->
    <div class="summary-container">
      <div class="summary-table">
        <div class="summary-row">
          <span class="lbl">Harga Ecer</span>
          <span class="val num-rp">${formatRupiah(totalRetail)}</span>
        </div>
        ${
          totalDiscount > 0
            ? `<div class="summary-row">
          <span class="lbl">Diskon Mitra</span>
          <span class="val num-rp" style="color: #b91c1c;">-${formatRupiah(totalDiscount)}</span>
        </div>`
            : ''
        }
        ${
          totalAddon > 0
            ? `<div class="summary-row">
          <span class="lbl">Tambahan Harga</span>
          <span class="val num-rp">${formatRupiah(totalAddon)}</span>
        </div>`
            : ''
        }
        <div class="summary-row">
          <span class="lbl">Total Pesanan</span>
          <span class="val num-rp" style="font-weight: 700;">${formatRupiah(totalPrice)}</span>
        </div>
        <div class="summary-row">
          <span class="lbl">Biaya Pengiriman</span>
          <span class="val num-rp">${ongkir > 0 ? formatRupiah(ongkir) : 'Rp 0'}</span>
        </div>
        <div class="summary-row bold">
          <span class="lbl">Total Pembayaran</span>
          <span class="val num-rp">${formatRupiah(totalDue)}</span>
        </div>
        ${
          paidAmount > 0
            ? `<div class="summary-row">
          <span class="lbl">Sudah Dibayar</span>
          <span class="val num-rp">${formatRupiah(paidAmount)}</span>
        </div>`
            : ''
        }
        <div class="summary-row bold">
          <span class="lbl">${isPaid ? 'Pelunasan' : 'Sisa Pembayaran'}</span>
          <span class="val num-rp">${formatRupiah(remainingAmount)}</span>
        </div>
      </div>
    </div>

    <!-- RIWAYAT PEMBAYARAN: tanggal, rekening, jumlah transfer -->
    <div class="payment-section">
      <div class="section-label">Riwayat Pembayaran</div>
      <table class="payment-table">
        <thead>
          <tr>
            <th style="width: 24px; text-align: center;">No</th>
            <th style="width: 82px;">Tanggal</th>
            <th style="width: 160px;">Rekening</th>
            <th>Keterangan</th>
            <th style="width: 100px; text-align: right;">Jumlah TF</th>
          </tr>
        </thead>
        <tbody>
          ${
            paymentRows.length
              ? paymentRows
                  .map((row, index) => {
                    const state = row.verified ? 'Terverifikasi' : row.waiting ? 'Menunggu Verifikasi' : 'Belum dibayar';
                    const stateClass = row.verified ? 'ok' : row.waiting ? 'wait' : 'none';
                    return `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${row.date ? formatOrderDate(row.date) : '&mdash;'}</td>
            <td class="pay-rek">${row.bank ? `${esc(row.bank)}<div>${esc(row.account)}</div>` : '&mdash;'}</td>
            <td><span class="pay-label">${esc(row.label)}</span><span class="pay-state ${stateClass}">${state}</span></td>
            <td class="num-rp" style="font-weight: 700;">${formatRupiah(row.amount)}</td>
          </tr>`;
                  })
                  .join('')
              : `<tr>
            <td colspan="5" style="text-align: center; color: #9ca3af;">Belum ada transfer tercatat untuk pesanan ini.</td>
          </tr>`
          }
          ${
            paymentRows.length
              ? `<tr class="pay-total">
            <td colspan="4" style="text-align: right; letter-spacing: 0.5px;">TOTAL TRANSFER</td>
            <td class="num-rp">${formatRupiah(totalTransfer)}</td>
          </tr>`
              : ''
          }
        </tbody>
      </table>
      <div class="pay-empty">
        Sisa tagihan: <strong style="color: #111827;">${formatRupiah(remainingAmount)}</strong>
        &nbsp;&middot;&nbsp; Status: <strong style="color: #111827;">${statusText}</strong>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="footer-row">
      <span></span>
      <span>1/1</span>
    </div>

  </div>

</body>
</html>`;

  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();
  } else {
    alert('Pop-up jendela baru diblokir oleh browser Anda. Mohon izinkan pop-up untuk mencetak invoice.');
  }
}
