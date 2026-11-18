<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    /**
     * Menampilkan daftar brand dari tabel `brands` di MySQL
     */
    public function index(Request $request): JsonResponse
    {
        $query = Brand::with('supplier')
            ->withCount('products')
            ->orderBy('id');

        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        } else {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $s = mb_strtolower(trim((string) $request->search));
            $query->whereRaw('LOWER(name) LIKE ?', ["%{$s}%"]);
        }

        $brands = $query->get();

        $data = $brands->map(fn (Brand $b) => [
            'id'                => $b->id,
            'name'              => $b->name,
            'supplier_id'       => $b->supplier_id,
            'supplier'          => $b->supplier?->name ?? '',
            'supplier_name'     => $b->supplier?->name ?? '',
            'supplier_obj'      => $b->supplier ? [
                'id'             => $b->supplier->id,
                'name'           => $b->supplier->name,
                'city'           => $b->supplier->city,
                'phone'          => $b->supplier->phone,
                'contact_person' => $b->supplier->contact_person,
            ] : null,
            'address'           => $b->supplier?->city ?? 'Solo',
            'logo'              => $b->logo,
            'description'       => $b->description,
            'discount_db_all'   => (float) ($b->discount_db_all ?? 30),
            'discount_sub_db'   => (float) ($b->discount_sub_db ?? 25),
            'discount_agen'     => (float) ($b->discount_agen ?? 20),
            'discount_reseller' => (float) ($b->discount_reseller ?? 15),
            'discountDBAll'     => (float) ($b->discount_db_all ?? 30),
            'discountSubDB'     => (float) ($b->discount_sub_db ?? 25),
            'discountAgen'      => (float) ($b->discount_agen ?? 20),
            'discountReseller'  => (float) ($b->discount_reseller ?? 15),
            'discount_value'    => (float) ($b->discount_value ?? 30),
            'discountValue'     => (float) ($b->discount_value ?? 30),
            'discount_type'     => $b->discount_type ?? 'pct',
            'discountType'      => $b->discount_type ?? 'pct',
            'fee_type'          => $b->fee_type ?? 'pct',
            'feeType'           => $b->fee_type ?? 'pct',
            'is_active'         => (bool) $b->is_active,
            'active'            => (bool) $b->is_active,
            'products_count'    => $b->products_count,
            'created_at'        => optional($b->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar Brand dari Database',
            'total'   => $data->count(),
            'data'    => $data,
        ], 200);
    }

    /**
     * Menampilkan detail satu brand
     */
    public function show($id): JsonResponse
    {
        $cleanId = is_string($id) && preg_match('/^[a-z]+-(\d+)$/i', trim($id), $matches)
            ? (int) $matches[1]
            : (is_numeric($id) ? (int) $id : null);

        $brand = $cleanId ? Brand::with('supplier')->withCount('products')->find($cleanId) : null;
        if (!$brand && is_string($id)) {
            $cleanSlug = preg_replace('/^[a-z]+-/i', '', trim($id));
            $brand = Brand::with('supplier')->withCount('products')
                ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($cleanSlug)])
                ->orWhereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($id))])
                ->first();
        }

        if (!$brand) {
            return response()->json([
                'success' => false,
                'message' => 'Brand tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'                => $brand->id,
                'name'              => $brand->name,
                'supplier_id'       => $brand->supplier_id,
                'supplier'          => $brand->supplier?->name ?? '',
                'supplier_name'     => $brand->supplier?->name ?? '',
                'supplier_obj'      => $brand->supplier ? [
                    'id'             => $brand->supplier->id,
                    'name'           => $brand->supplier->name,
                    'city'           => $brand->supplier->city,
                    'phone'          => $brand->supplier->phone,
                    'contact_person' => $brand->supplier->contact_person,
                ] : null,
                'address'           => $brand->supplier?->city ?? 'Solo',
                'logo'              => $brand->logo,
                'description'       => $brand->description,
                'discount_db_all'   => (float) ($brand->discount_db_all ?? 30),
                'discount_sub_db'   => (float) ($brand->discount_sub_db ?? 25),
                'discount_agen'     => (float) ($brand->discount_agen ?? 20),
                'discount_reseller' => (float) ($brand->discount_reseller ?? 15),
                'discountDBAll'     => (float) ($brand->discount_db_all ?? 30),
                'discountSubDB'     => (float) ($brand->discount_sub_db ?? 25),
                'discountAgen'      => (float) ($brand->discount_agen ?? 20),
                'discountReseller'  => (float) ($brand->discount_reseller ?? 15),
                'discount_value'    => (float) ($brand->discount_value ?? 30),
                'discountValue'     => (float) ($brand->discount_value ?? 30),
                'discount_type'     => $brand->discount_type ?? 'pct',
                'discountType'      => $brand->discount_type ?? 'pct',
                'fee_type'          => $brand->fee_type ?? 'pct',
                'feeType'           => $brand->fee_type ?? 'pct',
                'is_active'         => (bool) $brand->is_active,
                'active'            => (bool) $brand->is_active,
                'products_count'    => $brand->products_count ?? $brand->products()->count(),
                'created_at'        => optional($brand->created_at)->toIso8601String(),
            ],
        ], 200);
    }
}
