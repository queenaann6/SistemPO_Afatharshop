<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Level;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['brand.supplier', 'category', 'batch', 'variants', 'prices.level'])
            ->where('is_active', true);

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
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
     * Snapshot katalog publik (produk, brand, kategori, kurir, rekening)
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
                'brands'        => $section($brands->index()),
                'categories'    => $section($categories->index()),
                'couriers'      => $section($couriers->index()),
                'bank_accounts' => $section($bankAccounts->index()),
                'suppliers'     => $section($suppliers->index()),
            ],
        ], 200);
    }

    public function show(Request $request, string $id)
    {
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

    private function transform(Product $product, ?Level $level): array
    {
        $prices = $product->prices;

        $userPrice = null;
        if ($level) {
            $matched = $prices->firstWhere('level_id', $level->id);
            $userPrice = $matched?->price;
        }

        $minPrice = $prices->min('price');
        $maxPrice = $prices->max('price');

        $isSale = (bool) ($product->is_sale ?? false);
        $discountPercent = (int) ($product->discount_percent ?? 0);
        $originalPrice = $product->original_price ? (float) $product->original_price : null;

        return [
            'id'                 => $product->id,
            'name'               => $product->name,
            'title'              => $product->name,
            'article_code'       => $product->article_code,
            'image'              => $product->image,
            'image2'             => $product->image2,
            'image3'             => $product->image3,
            'image4'             => $product->image4,
            'reel_url'           => $product->reel_url,
            'reelUrl'            => $product->reel_url,
            'thumbnails'         => $product->thumbnails ?: array_values(array_filter([$product->image, $product->image2, $product->image3, $product->image4])),
            'series'             => $product->series,
            'status'             => $product->status,
            'is_sale'            => $isSale,
            'discount_percent'   => $discountPercent,
            'original_price'     => $originalPrice,
            'tutup_po'           => $product->tutup_po?->format('d F Y H:i'),
            'tutup_po_iso'       => $product->tutup_po?->toIso8601String(),
            'estimated_shipment' => $product->estimated_shipment?->format('d F Y'),
            'shipment_iso'       => $product->estimated_shipment?->toDateString(),
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
            'price'              => $userPrice ?? $minPrice,
            'price_min'          => $minPrice,
            'price_max'          => $maxPrice,
            'prices'             => $prices,
            'variants'           => $product->variants,
            'is_active'          => (bool) $product->is_active,
            'created_at'         => $product->created_at,
        ];
    }
}
