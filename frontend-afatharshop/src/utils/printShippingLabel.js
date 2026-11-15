const num = (v) => Number(v || 0);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolveMainAddressParts = (order = {}) => {
  const ao = order.addressObject || null;
  const rawAddr = order.address;
  const obj = typeof rawAddr === 'object' && rawAddr !== null ? rawAddr : null;

  const recipient = ao?.recipient || obj?.recipient || order.mitraName || '-';
  const phone = ao?.phone || obj?.phone || order.phone || order._projectMeta?.mitraPhone || '-';
  const fullAddress =
    ao?.address ||
    (obj
      ? [
          obj.street,
          obj.subdistrict ? `Kel. ${obj.subdistrict}` : obj.kelurahan,
          obj.district ? `Kec. ${obj.district}` : obj.kecamatan,
          obj.city,
          obj.province,
          obj.postalCode,
          obj.note
        ]
          .filter(Boolean)
          .join(', ')
      : typeof rawAddr === 'string'
      ? rawAddr
      : '');

  return {
    recipient,
    phone,
    address: fullAddress || '-'
  };
};

const formatSplitAddress = (addr = {}) => {
  if (!addr) return '-';
  if (addr.address) return addr.address;
  return (
    [
      addr.street,
      addr.subdistrict ? `Kel. ${addr.subdistrict}` : addr.kelurahan,
      addr.district ? `Kec. ${addr.district}` : addr.kecamatan,
      addr.city,
      addr.province,
      addr.postalCode,
      addr.note
    ]
      .filter(Boolean)
      .join(', ') || '-'
  );
};

export function extractOrderShippingLabels(order) {
  if (!order) return [];

  const orderItems = order._projectMeta?.items || [];
  const mainAddr = resolveMainAddressParts(order);

  // Kelompokkan split alamat
  const splitMap = new Map();
  orderItems.forEach((item) => {
    (item.splits || []).forEach((sp) => {
      const key = String(sp.address?.id ?? sp.address?.recipient ?? sp.id);
      if (!splitMap.has(key)) {
        splitMap.set(key, { address: sp.address || {}, courier: sp.courier || null, rows: [] });
      }
      const group = splitMap.get(key);
      group.rows.push({ item, split: sp });
      if (sp.courier) group.courier = sp.courier;
    });
  });
  const splitGroups = [...splitMap.values()];

  const mainRemainder = orderItems
    .map((item) => {
      const allocated = (item.splits || []).reduce((sum, sp) => sum + (Number(sp.qty) || 0), 0);
      const qty = Math.max(0, (Number(item.qty) || 1) - allocated);
      return qty > 0 ? { item, qty } : null;
    })
    .filter(Boolean);

  const labels = [];

  if (splitGroups.length === 0) {
    const items = orderItems.length
      ? orderItems.map((it) => ({
          title: it.title || order.produk || 'Produk PO',
          variant: it.variant || '',
          qty: Math.max(1, num(it.qty))
        }))
      : [
          {
            title: order.produk || 'Produk PO',
            variant: order.variant || '',
            qty: Math.max(1, num(order.qty))
          }
        ];

    labels.push({
      key: `${order.invoice || 'INV'}-main`,
      labelTitle: 'Alamat Utama',
      invoice: order.invoice || '-',
      date: order.date || '',
      courier: order.ekspedisi || '-',
      trackingNumber: order.resi || '',
      recipientName: mainAddr.recipient,
      recipientPhone: mainAddr.phone,
      recipientAddress: mainAddr.address,
      senderName: order.senderName || order.mitraName || 'Afatharshop',
      senderPhone: order.senderPhone || order.phone || order._projectMeta?.mitraPhone || '-',
      senderNotes: order.senderNotes || '',
      items
    });
    return labels;
  }

  if (mainRemainder.length > 0) {
    labels.push({
      key: `${order.invoice || 'INV'}-main-rem`,
      labelTitle: 'Alamat Utama',
      invoice: order.invoice || '-',
      date: order.date || '',
      courier: order.ekspedisi || '-',
      trackingNumber: order.resi || '',
      recipientName: mainAddr.recipient,
      recipientPhone: mainAddr.phone,
      recipientAddress: mainAddr.address,
      senderName: order.senderName || order.mitraName || 'Afatharshop',
      senderPhone: order.senderPhone || order.phone || order._projectMeta?.mitraPhone || '-',
      senderNotes: order.senderNotes || '',
      items: mainRemainder.map(({ item, qty }) => ({
        title: item.title || order.produk || 'Produk PO',
        variant: item.variant || '',
        qty
      }))
    });
  }

  splitGroups.forEach((group, idx) => {
    const dropship = group.rows.find(
      (r) => r.split?.senderName || r.split?.senderPhone || r.split?.senderNotes
    );
    labels.push({
      key: `${order.invoice || 'INV'}-split-${idx}`,
      labelTitle:
        splitGroups.length > 1 || mainRemainder.length > 0
          ? `Alamat #${labels.length + 1}`
          : 'Alamat Pengiriman',
      invoice: order.invoice || '-',
      date: order.date || '',
      courier: group.courier?.name || order.ekspedisi || '-',
      trackingNumber: order.resi || '',
      recipientName: group.address?.recipient || group.address?.name || mainAddr.recipient,
      recipientPhone: group.address?.phone || mainAddr.phone,
      recipientAddress: formatSplitAddress(group.address),
      senderName: dropship?.split?.senderName || order.senderName || order.mitraName || 'Afatharshop',
      senderPhone:
        dropship?.split?.senderPhone ||
        order.senderPhone ||
        order.phone ||
        order._projectMeta?.mitraPhone ||
        '-',
      senderNotes: dropship?.split?.senderNotes || order.senderNotes || '',
      items: group.rows.map(({ item, split }) => ({
        title: item.title || order.produk || 'Produk PO',
        variant: item.variant || '',
        qty: Math.max(1, num(split?.qty))
      }))
    });
  });

  return labels;
}

