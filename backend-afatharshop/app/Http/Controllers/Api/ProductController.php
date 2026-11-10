<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Level;
use App\Models\PoBatch;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        Product::autoSyncExpired();

        $query = Product::with(['brand.supplier', 'category', 'batch', 'variants', 'prices.level'])
            ->where('is_active', true);

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        } elseif ($request->filled('brand')) {
            $bVal = trim((string) $request->brand);
            if (is_numeric($bVal)) {
                $query->where('brand_id', (int) $bVal);
            } else {
                $query->whereHas('brand', fn ($q) => $q->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($bVal)]));
            }
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        } elseif ($request->filled('category')) {
            $cVal = trim((string) $request->category);
            if (is_numeric($cVal)) {
                $query->where('category_id', (int) $cVal);
            } else {
                $query->whereHas('category', fn ($q) => $q->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($cVal)]));
            }
        }

        if ($request->filled('status')) {
            $sVal = trim((string) $request->status);
            if (in_array($sVal, ['closed', 'closed_po'], true)) {
                $query->whereIn('status', ['closed', 'closed_po']);
            } else {
                $query->where('status', $sVal);
            }
        }

        if ($request->filled('search')) {
            $s = mb_strtolower(trim((string) $request->search));
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$s}%"])
                    ->orWhereRaw('LOWER(article_code) LIKE ?', ["%{$s}%"])
                    ->orWhereRaw('LOWER(series) LIKE ?', ["%{$s}%"]);
            });
        }

        $products = $query->orderBy('id')->get();
        $level    = $this->userLevel();

        $result = $products->map(fn (Product $product) => $this->transform($product, $level));

        return response()->json([
            'success' => true,
            'message' => 'Daftar katalog produk.',
            'total'   => $result->count(),
            'data'    => $result,
        ], 200);
    }

    /**
     * Snapshot katalog publik (produk, brand, kategori, kurir, rekening, batch PO)
     * dalam satu respons agar frontend cukup satu permintaan saat memuat awal.
     */
    public function bootstrap(
        Request $request,
        BrandController $brands,
        CategoryController $categories,
        CourierController $couriers,
        BankAccountController $bankAccounts,
        SupplierController $suppliers
    ) {
        $section = fn ($response) => $response->getData(true)['data'];

        return response()->json([
            'success' => true,
            'message' => 'Snapshot katalog.',
            'data'    => [
                'products'      => $section($this->index($request)),
                'brands'        => $section($brands->index($request)),
                'categories'    => $section($categories->index()),
                'couriers'      => $section($couriers->index()),
                'bank_accounts' => $section($bankAccounts->index()),
                'suppliers'     => $section($suppliers->index()),
                'batches'       => $section($this->batches()),
            ],
        ], 200);
    }

    public function batches()
    {
        Product::autoSyncExpired();

        $batches = PoBatch::with(['brand', 'products'])->orderBy('id')->get();
        $data = $batches->map(fn (PoBatch $batch) => [
            'id'                 => $batch->id,
            'name'               => $batch->name,
            'brand_id'           => $batch->brand_id,
            'brand'              => $batch->brand?->name,
            'start_date'         => optional($batch->start_date)->toDateString(),
            'close_date'         => optional($batch->close_date)->toIso8601String(),
            'estimated_shipment' => optional($batch->estimated_shipment)->toDateString(),
            'status'             => $batch->effective_status,
            'products_count'     => $batch->products->count(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar batch PO.',
            'total'   => $data->count(),
            'data'    => $data,
        ], 200);
    }

    public function show(Request $request, string $id)
    {
        Product::autoSyncExpired();

        $product = Product::with(['brand.supplier', 'category', 'batch', 'variants', 'prices.level'])
            ->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->transform($product, $this->userLevel()),
        ], 200);
    }

    private function userLevel(): ?Level
    {
        try {
            $user = auth('api')->user();
        } catch (\Throwable $e) {
            // Token tidak valid pada endpoint publik: perlakukan sebagai guest.
            $user = null;
        }

        if (!$user || !$user->level) {
            return null;
        }

        return Level::whereRaw('LOWER(name) = ?', [strtolower(trim($user->level))])->first();
    }

    private function formatIndonesianDate(?\DateTimeInterface $date, bool $withTime = false): ?string
    {
        if (!$date || (int) $date->format('Y') <= 1970) return null;
        $months = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $m = (int) $date->format('n');
        $formatted = $date->format('d') . ' ' . ($months[$m] ?? $date->format('F')) . ' ' . $date->format('Y');
        if ($withTime) {
            $formatted .= ' ' . $date->format('H:i');
        }
        return $formatted;
    }

    private function transform(Product $product, ?Level $level): array
    {
        $prices = $product->prices;
        $activeVariants = $product->variants->where('is_active', true);
        if ($activeVariants->isEmpty()) {
            $activeVariants = $product->variants;
        }

        $variantMinPrice = (float) ($activeVariants->where('price', '>', 0)->min('price') ?: 0);
        $variantMaxPrice = (float) ($activeVariants->where('price', '>', 0)->max('price') ?: $variantMinPrice);

        // Cari basePrice (harga normal eceran per produk sebelum diskon)
        $basePrice = 0.0;
        if ($variantMinPrice > 0) {
            $basePrice = $variantMinPrice;
        } elseif ((float) ($product->original_price ?? 0) > 0) {
            $basePrice = (float) $product->original_price;
        } elseif ((float) ($product->price ?? 0) > 0) {
            $basePrice = (float) $product->price;
        } elseif ($prices->isNotEmpty()) {
            $firstWithFee = $prices->first(fn ($p) => (float) $p->fee > 0);
            if ($firstWithFee) {
                $basePrice = (float) $firstWithFee->price + (float) $firstWithFee->fee;
            } else {
                $maxP = (float) $prices->max('price');
                $basePrice = $maxP > 0 ? round($maxP / 0.85) : 0.0;
            }
        }

        $isSale = (bool) ($product->is_sale ?? false);
        $discountPercent = (int) ($product->discount_percent ?? 0);

        // 1. Harga normal jual per produk ($basePrice)
        // 2. Jika ada sale: harga dikurangi diskon sale saja sesuai upload admin
        $salePrice = ($isSale && $discountPercent > 0 && $basePrice > 0)
            ? round($basePrice * (1.0 - ($discountPercent / 100.0)))
            : $basePrice;

        // 3. Potongan Fee Mitra per Level:
        // - Sebelum login (publik / guest): harga adalah harga normal, dan jika ada sale HANYA dikurangi sale saja.
        //   TIDAK ada potongan fee mitra untuk publik!
        // - Setelah login sebagai mitra ($level valid): harga sale dikurangi lagi fee mitra sesuai level.
        $userPrice = $salePrice;
        $userFee = 0;

        if ($level) {
            $matched = $prices->firstWhere('level_id', $level->id);
            if ($matched && (float) $matched->price > 0 && !$isSale) {
                $userPrice = (float) $matched->price;
                $userFee = (float) $matched->fee > 0
                    ? (float) $matched->fee
                    : max(0, round($basePrice - $userPrice));
            } else {
                $mult = $this->levelMultiplier($level->name, $product->brand);
                $userPrice = round($salePrice * $mult);
                $userFee = max(0, round($basePrice - $userPrice));
            }
        } else {
            $userPrice = $salePrice;
            $userFee = 0;
        }

        // Harga dicoret:
        // - Publik: harga normal dicoret hanya jika produk sedang sale
        // - Mitra: dicoret jika harga user lebih murah dari harga normal
        $originalPrice = null;
        if ($level) {
            if ($userPrice < $basePrice) {
                $originalPrice = $basePrice;
            }
        } else {
            if ($isSale && $discountPercent > 0 && $salePrice < $basePrice) {
                $originalPrice = $basePrice;
            }
        }

        // Rentang harga (price_min & price_max):
        // - Publik: rentang harga produk/varian (normal atau sale), BUKAN rentang fee mitra di product_prices
        // - Mitra: rentang harga userPrice
        if ($level) {
            $minPrice = $userPrice;
            $maxPrice = $userPrice;
        } else {
            $vMin = $variantMinPrice > 0 ? $variantMinPrice : $basePrice;
            $vMax = $variantMaxPrice > 0 ? $variantMaxPrice : $basePrice;
            if ($isSale && $discountPercent > 0) {
                $minPrice = round($vMin * (1.0 - ($discountPercent / 100.0)));
                $maxPrice = round($vMax * (1.0 - ($discountPercent / 100.0)));
            } else {
                $minPrice = $vMin;
                $maxPrice = $vMax;
            }
        }

        $effectiveTutupPo = $product->effective_tutup_po;
        $effectiveEstShipment = $product->estimated_shipment ?? $product->batch?->estimated_shipment;
        $effectiveStatus = $product->effective_status;

        return [
            'id'                 => $product->id,
            'name'               => $product->name,
            'title'              => $product->name,
            'article_code'       => $product->article_code,
            'image'              => $product->image,
            'image2'             => $product->image2,
            'image3'             => $product->image3,
            'image4'             => $product->image4,
            'image5'             => $product->image5,
            'image6'             => $product->image6,
            'reel_url'           => $product->reel_url,
            'reelUrl'            => $product->reel_url,
            'thumbnails'         => $product->thumbnails ?: array_values(array_filter([$product->image, $product->image2, $product->image3, $product->image4, $product->image5, $product->image6])),
            'series'             => $product->series,
            'status'             => $effectiveStatus,
            'is_closed'          => $product->isClosedPo(),
            'is_sale'            => $isSale,
            'discount_percent'   => $discountPercent,
            'original_price'     => $originalPrice,
            'selling_price'      => $basePrice,
            'sale_price'         => $salePrice,
            'tutup_po'           => $this->formatIndonesianDate($effectiveTutupPo, true),
            'tutup_po_iso'       => $effectiveTutupPo?->toIso8601String(),
            'close_date'         => $effectiveTutupPo?->toDateString(),
            'close_time'         => $effectiveTutupPo?->format('H:i') ?? '23:59',
            'open_date'          => optional($product->batch?->start_date)->toDateString(),
            'estimated_shipment' => $this->formatIndonesianDate($effectiveEstShipment, false),
            'shipment_iso'       => $effectiveEstShipment && $effectiveEstShipment->year > 1970 ? $effectiveEstShipment->toDateString() : null,
            'min_dp_percent'     => $product->min_dp_percent,
            'dp_percent'         => $product->min_dp_percent,
            'payment_stages'     => $product->payment_stages,
            'stages'             => $product->payment_stages,
            'termin_count'       => (int) ($product->termin_count ?? 2),
            'stock_quota'        => $product->stock_quota,
            'description'        => $product->description,
            'material_detail'    => $product->material_detail,
            'brand'              => $product->brand?->name,
            'brand_id'           => $product->brand_id,
            'brand_logo'         => $product->brand?->logo,
            'category'           => $product->category?->name,
            'category_id'        => $product->category_id,
            'batch'              => $product->batch?->name,
            'po_batch_id'        => $product->po_batch_id,
            'user_level'         => $level?->name ?? 'Guest',
            'user_price'         => $userPrice,
            'user_fee'           => $userFee,
            'price'              => $userPrice,
            'price_min'          => $minPrice ?: $basePrice,
            'price_max'          => $maxPrice ?: $basePrice,
            'prices'             => $level
                ? $prices->map(fn ($pr) => [
                    'id'       => $pr->id,
                    'level_id' => $pr->level_id,
                    'level'    => $pr->level?->name,
                    'price'    => (float) $pr->price,
                    'fee'      => (float) $pr->fee,
                ])->values()
                : [],
            'variants'           => $product->variants->map(function ($v) use ($level, $product, $isSale, $discountPercent, $basePrice) {
                $vBasePrice = (float) ($v->price > 0 ? $v->price : $basePrice);
                $vSalePrice = ($isSale && $discountPercent > 0 && $vBasePrice > 0)
                    ? round($vBasePrice * (1.0 - ($discountPercent / 100.0)))
                    : $vBasePrice;

                if ($level) {
                    $mult = $this->levelMultiplier($level->name, $product->brand);
                    $vUserPrice = round($vSalePrice * $mult);
                    $vUserFee = max(0, round($vBasePrice - $vUserPrice));
                } else {
                    $vUserPrice = $vSalePrice;
                    $vUserFee = 0;
                }

                $arr = $v->toArray();
                $arr['selling_price']  = $vBasePrice;
                $arr['sellingPrice']   = $vBasePrice;
                $arr['original_price'] = ($vUserPrice < $vBasePrice) ? $vBasePrice : null;
                $arr['originalPrice']  = ($vUserPrice < $vBasePrice) ? $vBasePrice : null;
                $arr['sale_price']     = $vSalePrice;
                $arr['salePrice']      = $vSalePrice;
                $arr['user_price']     = $vUserPrice;
                $arr['userPrice']      = $vUserPrice;
                $arr['user_fee']       = $vUserFee;
                $arr['userFee']        = $vUserFee;
                $arr['price']          = $vUserPrice;
                $arr['base_price']     = $vBasePrice;
                $arr['basePrice']      = $vBasePrice;
                return $arr;
            }),
            'is_active'          => (bool) $product->is_active,
            'created_at'         => $product->created_at,
        ];
    }

    private function levelMultiplier(string $levelName, ?Brand $brand = null): float
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
