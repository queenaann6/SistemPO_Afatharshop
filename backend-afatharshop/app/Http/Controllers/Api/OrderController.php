<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Installment;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Support\OrderSerializer;
use App\Support\TerminPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Daftar pesanan PO milik user yang sedang login.
     */
    public function index(Request $request)
    {
        $user = $request->user('api');

        $orders = Order::active()
            ->with(['items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments', 'address', 'user'])
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn (Order $order) => OrderSerializer::payload($order))
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Daftar Pesanan PO milik ' . ($user->nama ?? $user->name),
            'total'   => $orders->count(),
            'data'    => $orders,
        ], 200);
    }

    /**
     * Detail satu pesanan PO (hanya milik user login atau admin).
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $isAdmin = in_array($user->role ?? '', ['owner', 'finance', 'marketing'], true);

        $query = Order::active()
            ->with(['items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments', 'address', 'user'])
            ->where(function ($q) use ($id) {
                $q->where('id', $id)->orWhere('order_number', $id);
            });

        if (!$isAdmin) {
            $query->where('user_id', $user->id);
        }

        $order = $query->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => OrderSerializer::payload($order),
        ], 200);
    }

    /**
     * Detail invoice dari satu pesanan PO (milik user login atau admin).
     */
    public function invoice(Request $request, string $id)
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $isAdmin = in_array($user->role ?? '', ['owner', 'finance', 'marketing'], true);

        $order = Order::active()
            ->with([
                'items.variant.product.brand',
                'items.variant.product.batch',
                'items.address',
                'invoice.installments',
                'invoice.payments',
                'address',
                'user'
            ])
            ->where(function ($q) use ($id) {
                $q->where('id', $id)
                  ->orWhere('order_number', $id)
                  ->orWhereHas('invoice', fn ($iq) => $iq->where('id', $id)->orWhere('invoice_number', $id));
            });

        if (!$isAdmin) {
            $order->where('user_id', $user->id);
        }

        $result = $order->first();

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice atau pesanan tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail invoice berhasil dimuat.',
            'data'    => OrderSerializer::payload($result),
        ], 200);
    }

    /**
     * Pembatalan pesanan PO oleh pelanggan (mitra).
     */
    public function cancelOrder(Request $request, string $id)
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $isAdmin = in_array($user->role ?? '', ['owner', 'finance', 'marketing'], true);

        $query = Order::active()
            ->with(['invoice.installments', 'invoice.payments'])
            ->where(function ($q) use ($id) {
                $q->where('id', $id)->orWhere('order_number', $id);
            });

        if (!$isAdmin) {
            $query->where('user_id', $user->id);
        }

        $order = $query->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        $currentStatus = strtolower(trim((string) $order->status));
        $cancellableStatuses = [
            'open',
            'menunggu acc marketing',
            'draft',
            'menunggu dp',
            'menunggu pembayaran dp',
        ];

        // Cegah pembatalan mandiri jika sudah ada bukti pembayaran yang diverifikasi/disetujui
        $hasApprovedPayment = $order->payments()->where('payments.status', 'disetujui')->exists();
        if ($hasApprovedPayment && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan dengan pembayaran yang sudah disetujui tidak dapat dibatalkan secara mandiri. Silakan hubungi CS/Admin.',
            ], 422);
        }

        if (!in_array($currentStatus, $cancellableStatuses, true) && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => "Pesanan dengan status '{$order->status}' tidak dapat dibatalkan.",
            ], 422);
        }

        $cancelReason = trim((string) ($request->input('reason') ?? $request->input('cancel_reason') ?? 'Dibatalkan oleh pelanggan'));

        DB::transaction(function () use ($order, $user, $cancelReason) {
            $order->status = 'Dibatalkan';
            $order->marketing_status = 'REJECTED';
            $order->save();

            if ($order->invoice) {
                $order->invoice->status = 'batal';
                $order->invoice->save();
            }

            OrderStatusHistory::create([
                'order_id'   => $order->id,
                'status'     => 'Dibatalkan',
                'note'       => $cancelReason,
                'changed_by' => $user->id,
                'created_at' => now(),
            ]);
        });

        $fresh = $order->fresh(['items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments', 'address', 'user']);

        return response()->json([
            'success' => true,
            'message' => "Pesanan {$order->order_number} berhasil dibatalkan.",
            'data'    => OrderSerializer::payload($fresh),
        ], 200);
    }

    /**
     * Membuat pesanan PO baru beserta invoice dan 3 tahap pembayaran.
     */
    public function store(Request $request)
    {
        $rawItems = $request->input('items', []);
        if (is_array($rawItems)) {
            $rawItems = array_map(function ($item) {
                // Pastikan product_variant_id valid jika ada
                if (!empty($item['product_variant_id'])) {
                    $exists = ProductVariant::where('id', $item['product_variant_id'])->exists();
                    if (!$exists) {
                        $item['product_variant_id'] = null;
                    }
                }

                // Resolusi varian dari product_id jika variant_id kosong atau invalid
                if (empty($item['product_variant_id']) && !empty($item['product_id'])) {
                    $vQuery = ProductVariant::where('product_id', $item['product_id']);
                    if (!empty($item['model'])) $vQuery->where('model', $item['model']);
                    if (!empty($item['size'])) $vQuery->where('size', $item['size']);
                    if (!empty($item['color'])) $vQuery->where('color', $item['color']);
                    $item['product_variant_id'] = $vQuery->value('id') ?? ProductVariant::where('product_id', $item['product_id'])->value('id');

                    // Jika produk di database belum punya varian tersimpan, buat varian default otomatis
                    if (empty($item['product_variant_id'])) {
                        $prod = Product::find($item['product_id']);
                        if ($prod) {
                            $v = ProductVariant::create([
                                'product_id' => $prod->id,
                                'model'      => $item['model'] ?? 'Standar',
                                'size'       => $item['size'] ?? 'ALL',
                                'color'      => $item['color'] ?? 'Default',
                                'sku'        => 'SKU-' . strtoupper(Str::random(6)),
                                'stock'      => 100,
                                'price'      => $prod->price,
                                'is_active'  => true,
                            ]);
                            $item['product_variant_id'] = $v->id;
                        }
                    }
                }

                // Fallback varian aktif jika sama sekali belum terpetakan
                if (empty($item['product_variant_id'])) {
                    $item['product_variant_id'] = ProductVariant::whereHas('product', fn ($q) => $q->where('is_active', true))->value('id');
                }
                return $item;
            }, $rawItems);
            $request->merge(['items' => $rawItems]);
        }

        $validator = Validator::make($request->all(), [
            'total_amount'     => 'required|numeric|min:1000',
            'subtotal'         => 'nullable|numeric|min:0',
            'shipping_cost'    => 'nullable|numeric|min:0',
            'address_id'       => 'nullable|integer',
            'courier_name'     => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
            'is_split_address' => 'nullable|boolean',
            'items'            => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|integer',
            'items.*.quantity'           => 'required|integer|min:1',
            'items.*.unit_price'         => 'required|numeric|min:0',
            'items.*.fee'                => 'nullable|numeric',
            'items.*.discount_nominal'   => 'nullable|numeric',
            'items.*.addon_nominal'      => 'nullable|numeric',
            'items.*.subtotal'           => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi pemesanan gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = $request->user('api');

        if ($user && !in_array(strtolower(trim($user->level ?? $user->role ?? '')), User::MITRA_LEVELS, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Admin/Staff internal tidak dapat melakukan checkout di etalase toko. Silakan gunakan menu Input Pesanan Manual di Dashboard Purchasing.',
            ], 403);
        }

        if ($request->filled('address_id')) {
            $address = Address::where('user_id', $user->id)->find($request->address_id);
            if (!$address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Alamat pesanan bukan milik akun ini. Pilih alamat dari buku alamat kamu.',
                ], 422);
            }
        }

        $variants = ProductVariant::with('product')
            ->whereIn('id', collect($request->items)->pluck('product_variant_id'))
            ->get()
            ->keyBy('id');

        foreach ($request->items as $index => $item) {
            $variant = $variants->get($item['product_variant_id']);
            if (!$variant || !$variant->product || !$variant->product->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Varian produk pada item ke-' . ($index + 1) . ' tidak ditemukan atau sudah tidak aktif.',
                ], 422);
            }
            if ($variant->product->isClosedPo()) {
                return response()->json([
                    'success' => false,
                    'message' => "PO untuk produk {$variant->product->name} sudah ditutup dan tidak dapat dipesan.",
                ], 422);
            }
        }

        $totalAmount  = (float) $request->total_amount;
        $subtotal     = (float) ($request->subtotal ?? $totalAmount);
        $shippingCost = (float) ($request->shipping_cost ?? 0);

        $computedSubtotal = 0.0;
        $resolvedLines = [];
        $hasAnySplit = (bool) $request->input('is_split_address', false);
        foreach ($request->items as $item) {
            $amounts = OrderSerializer::resolveLineAmounts($item);
            $computedSubtotal += $amounts['subtotal'];
            $splits = $item['splits'] ?? null;
            $splitsJson = (is_array($splits) && count($splits) > 0) ? json_encode($splits) : null;
            if ($splitsJson !== null) {
                $hasAnySplit = true;
            }
            $itemAddressId = $item['address_id'] ?? $item['addressId'] ?? null;
            if (!$itemAddressId && is_array($splits) && !empty($splits[0]['address']['id'])) {
                $itemAddressId = (int) $splits[0]['address']['id'];
            }
            $resolvedLines[] = array_merge($amounts, [
                'product_variant_id' => $item['product_variant_id'],
                'address_id'         => $itemAddressId ? (int) $itemAddressId : null,
                'splits_data'        => $splitsJson,
            ]);
        }

        if ($computedSubtotal > 0 && abs($computedSubtotal - $subtotal) > 1) {
            $subtotal = round($computedSubtotal, 2);
        }

        if (abs(($subtotal + $shippingCost) - $totalAmount) > 1) {
            $totalAmount = round($subtotal + $shippingCost, 2);
        }

        $status = $request->input('status', 'Menunggu ACC Marketing');
        $marketingStatus = strtoupper(trim((string) $request->input('marketing_status', 'PENDING')));

        $createdOrder = DB::transaction(function () use ($request, $user, $status, $marketingStatus, $totalAmount, $subtotal, $shippingCost, $variants, $resolvedLines, $hasAnySplit) {
            $order = Order::create([
                'user_id'          => $user->id,
                'address_id'       => $request->address_id,
                'order_number'     => 'PO-' . date('Ymd') . '-' . strtoupper(Str::random(5)),
                'status'           => $status,
                'marketing_status' => $marketingStatus,
                'production_status'=> 'Antrian',
                'courier_name'     => $request->courier_name ?: ($request->input('atur_sebelum_kirim', true) ? 'Ditentukan Sebelum Pengiriman' : null),
                'notes'            => $request->notes,
                'is_split_address' => $hasAnySplit,
                'subtotal'         => $subtotal,
                'shipping_cost'    => $shippingCost,
                'total_amount'     => $totalAmount,
                'ordered_at'       => now(),
            ]);

            OrderStatusHistory::create([
                'order_id'   => $order->id,
                'status'     => 'Open',
                'note'       => 'Pesanan dibuat mitra (' . $status . ')',
                'changed_by' => $user->id,
                'created_at' => now(),
            ]);

            foreach ($resolvedLines as $line) {
                OrderItem::create([
                    'order_id'           => $order->id,
                    'address_id'         => $line['address_id'],
                    'product_variant_id' => $line['product_variant_id'],
                    'quantity'           => $line['quantity'],
                    'unit_price'         => $line['unit_price'],
                    'fee'                => $line['fee'],
                    'discount_nominal'   => $line['discount_nominal'],
                    'addon_nominal'      => $line['addon_nominal'],
                    'subtotal'           => $line['subtotal'],
                    'splits_data'        => $line['splits_data'],
                    'created_at'         => now(),
                ]);
            }

            $invoice = Invoice::create([
                'order_id'           => $order->id,
                'invoice_number'     => 'INV/' . date('Y/m') . '/' . str_pad((string) $order->id, 5, '0', STR_PAD_LEFT),
                'total_amount'       => $totalAmount,
                'paid_amount'        => 0,
                'outstanding_amount' => $totalAmount,
                'status'             => 'belum_lunas',
                'due_at'             => now()->addDays(3),
            ]);

            $product = $variants->first()?->product;

            $plan = TerminPlan::split($subtotal, TerminPlan::forProduct($product, null, now()));

            foreach ($plan as $stage) {
                Installment::create([
                    'invoice_id'      => $invoice->id,
                    'type'            => $stage['type'],
                    'sequence_number' => $stage['sequence'],
                    'amount'          => $stage['amount'],
                    'paid_amount'     => 0,
                    'status'          => 'belum_bayar',
                    'due_at'          => $stage['due_at'],
                ]);
            }

            // Hapus item yang dipesan dari keranjang belanja user di database
            $cart = Cart::where('user_id', $user->id)->first();
            if ($cart) {
                $orderedVariantIds = collect($request->items)->pluck('product_variant_id')->filter()->all();
                if (!empty($orderedVariantIds)) {
                    CartItem::where('cart_id', $cart->id)
                        ->whereIn('product_variant_id', $orderedVariantIds)
                        ->delete();
                }
            }

            return $order->load(['items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments', 'address', 'user']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Pesanan PO berhasil disimpan.',
            'data'    => OrderSerializer::payload($createdOrder),
        ], 201);
    }

    /**
     * Memperbarui alamat pengiriman dan jasa kirim pesanan oleh mitra setelah barang Ready.
     */
    public function updateAddress(Request $request, string $id)
    {
        $user = $request->user('api');
        $order = Order::active()
            ->where('user_id', $user->id)
            ->where(function ($q) use ($id) {
                $q->where('id', $id)->orWhere('order_number', $id);
            })
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        // Alamat dropship terkunci setelah mitra mengonfirmasi dan selama
        // menunggu Admin Finance menginput ongkir. Status 'Menunggu Input Ongkir'
        // menandakan konfirmasi sudah dikirim; perubahan susulan ditolak agar
        // data alamat & alokasi barang tidak bergerak selama penimbangan.
        $currentStatus = strtolower(trim((string) $order->status));
        $addressLocked = $currentStatus === 'menunggu input ongkir'
            || $currentStatus === 'pengisian alamat'
            || (float) $order->shipping_cost > 0
            || str_contains($currentStatus, 'pelunasan')
            || str_contains($currentStatus, 'siap kirim')
            || str_contains($currentStatus, 'dikirim')
            || str_contains($currentStatus, 'selesai');

        if ($addressLocked) {
            return response()->json([
                'success' => false,
                'message' => 'Alamat pengiriman sudah terkunci. Menunggu Admin menginput ongkos kirim sebelum pesanan dapat diubah kembali.',
            ], 423);
        }

        $validator = Validator::make($request->all(), [
            'address_id'       => 'nullable',
            'courier_name'     => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
            'is_split_address' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi alamat gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if ($request->has('address_id')) {
            $addrId = $request->input('address_id');
            if ($addrId && is_numeric($addrId)) {
                $exists = Address::where('id', (int) $addrId)->where('user_id', $user->id)->exists();
                $order->address_id = $exists ? (int) $addrId : null;
            } else {
                $order->address_id = null;
            }
        }
        if ($request->has('courier_name')) {
            $order->courier_name = $request->courier_name;
        }
        if ($request->has('notes')) {
            $order->notes = $request->notes;
        }
        if ($request->has('is_split_address')) {
            $order->is_split_address = (bool) $request->is_split_address;
        }

        $order->status = 'Menunggu Input Ongkir';
        $order->save();

        OrderStatusHistory::create([
            'order_id'   => $order->id,
            'status'     => 'Pengisian Alamat',
            'note'       => 'Alamat pengiriman dikonfirmasi mitra. Menunggu input ongkir Admin.',
            'changed_by' => $user->id,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Alamat pengiriman berhasil dikonfirmasi. Menunggu input ongkir Admin.',
            'data'    => OrderSerializer::payload($order->fresh(['items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments', 'address', 'user'])),
        ], 200);
    }

    /**
     * Memperbarui pesanan PO (tambah/ubah/hapus item, split alamat, kurir, catatan) oleh mitra atau admin.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $order = Order::active()
            ->with(['items.variant.product', 'invoice.installments', 'invoice.payments'])
            ->where(function ($q) use ($id) {
                $q->where('id', $id)->orWhere('order_number', $id);
            })
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        $isAdmin = in_array($user->role ?? '', ['owner', 'finance', 'marketing'], true);
        if (!$isAdmin && (int) $order->user_id !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki hak untuk mengubah pesanan ini.',
            ], 403);
        }

        $currentStatus = strtolower(trim((string) $order->status));
        if (in_array($currentStatus, ['selesai', 'batal', 'dikirim', 'terkirim'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan yang sudah ' . $order->status . ' tidak dapat diubah kembali.',
            ], 422);
        }

        // 1. Alamat dasar & kurir & catatan
        if ($request->has('address_id')) {
            $addrId = $request->input('address_id');
            if ($addrId && is_numeric($addrId)) {
                $exists = Address::where('id', (int) $addrId)->exists();
                $order->address_id = $exists ? (int) $addrId : null;
            } else {
                $order->address_id = null;
            }
        }
        if ($request->filled('courier_name')) {
            $order->courier_name = trim((string) $request->courier_name);
        } elseif ($request->filled('ekspedisi')) {
            $order->courier_name = trim((string) $request->ekspedisi);
        }
        if ($request->has('notes')) {
            $order->notes = $request->notes;
        }
        if ($request->has('is_split_address')) {
            $order->is_split_address = (bool) $request->is_split_address;
        }
        // Hanya admin/tim operasional yang berhak mengubah ongkos kirim secara manual
        if ($isAdmin && $request->has('shipping_cost')) {
            $order->shipping_cost = max(0, (float) $request->shipping_cost);
        }

        // 2. Pembaruan item & split alokasi
        $rawItems = $request->input('items');
        if (is_array($rawItems)) {
            if (count($rawItems) === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pesanan minimal harus memiliki 1 item produk.',
                ], 422);
            }

            $variantIds = [];
            foreach ($rawItems as $it) {
                $vId = $it['product_variant_id'] ?? $it['variantId'] ?? $it['variant_id'] ?? null;
                if ($vId && is_numeric($vId)) {
                    $variantIds[] = (int) $vId;
                }
            }
            $existingVariants = ProductVariant::with('product')
                ->whereIn('id', $variantIds)
                ->get()
                ->keyBy('id');

            $fallbackProduct = $order->items->first()?->variant?->product;

            $newItemsData = [];
            $computedSubtotal = 0.0;
            $hasAnySplit = false;

            foreach ($rawItems as $item) {
                $vId = $item['product_variant_id'] ?? $item['variantId'] ?? $item['variant_id'] ?? null;
                $variant = ($vId && is_numeric($vId)) ? $existingVariants->get((int) $vId) : null;

                if (!$variant) {
                    $pId = $item['product_id'] ?? $item['productId'] ?? $fallbackProduct?->id;
                    if ($pId) {
                        $model = $item['variation'] ?? $item['model'] ?? null;
                        $size = $item['size'] ?? null;
                        $color = $item['color'] ?? null;
                        $variant = ProductVariant::where('product_id', $pId)
                            ->when($model, fn ($q) => $q->where('model', $model))
                            ->when($size, fn ($q) => $q->where('size', $size))
                            ->when($color, fn ($q) => $q->where('color', $color))
                            ->first();

                        if (!$variant) {
                            $variant = ProductVariant::where('product_id', $pId)->first();
                        }
                    }
                }

                if (!$variant) {
                    $variant = ProductVariant::whereHas('product', fn ($q) => $q->where('is_active', true))->first();
                }

                $qty = max(1, (int) ($item['quantity'] ?? $item['qty'] ?? 1));
                $unitPrice = $isAdmin
                    ? (float) ($item['unit_price'] ?? $item['price'] ?? $variant?->price ?? 0)
                    : (float) ($variant?->price ?? 0);
                $fee = (float) ($item['fee'] ?? $item['feeNominal'] ?? 0);
                $discountNominal = (float) ($item['discount_nominal'] ?? $item['discountNominal'] ?? 0);
                $addonNominal = (float) ($item['addon_nominal'] ?? $item['addonNominal'] ?? 0);
                $lineSubtotal = (float) ($item['subtotal'] ?? ($unitPrice * $qty - $discountNominal + $addonNominal));

                $splits = $item['splits'] ?? null;
                $splitsJson = null;
                $itemAddressId = $item['address_id'] ?? $item['addressId'] ?? null;

                if (is_array($splits) && count($splits) > 0) {
                    $splitsJson = json_encode($splits);
                    $hasAnySplit = true;
                    if (!$itemAddressId && !empty($splits[0]['address']['id'])) {
                        $itemAddressId = (int) $splits[0]['address']['id'];
                    }
                }

                $computedSubtotal += $lineSubtotal;

                $newItemsData[] = [
                    'order_id'           => $order->id,
                    'address_id'         => $itemAddressId ? (int) $itemAddressId : null,
                    'product_variant_id' => $variant?->id,
                    'quantity'           => $qty,
                    'unit_price'         => $unitPrice,
                    'fee'                => $fee,
                    'discount_nominal'   => $discountNominal,
                    'addon_nominal'      => $addonNominal,
                    'subtotal'           => $lineSubtotal,
                    'splits_data'        => $splitsJson,
                    'created_at'         => now(),
                ];
            }

            DB::transaction(function () use ($order, $newItemsData, $computedSubtotal, $hasAnySplit, $user) {
                // Hapus item lama dan simpan item baru
                OrderItem::where('order_id', $order->id)->delete();
                foreach ($newItemsData as $d) {
                    OrderItem::create($d);
                }

                $order->subtotal = $computedSubtotal;
                $order->total_amount = $computedSubtotal + (float) $order->shipping_cost;
                if ($hasAnySplit) {
                    $order->is_split_address = true;
                }
                $order->save();

                // Sinkronisasi invoice & installments
                $invoice = $order->invoice;
                if ($invoice) {
                    $invoice->total_amount = $order->total_amount;

                    $dpInstallment = $invoice->installments()->where('type', 'dp')->first();
                    $pelunasanInstallment = $invoice->installments()->where('type', 'pelunasan')->first();

                    if ($dpInstallment && $dpInstallment->status === 'lunas') {
                        if ($pelunasanInstallment) {
                            $pelunasanInstallment->amount = max(0, $computedSubtotal - (float) $dpInstallment->amount);
                            $pelunasanInstallment->save();
                        }
                    } else {
                        $firstProduct = $order->items()->first()?->variant?->product;
                        $plan = TerminPlan::split($computedSubtotal, TerminPlan::forProduct($firstProduct, null, now()));
                        foreach ($plan as $stage) {
                            $inst = $invoice->installments()->where('type', $stage['type'])->first();
                            if ($inst) {
                                $inst->amount = $stage['amount'];
                                $inst->save();
                            }
                        }
                    }

                    $installmentPaid = (float) $invoice->installments()->sum('paid_amount');
                    $stagelessPaid = (float) Payment::where('invoice_id', $invoice->id)->whereNull('installment_id')->where('status', 'disetujui')->sum('amount');
                    $invoice->paid_amount = round($installmentPaid + $stagelessPaid, 2);
                    $invoice->outstanding_amount = max(0, round($invoice->total_amount - $invoice->paid_amount, 2));
                    $invoice->status = ($invoice->total_amount > 0 && $invoice->outstanding_amount <= 0) ? 'lunas' : 'belum_lunas';
                    $invoice->save();
                }

                OrderStatusHistory::create([
                    'order_id'   => $order->id,
                    'status'     => $order->status,
                    'note'       => 'Rincian item pesanan diperbarui (' . count($newItemsData) . ' varian)',
                    'changed_by' => $user?->id,
                    'created_at' => now(),
                ]);
            });
        } else {
            $order->save();
        }

        $fresh = $order->fresh(['items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments', 'address', 'user']);

        return response()->json([
            'success' => true,
            'message' => "Pesanan {$order->order_number} berhasil diperbarui.",
            'data'    => OrderSerializer::payload($fresh),
        ], 200);
    }
}
