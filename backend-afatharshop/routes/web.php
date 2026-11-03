<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name'    => 'Afatharshop PO API',
    'version' => '1.0.0',
    'docs'    => '/api/health',
]));
