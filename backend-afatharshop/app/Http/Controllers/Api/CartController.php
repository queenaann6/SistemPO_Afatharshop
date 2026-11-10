<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CartController extends Controller
{
    /**
     * Dapatkan keranjang belanja user yang sedang login beserta seluruh item produk.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $cart = Cart::firstOrCreate(['user_id' => $user->id]);
        $cart->load([
            'items.variant.product.brand',
            'items.variant.product.batch',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Keranjang belanja ' . ($user->nama ?? $user->name),
            'cart_id' => $cart->id,
            'data'    => $this->formatCartItems($cart),
        ], 200);
    }

    /**
     * Tambah produk varian ke keranjang user.
     */
    public function addItem(Request $request): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'product_variant_id' => 'nullable|integer',
            'product_id'         => 'nullable|integer',
            'quantity'           => 'nullable|integer|min:1',
            'order_type'         => 'nullable|string|in:dp,full',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi item keranjang gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $variantId = $request->product_variant_id;
        if (!$variantId && $request->filled('product_id')) {
            $vQuery = ProductVariant::where('product_id', $request->product_id);
            if ($request->filled('model')) {
                $vQuery->where('model', $request->model);
            }
            if ($request->filled('size')) {
                $vQuery->where('size', $request->size);
            }
            if ($request->filled('color')) {
                $vQuery->where('color', $request->color);
            }
            $variantId = $vQuery->value('id') ?? ProductVariant::where('product_id', $request->product_id)->value('id');
        }

        $variant = $variantId ? ProductVariant::with('product')->find($variantId) : null;

        // Auto-create default variant jika produk ada di tabel products tapi belum memiliki baris di product_variants
        if ((!$variant || !$variant->product) && $request->filled('product_id')) {
            $prod = Product::with('brand')->find($request->product_id);
            if ($prod && $prod->is_active) {
                $variant = ProductVariant::create([
                    'product_id' => $prod->id,
                    'model'      => $request->model ?: 'All Size',
                    'size'       => $request->size ?: 'Standar',
                    'color'      => $request->color ?: 'Default',
                    'sku'        => 'SKU-' . strtoupper(Str::random(6)),
                    'stock'      => 100,
                    'price'      => $prod->price,
                    'is_active'  => true,
                ]);
                $variant->setRelation('product', $prod);
            }
        }

        if (!$variant || !$variant->product || !$variant->product->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Varian produk tidak ditemukan atau sudah tidak aktif.',
            ], 422);
        }

        if ($variant->product->isClosedPo()) {
            return response()->json([
                'success' => false,
                'message' => "PO untuk produk {$variant->product->name} sudah ditutup dan tidak dapat dipesan.",
            ], 422);
        }

        $qty = max(1, (int) ($request->quantity ?? 1));
        $orderType = $request->input('order_type', 'dp');

        $cart = Cart::firstOrCreate(['user_id' => $user->id]);

        $item = CartItem::where('cart_id', $cart->id)
            ->where('product_variant_id', $variant->id)
            ->first();

        if ($item) {
            $item->quantity += $qty;
            if ($request->has('order_type')) {
                $item->order_type = $orderType;
            }
            $item->save();
        } else {
            $item = CartItem::create([
                'cart_id'            => $cart->id,
                'product_variant_id' => $variant->id,
                'quantity'           => $qty,
                'order_type'         => $orderType,
            ]);
        }

        $cart->load([
            'items.variant.product.brand',
            'items.variant.product.batch',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Produk {$variant->product->name} ({$variant->model}/{$variant->size}/{$variant->color}) berhasil ditambahkan ke keranjang.",
            'cart_id' => $cart->id,
            'data'    => $this->formatCartItems($cart),
        ], 201);
    }

    /**
     * Perbarui jumlah (quantity) atau tipe order item keranjang.
     */
    public function updateItem(Request $request, $id): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $cart = Cart::where('user_id', $user->id)->first();
        if (!$cart) {
            return response()->json(['success' => false, 'message' => 'Keranjang kosong.'], 404);
        }

        $item = CartItem::where('cart_id', $cart->id)
            ->where(function ($q) use ($id) {
                $q->where('id', $id)->orWhere('product_variant_id', $id);
            })
            ->first();

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Item keranjang tidak ditemukan.'], 404);
        }

        if ($request->has('quantity')) {
            $qty = (int) $request->quantity;
            if ($qty <= 0) {
                $item->delete();
            } else {
                $item->quantity = $qty;
                if ($request->has('order_type')) {
                    $item->order_type = $request->order_type;
                }
                $item->save();
            }
        } elseif ($request->has('order_type')) {
            $item->order_type = $request->order_type;
            $item->save();
        }

        $cart->load([
            'items.variant.product.brand',
            'items.variant.product.batch',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item keranjang berhasil diperbarui.',
            'cart_id' => $cart->id,
            'data'    => $this->formatCartItems($cart),
        ], 200);
    }

    /**
     * Hapus item dari keranjang belanja.
     */
    public function removeItem(Request $request, $id): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $cart = Cart::where('user_id', $user->id)->first();
        if (!$cart) {
            return response()->json(['success' => false, 'message' => 'Keranjang kosong.'], 404);
        }

        CartItem::where('cart_id', $cart->id)
            ->where(function ($q) use ($id) {
                $q->where('id', $id)->orWhere('product_variant_id', $id);
            })
            ->delete();

        $cart->load([
            'items.variant.product.brand',
            'items.variant.product.batch',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item berhasil dihapus dari keranjang.',
            'cart_id' => $cart->id,
            'data'    => $this->formatCartItems($cart),
        ], 200);
    }

    /**
     * Kosongkan seluruh isi keranjang belanja.
     */
    public function clear(Request $request): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $cart = Cart::where('user_id', $user->id)->first();
        if ($cart) {
            CartItem::where('cart_id', $cart->id)->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Keranjang belanja berhasil dikosongkan.',
            'cart_id' => $cart?->id,
            'data'    => [],
        ], 200);
    }

    /**
     * Sinkronkan daftar item lokal ke database keranjang user saat login.
     */
    public function sync(Request $request): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $rawItems = $request->input('items', []);
        $cart = Cart::firstOrCreate(['user_id' => $user->id]);

        if (is_array($rawItems) && count($rawItems) > 0) {
            DB::transaction(function () use ($cart, $rawItems) {
                foreach ($rawItems as $it) {
                    $vId = $it['product_variant_id'] ?? $it['variantId'] ?? null;
                    if (!$vId && !empty($it['productId'])) {
                        $vId = ProductVariant::where('product_id', $it['productId'])->value('id');
                    }
                    if (!$vId && !empty($it['id']) && is_numeric($it['id'])) {
                        $vId = ProductVariant::where('product_id', $it['id'])->value('id') ?? (int) $it['id'];
                    }

                    // Auto-create default variant jika produk ada di database tapi belum punya baris di product_variants
                    if (!$vId && (!empty($it['productId']) || (!empty($it['id']) && is_numeric($it['id'])))) {
                        $pId = $it['productId'] ?? $it['id'];
                        $prod = Product::find($pId);
                        if ($prod && $prod->is_active) {
                            $createdV = ProductVariant::create([
                                'product_id' => $prod->id,
                                'model'      => $it['selectedModel'] ?? 'All Size',
                                'size'       => $it['selectedSize'] ?? 'Standar',
                                'color'      => $it['selectedColor'] ?? 'Default',
                                'sku'        => 'SKU-' . strtoupper(Str::random(6)),
                                'stock'      => 100,
                                'price'      => $prod->price,
                                'is_active'  => true,
                            ]);
                            $vId = $createdV->id;
                        }
                    }

                    if (!$vId) continue;

                    $qty = max(1, (int) ($it['quantity'] ?? $it['qty'] ?? 1));
                    $orderType = $it['order_type'] ?? $it['orderType'] ?? 'dp';

                    $item = CartItem::where('cart_id', $cart->id)
                        ->where('product_variant_id', $vId)
                        ->first();

                    if ($item) {
                        $item->quantity = max($item->quantity, $qty);
                        $item->order_type = $orderType;
                        $item->save();
                    } else {
                        CartItem::create([
                            'cart_id'            => $cart->id,
                            'product_variant_id' => $vId,
                            'quantity'           => $qty,
                            'order_type'         => $orderType,
                        ]);
                    }
                }
            });
        }

        $cart->load([
            'items.variant.product.brand',
            'items.variant.product.batch',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Keranjang belanja berhasil disinkronkan.',
            'cart_id' => $cart->id,
            'data'    => $this->formatCartItems($cart),
        ], 200);
    }

    /**
     * Memformat rincian CartItem ke bentuk yang siap ditampilkan di CartDrawer / CartPage / Checkout.
     */
    private function formatCartItems(Cart $cart): array
    {
        $user = auth('api')->user() ?? $cart->user;
        $rawLevel = $user?->level;
        $levelName = is_object($rawLevel) ? ($rawLevel->name ?? '') : (string) $rawLevel;

        return $cart->items->map(function (CartItem $item) use ($levelName) {
            $variant = $item->variant;
            $product = $variant?->product;
            $brand   = $product?->brand;

            $basePrice = (float) ($variant?->price > 0
                ? $variant->price
                : ($product?->original_price > 0
                    ? $product->original_price
                    : ($product?->price ?? 0)));
            $isSale = (bool) ($product?->is_sale ?? false);
            $discountPercent = (int) ($product?->discount_percent ?? 0);

            // 1. Harga di coret: harga jual produk ($basePrice)
            // 2. Jika ada sale: dikurangi diskon sale sesuai upload admin (tanpa fee mitra untuk publik)
            $salePrice = ($isSale && $discountPercent > 0 && $basePrice > 0)
                ? round($basePrice * (1.0 - ($discountPercent / 100.0)))
                : $basePrice;

            // 3. Lalu dikurangi kembali Fee mitra per Level (hanya jika login mitra)
            if ($levelName !== '') {
                $mult = $this->levelMultiplier($levelName, $brand);
                $finalPrice = round($salePrice * $mult);
            } else {
                $finalPrice = $salePrice;
            }

            $price = $finalPrice > 0 ? $finalPrice : $basePrice;
            $qty   = (int) $item->quantity;
            $addon = (float) ($variant?->addon ?? 0);
            $total = ($price + $addon) * $qty;
            $dpPct = (float) ($product?->min_dp_percent ?: 30);
            $bookingAmount = $item->order_type === 'full' ? $total : round(($total * $dpPct) / 100);
            $remainingAmount = $item->order_type === 'full' ? 0 : max(0, $total - $bookingAmount);

            return [
                'id'              => $item->id,
                'cart_item_id'    => $item->id,
                'cart_id'         => $item->cart_id,
                'product_id'      => $product?->id,
                'productId'       => $product?->id,
                'variant_id'      => $variant?->id,
                'variantId'       => $variant?->id,
                'title'           => $product?->name ?? 'Produk PO',
                'brand'           => $brand?->name ?? 'AFATHARSHOP',
                'brand_id'        => $brand?->id,
                'price'           => $price,
                'selling_price'   => $basePrice,
                'original_price'  => $basePrice,
                'originalPrice'   => $basePrice,
                'addon'           => $addon,
                'qty'             => $qty,
                'selectedModel'   => $variant?->model ?? 'Standar',
                'selectedSize'    => $variant?->size ?? 'ALL',
                'selectedColor'   => $variant?->color ?? 'Default',
                'sku'             => $variant?->sku ?? '',
                'stock'           => (int) ($variant?->stock ?? 0),
                'image'           => $product?->image ?? '',
                'orderType'       => $item->order_type ?: 'dp',
                'minDpPercent'    => $dpPct,
                'bookingAmount'   => $bookingAmount,
                'remainingAmount' => $remainingAmount,
                'subtotal'        => $total,
                'is_closed'       => $product?->isClosedPo() ?? false,
                'status'          => $product?->effective_status ?? 'pre_order',
                'tutup_po'        => optional($product?->effective_tutup_po)->toIso8601String(),
                'closeDate'       => optional($product?->effective_tutup_po)->toDateString(),
            ];
        })->values()->all();
    }

    private function levelMultiplier(string $levelName, ?\App\Models\Brand $brand = null): float
    {
        $raw = strtolower(trim($levelName));

        if (str_contains($raw, 'db all') || str_contains($raw, 'db_all')) {
            $pct = $brand && $brand->discount_db_all !== null ? (float) $brand->discount_db_all : 30.0;
            return max(0.0, 1.0 - ($pct / 100.0));
        }
        if (str_contains($raw, 'sub db') || str_contains($raw, 'sub_db')) {
            $pct = $brand && $brand->discount_sub_db !== null ? (float) $brand->discount_sub_db : 25.0;
            return max(0.0, 1.0 - ($pct / 100.0));
        }
        if (str_contains($raw, 'agen')) {
            $pct = $brand && $brand->discount_agen !== null ? (float) $brand->discount_agen : 20.0;
            return max(0.0, 1.0 - ($pct / 100.0));
        }
        if (str_contains($raw, 'reseller')) {
            $pct = $brand && $brand->discount_reseller !== null ? (float) $brand->discount_reseller : 15.0;
            return max(0.0, 1.0 - ($pct / 100.0));
        }

        return 1.0;
    }
}
