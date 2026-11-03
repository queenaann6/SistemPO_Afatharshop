<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::withCount('products')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'total'   => $categories->count(),
            'data'    => $categories,
        ], 200);
    }
}