export function formatShippingLabelText(label) {
  if (!label) return '';
  const itemLines = (label.items || []).map(
    (it) => `- ${it.title}${it.variant ? ` (${it.variant})` : ''} x ${it.qty} pcs`
  );
  const lines = [
    `[${label.invoice}] ${label.labelTitle}${label.courier && label.courier !== '-' ? ` — ${label.courier}` : ''}`,
    `Penerima : ${label.recipientName || '-'}`,
    `HP       : ${label.recipientPhone || '-'}`,
    `Alamat   : ${label.recipientAddress || '-'}`,
    `Pengirim : ${label.senderName || '-'}`,
    `HP       : ${label.senderPhone || '-'}`
  ];
  if (label.senderNotes) {
    lines.push(`Catatan  : ${label.senderNotes}`);
  }
  if (label.trackingNumber) {
    lines.push(`No. Resi : ${label.trackingNumber}`);
  }
  lines.push('Orderan  :');
  lines.push(...(itemLines.length ? itemLines : ['- -']));
  return lines.join('\n');
}

export function formatAllShippingLabelsText(order) {
  const labels = extractOrderShippingLabels(order);
  return labels.map((l) => formatShippingLabelText(l)).join('\n\n────────────────────────\n\n');
}

export function buildShippingLabelsHTML(order, singleLabelKey = null) {
  const allLabels = extractOrderShippingLabels(order);
  const labels = singleLabelKey
    ? allLabels.filter((l) => l.key === singleLabelKey)
    : allLabels;

  const cardsHtml = labels
    .map((label, idx) => {
      const itemsHtml = (label.items || [])
        .map(
          (it) => `
          <tr>
            <td>${escapeHtml(it.title)}${it.variant ? ` <span class="variant">(${escapeHtml(it.variant)})</span>` : ''}</td>
            <td class="qty">${escapeHtml(it.qty)} pcs</td>
          </tr>`
        )
        .join('');

      return `
      <div class="label-card">
        <div class="card-top">
          <div>
            <div class="brand">AFATHARSHOP</div>
            <div class="inv">${escapeHtml(label.invoice)} · ${escapeHtml(label.labelTitle)} (${idx + 1}/${labels.length})</div>
          </div>
          <div class="courier-box">
            <div class="courier-label">EKSPEDISI</div>
            <div class="courier-name">${escapeHtml(label.courier || '-')}</div>
            ${label.trackingNumber ? `<div class="resi">Resi: ${escapeHtml(label.trackingNumber)}</div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">PENERIMA</div>
          <div class="person-name">${escapeHtml(label.recipientName || '-')}</div>
          <div class="person-phone">HP: ${escapeHtml(label.recipientPhone || '-')}</div>
          <div class="person-addr">${escapeHtml(label.recipientAddress || '-')}</div>
        </div>

        <div class="section sender-sec">
          <div class="section-title">PENGIRIM</div>
          <div class="person-name">${escapeHtml(label.senderName || '-')}</div>
          <div class="person-phone">HP: ${escapeHtml(label.senderPhone || '-')}</div>
          ${label.senderNotes ? `<div class="notes">Catatan: ${escapeHtml(label.senderNotes)}</div>` : ''}
        </div>

        <div class="section order-sec">
          <div class="section-title">ORDERAN (${label.items.reduce((s, i) => s + i.qty, 0)} pcs)</div>
          <table class="items-tbl">
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Label Pengiriman - ${escapeHtml(order?.invoice || '')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f3f4f6;
      color: #111827;
      padding: 20px;
    }
    .toolbar {
      max-width: 900px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .toolbar-title { font-size: 14px; font-weight: 700; }
    .toolbar-sub { font-size: 12px; color: #6b7280; }
    .btn-print {
      background: #6B1416;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .grid {
      max-width: 900px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 16px;
    }
    .label-card {
      background: #ffffff;
      border: 2px solid #111827;
      border-radius: 8px;
      padding: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 2px dashed #d1d5db;
    }
    .brand { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; color: #6B1416; }
    .inv { font-size: 11px; color: #4b5563; margin-top: 2px; font-weight: 600; }
    .courier-box { text-align: right; }
    .courier-label { font-size: 9px; font-weight: 700; color: #6b7280; letter-spacing: 0.5px; }
    .courier-name { font-size: 13px; font-weight: 800; color: #111827; }
    .resi { font-size: 11px; font-family: monospace; color: #111827; margin-top: 2px; }
    .section { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .section:last-child { border-bottom: none; padding-bottom: 0; }
    .section-title { font-size: 10px; font-weight: 800; letter-spacing: 0.6px; color: #6b7280; margin-bottom: 4px; }
    .person-name { font-size: 14px; font-weight: 800; color: #111827; }
    .person-phone { font-size: 12px; font-weight: 700; color: #1f2937; margin-top: 2px; }
    .person-addr { font-size: 12px; color: #374151; line-height: 1.45; margin-top: 4px; }
    .notes { font-size: 11px; color: #92400e; background: #fffbeb; padding: 4px 8px; border-radius: 4px; margin-top: 5px; }
    .items-tbl { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .items-tbl td { font-size: 12px; padding: 3px 0; vertical-align: top; border-bottom: 1px dotted #e5e7eb; }
    .items-tbl tr:last-child td { border-bottom: none; }
    .variant { color: #6b7280; font-size: 11px; }
    .qty { text-align: right; font-weight: 800; white-space: nowrap; padding-left: 8px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none; }
      .grid { max-width: 100%; grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .label-card { border-width: 1.5px; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <div class="toolbar-title">Label Pengiriman · ${escapeHtml(order?.invoice || '-')}</div>
      <div class="toolbar-sub">${labels.length} alamat tujuan · Siap cetak</div>
    </div>
    <button class="btn-print" onclick="window.print()">Cetak Label</button>
  </div>
  <div class="grid">${cardsHtml}</div>
</body>
</html>`;
}

export function openShippingLabelsPrintTab(order, singleLabelKey = null) {
  if (!order) return;
  const html = buildShippingLabelsHTML(order, singleLabelKey);
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();
  } else {
    alert('Pop-up jendela baru diblokir oleh browser Anda. Mohon izinkan pop-up untuk mencetak label pengiriman.');
  }
}
