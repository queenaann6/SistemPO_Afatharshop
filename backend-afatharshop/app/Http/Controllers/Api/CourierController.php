<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Courier;

class CourierController extends Controller
{
    public function index()
    {
        $couriers = Courier::where('is_active', true)
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'total'   => $couriers->count(),
            'data'    => $couriers,
        ], 200);
    }
}
