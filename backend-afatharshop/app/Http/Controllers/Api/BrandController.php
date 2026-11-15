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
            'supplier'          => $b->supplier ? [
                'id'             => $b->supplier->id,
                'name'           => $b->supplier->name,
                'city'           => $b->supplier->city,
                'phone'          => $b->supplier->phone,
                'contact_person' => $b->supplier->contact_person,
            ] : null,
            'supplier_name'     => $b->supplier?->name ?? '',
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
}
