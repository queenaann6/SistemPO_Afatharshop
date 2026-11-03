<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * Menampilkan daftar supplier dari tabel `suppliers` di MySQL
     */
    public function index(): JsonResponse
    {
        $suppliers = Supplier::with('brands')->orderBy('id')->get();

        $data = $suppliers->map(fn (Supplier $s) => [
            'id'             => $s->id,
            'name'           => $s->name,
            'city'           => $s->city,
            'phone'          => $s->phone,
            'contact_person' => $s->contact_person,
            'brands'         => $s->brands->pluck('name')->values(),
            'created_at'     => optional($s->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar Supplier dari Database',
            'total'   => $data->count(),
            'data'    => $data,
        ], 200);
    }
}
