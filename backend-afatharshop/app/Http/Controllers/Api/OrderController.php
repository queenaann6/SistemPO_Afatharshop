<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Installment;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\ProductVariant;
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

        $orders = Order::with(['items.variant.product.brand', 'items.variant.product.batch', 'invoice.installments', 'invoice.payments', 'address', 'user'])
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar Pesanan PO milik ' . ($user->nama ?? $user->name),
            'total'   => $orders->count(),
            'data'    => $orders,
        ], 200);
    }

    /**
     * Detail satu pesanan PO (hanya milik user login).
     */
    public function show(Request $request, string $id)
    {
        $order = Order::with(['items.variant.product.brand', 'items.variant.product.batch', 'invoice.installments', 'invoice.payments', 'address', 'user'])
            ->where('user_id', $request->user('api')->id)
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

        return response()->json([
            'success' => true,
            'data'    => $order,
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
                if (empty($item['product_variant_id']) && !empty($item['product_id'])) {
                    $item['product_variant_id'] = ProductVariant::where('product_id', $item['product_id'])->value('id');
                }
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
            'items.*.fee'                => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi pemesanan gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = $request->user('api');

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
        }

        $totalAmount  = (float) $request->total_amount;
        $subtotal     = (float) ($request->subtotal ?? $totalAmount);
        $shippingCost = (float) ($request->shipping_cost ?? 0);

        $computedSubtotal = 0.0;
        foreach ($request->items as $item) {
            $computedSubtotal += (float) $item['unit_price'] * (int) $item['quantity'] + (float) ($item['fee'] ?? 0);
        }

        if ($computedSubtotal > 0 && abs($computedSubtotal - $subtotal) > 1) {
            $subtotal = $computedSubtotal;
        }

        if (abs(($subtotal + $shippingCost) - $totalAmount) > 1) {
            $totalAmount = $subtotal + $shippingCost;
        }

        $status = $request->input('status', 'Menunggu ACC Marketing');

        $createdOrder = DB::transaction(function () use ($request, $user, $status, $totalAmount, $subtotal, $shippingCost, $variants) {
            $order = Order::create([
                'user_id'          => $user->id,
                'address_id'       => $request->address_id,
                'order_number'     => 'PO-' . date('Ymd') . '-' . strtoupper(Str::random(5)),
                'status'           => $status,
                'courier_name'     => $request->courier_name,
                'notes'            => $request->notes,
                'is_split_address' => (bool) $request->input('is_split_address', false),
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

            foreach ($request->items as $item) {
                OrderItem::create([
                    'order_id'           => $order->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity'           => (int) $item['quantity'],
                    'unit_price'         => (float) $item['unit_price'],
                    'fee'                => (float) ($item['fee'] ?? 0),
                    'subtotal'           => (float) $item['unit_price'] * (int) $item['quantity'],
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
            $productStages = $product?->payment_stages;
            if (is_string($productStages)) {
                $productStages = json_decode($productStages, true);
            }

            $stages = [];
            if (is_array($productStages) && count($productStages) >= 2) {
                $totalStages = count($productStages);
                foreach ($productStages as $idx => $stg) {
                    $pct = (float) ($stg['pct'] ?? 0) / 100;
                    $isFirst = $idx === 0;
                    $isLast = $idx === $totalStages - 1;
                    $type = $isFirst ? 'dp' : ($isLast ? 'pelunasan' : ('cicilan_' . $idx));
                    $dueDays = $isFirst ? 3 : ($isLast ? 60 : (30 * $idx));
                    if (!empty($stg['date'])) {
                        try {
                            $diff = now()->diffInDays(\Carbon\Carbon::parse($stg['date']), false);
                            if ($diff > 0) $dueDays = $diff;
                        } catch (\Throwable $e) {}
                    }
                    $stages[] = [
                        'type'            => $type,
                        'sequence_number' => $idx + 1,
                        'percent'         => $pct,
                        'due_days'        => $dueDays,
                    ];
                }
            } else {
                $dpPercent = (int) ($product?->min_dp_percent ?? 25);
                $dpPercent = max(10, min(90, $dpPercent));
                $cicilanPercent = max(0, 100 - $dpPercent - 25);

                if ($cicilanPercent > 0) {
                    $stages = [
                        ['type' => 'dp', 'sequence_number' => 1, 'percent' => $dpPercent / 100, 'due_days' => 3],
                        ['type' => 'cicilan', 'sequence_number' => 2, 'percent' => $cicilanPercent / 100, 'due_days' => 30],
                        ['type' => 'pelunasan', 'sequence_number' => 3, 'percent' => (100 - $dpPercent - $cicilanPercent) / 100, 'due_days' => 60],
                    ];
                } else {
                    $stages = [
                        ['type' => 'dp', 'sequence_number' => 1, 'percent' => $dpPercent / 100, 'due_days' => 3],
                        ['type' => 'pelunasan', 'sequence_number' => 2, 'percent' => (100 - $dpPercent) / 100, 'due_days' => 30],
                    ];
                }
            }

            $allocated = 0;
            foreach ($stages as $index => $stage) {
                $isLast = $index === count($stages) - 1;
                $amount = $isLast
                    ? round($totalAmount - $allocated, 2)
                    : round($totalAmount * $stage['percent'], 2);
                $allocated += $amount;

                Installment::create([
                    'invoice_id'      => $invoice->id,
                    'type'            => $stage['type'],
                    'sequence_number' => $stage['sequence_number'],
                    'amount'          => $amount,
                    'paid_amount'     => 0,
                    'status'          => 'belum_bayar',
                    'due_at'          => now()->addDays($stage['due_days']),
                ]);
            }

            return $order->load(['items.variant.product.brand', 'invoice.installments', 'invoice.payments', 'address', 'user']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Pesanan PO berhasil disimpan.',
            'data'    => $createdOrder,
        ], 201);
    }

    /**
     * Memperbarui alamat pengiriman dan jasa kirim pesanan oleh mitra setelah barang Ready.
     */
    public function updateAddress(Request $request, string $id)
    {
        $user = $request->user('api');
        $order = Order::where('user_id', $user->id)
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
            'data'    => $order->load(['items.variant.product.brand', 'invoice.installments', 'invoice.payments', 'address', 'user']),
        ], 200);
    }
}
