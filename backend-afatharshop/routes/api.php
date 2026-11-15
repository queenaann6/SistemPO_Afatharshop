<?php

use App\Http\Controllers\Api\Admin\LoginController as AdminLoginController;
use App\Http\Controllers\Api\Admin\LogoutController as AdminLogoutController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CourierController;
use App\Http\Controllers\Api\LevelController;
use App\Http\Controllers\Api\ManagementController;
use App\Http\Controllers\Api\MitraDataController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'success' => true,
    'service' => 'afatharshop-api',
    'time'    => now()->toIso8601String(),
]));

// Fallback route named 'login' agar url generator tidak pernah melempar RouteNotFoundException jika dipanggil
Route::get('/login', fn () => response()->json([
    'success' => false,
    'message' => 'Sesi kamu berakhir. Silakan masuk kembali.',
], 401))->name('login');

/*
|--------------------------------------------------------------------------
| Autentikasi mitra
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:20,1');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:30,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:30,1');

    Route::middleware('auth:api')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::put('password', [AuthController::class, 'changePassword']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh'])->middleware('throttle:30,1');
    });
});

/*
|--------------------------------------------------------------------------
| Autentikasi panel admin
|--------------------------------------------------------------------------
*/
Route::post('admin/login', AdminLoginController::class)->middleware('throttle:5,1');
Route::post('admin/logout', AdminLogoutController::class)
    ->middleware(['auth:api', 'role:owner,finance,marketing']);

/*
|--------------------------------------------------------------------------
| Katalog publik (harga mitra otomatis bila token valid dikirim)
|--------------------------------------------------------------------------
*/
Route::get('catalog', [ProductController::class, 'bootstrap']);
Route::get('products', [ProductController::class, 'index']);
Route::get('products/{id}', [ProductController::class, 'show'])->whereNumber('id');

Route::get('brands', [BrandController::class, 'index']);
Route::get('suppliers', [SupplierController::class, 'index']);
Route::get('categories', [CategoryController::class, 'index']);
Route::get('couriers', [CourierController::class, 'index']);
Route::get('bank-accounts', [BankAccountController::class, 'index']);
Route::get('batches', [ProductController::class, 'batches']);

/*
|--------------------------------------------------------------------------
| Transaksi & data mitra (wajib login)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:api')->group(function () {
    // Unggah bukti transfer & foto profil dengan batas kecepatan (throttle)
    Route::post('uploads', [ManagementController::class, 'uploadFile'])->middleware('throttle:20,1');

    // Daftar tingkat harga mitra (dilindungi agar struktur diskon tidak bocor ke publik)
    Route::get('levels', [LevelController::class, 'index']);
    Route::get('levels/{id}', [LevelController::class, 'show'])->whereNumber('id');

    Route::get('orders', [OrderController::class, 'index']);
    Route::post('orders', [OrderController::class, 'store'])->middleware('throttle:20,1');
    Route::get('orders/{id}', [OrderController::class, 'show']);
    Route::get('orders/{id}/invoice', [OrderController::class, 'invoice']);
    Route::get('invoices/{id}', [OrderController::class, 'invoice']);
    Route::put('orders/{id}', [OrderController::class, 'update']);
    Route::patch('orders/{id}/address', [OrderController::class, 'updateAddress']);
    Route::post('orders/{id}/cancel', [OrderController::class, 'cancelOrder']);

    // Keranjang belanja mitra terikat akun
    Route::get('cart', [CartController::class, 'index']);
    Route::post('cart/items', [CartController::class, 'addItem']);
    Route::put('cart/items/{id}', [CartController::class, 'updateItem']);
    Route::delete('cart/items/{id}', [CartController::class, 'removeItem']);
    Route::delete('cart', [CartController::class, 'clear']);
    Route::post('cart/sync', [CartController::class, 'sync']);

    // Wishlist produk tersimpan
    Route::get('wishlist', [WishlistController::class, 'index']);
    Route::post('wishlist/toggle', [WishlistController::class, 'toggle']);
    Route::delete('wishlist/{productId}', [WishlistController::class, 'destroy']);

    Route::prefix('my')->group(function () {
        Route::get('profile', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::put('password', [AuthController::class, 'changePassword']);
        Route::get('deposits', [MitraDataController::class, 'deposits']);
        Route::post('deposits', [ManagementController::class, 'storeDeposit']);
        Route::get('payments', [MitraDataController::class, 'payments']);
        Route::post('payments', [ManagementController::class, 'storePayment']);
        Route::post('payments/deposit', [ManagementController::class, 'payWithDeposit']);
        Route::post('orders/{id}/cancel', [OrderController::class, 'cancelOrder']);
        Route::get('notifications', [MitraDataController::class, 'notifications']);
        Route::patch('notifications/read', [MitraDataController::class, 'markNotificationsAsRead']);

        Route::get('addresses', [MitraDataController::class, 'addresses']);
        Route::post('addresses', [MitraDataController::class, 'storeAddress']);
        Route::put('addresses/{id}', [MitraDataController::class, 'updateAddress'])->whereNumber('id');
        Route::delete('addresses/{id}', [MitraDataController::class, 'destroyAddress'])->whereNumber('id');
    });
});

/*
|--------------------------------------------------------------------------
| Data manajemen (dibagi ketat per role & tingkat risiko)
|--------------------------------------------------------------------------
*/
Route::prefix('management')->middleware('auth:api')->group(function () {

    // 1. Owner, finance, marketing (Akses operasional bersama)
    Route::middleware('role:owner,finance,marketing')->group(function () {
        Route::get('bootstrap', [ManagementController::class, 'bootstrap']);
        Route::get('orders', [ManagementController::class, 'orders']);
        Route::get('orders/trashed', [ManagementController::class, 'trashedOrders']);
        Route::get('orders/{id}/invoice', [ManagementController::class, 'invoice']);
        Route::get('invoices/{id}', [ManagementController::class, 'invoice']);
        Route::post('orders', [ManagementController::class, 'storeOrder']);
        Route::patch('orders/{id}/status', [ManagementController::class, 'updateOrderStatus']);
        Route::patch('orders/{id}/invoice', [ManagementController::class, 'updateOrderInvoice']);
        Route::post('orders/{id}/trash', [ManagementController::class, 'trashOrder']);
        Route::post('orders/{id}/restore', [ManagementController::class, 'restoreOrder']);
        Route::put('orders/{id}', [ManagementController::class, 'updateOrder']);

        Route::get('batches', [ManagementController::class, 'batches']);
        Route::post('batches', [ManagementController::class, 'storeBatch']);
        Route::put('batches/{id}', [ManagementController::class, 'updateBatch']);

        Route::get('products', [ManagementController::class, 'products']);
        Route::post('products', [ManagementController::class, 'storeProduct']);
        Route::put('products/{id}', [ManagementController::class, 'updateProduct']);

        Route::get('suppliers', [ManagementController::class, 'suppliers']);
        Route::post('suppliers', [ManagementController::class, 'storeSupplier']);
        Route::put('suppliers/{id}', [ManagementController::class, 'updateSupplier']);

        Route::get('brands', [ManagementController::class, 'brands']);
        Route::post('brands', [ManagementController::class, 'storeBrand']);
        Route::put('brands/{id}', [ManagementController::class, 'updateBrand']);

        Route::get('categories', [ManagementController::class, 'categories']);
        Route::post('categories', [ManagementController::class, 'storeCategory']);
        Route::put('categories/{id}', [ManagementController::class, 'updateCategory']);

        // Master kurir operasional pengiriman
        Route::get('couriers', [ManagementController::class, 'couriers']);
        Route::post('couriers', [ManagementController::class, 'storeCourier']);
        Route::put('couriers/{id}', [ManagementController::class, 'updateCourier']);
        Route::delete('couriers/{id}', [ManagementController::class, 'destroyCourier']);

        Route::get('settings', [ManagementController::class, 'settings']);

        // Pengguna: marketing & finance hanya boleh melihat data (Read-only)
        Route::get('users', [ManagementController::class, 'users']);

        // Pencatatan pengajuan bukti bayar & deposit
        Route::post('deposits', [ManagementController::class, 'storeDeposit']);
        Route::post('payments', [ManagementController::class, 'storePayment']);

        // Pengajuan dana ke vendor / operasional
        Route::get('payment-requests', [ManagementController::class, 'paymentRequests']);
        Route::post('payment-requests', [ManagementController::class, 'storePaymentRequest']);
        Route::patch('payment-requests/{id}', [ManagementController::class, 'updatePaymentRequest']);
        Route::delete('payment-requests/{id}', [ManagementController::class, 'destroyPaymentRequest']);

        Route::get('notifications', [ManagementController::class, 'notifications']);
        Route::patch('notifications/read', [ManagementController::class, 'markNotificationsAsRead']);

        // Endpoint laporan & rekap produksi
        Route::get('reports/summary', [ManagementController::class, 'reportSummary']);
        Route::get('reports/production', [ManagementController::class, 'reportProduction']);
    });

    // 2. Data keuangan & rekening tujuan transfer: owner & finance saja
    Route::middleware('role:owner,finance')->group(function () {
        Route::get('bank-accounts', [ManagementController::class, 'bankAccounts']);
        Route::post('bank-accounts', [ManagementController::class, 'storeBankAccount']);
        Route::put('bank-accounts/{id}', [ManagementController::class, 'updateBankAccount']);
        Route::delete('bank-accounts/{id}', [ManagementController::class, 'destroyBankAccount']);

        Route::put('settings', [ManagementController::class, 'updateSettings']);

        Route::get('deposits', [ManagementController::class, 'deposits']);
        Route::patch('deposits/{id}/verify', [ManagementController::class, 'verifyDeposit']);
        Route::delete('deposits/{id}', [ManagementController::class, 'destroyDeposit']);

        Route::get('payments', [ManagementController::class, 'payments']);
        Route::patch('payments/{id}/verify', [ManagementController::class, 'verifyPayment']);
        Route::delete('payments/{id}', [ManagementController::class, 'destroyPayment']);

        // Ekspor data laporan
        Route::get('reports/export', [ManagementController::class, 'exportReport']);
    });

    // 3. Hak hapus data kritis & pengelolaan akun pengguna: owner saja
    Route::middleware('role:owner')->group(function () {
        // Hapus permanen data master & pesanan
        Route::delete('orders/{id}', [ManagementController::class, 'destroyOrder']);
        Route::delete('batches/{id}', [ManagementController::class, 'destroyBatch']);
        Route::delete('products/{id}', [ManagementController::class, 'destroyProduct']);
        Route::delete('brands/{id}', [ManagementController::class, 'destroyBrand']);
        Route::delete('suppliers/{id}', [ManagementController::class, 'destroySupplier']);
        Route::delete('categories/{id}', [ManagementController::class, 'destroyCategory']);

        // Pengelolaan Akun (Tambah, Ubah, Hapus) mutlak milik Owner
        Route::post('users', [ManagementController::class, 'storeUser']);
        Route::put('users/{id}', [ManagementController::class, 'updateUser']);
        Route::delete('users/{id}', [ManagementController::class, 'destroyUser']);

        // Audit jejak aktivitas
        Route::get('activity-logs', [ManagementController::class, 'activityLogs']);
        Route::delete('activity-logs/{id}', [ManagementController::class, 'destroyActivityLog']);
        Route::delete('activity-logs', [ManagementController::class, 'clearActivityLogs']);
    });
});

/*
|--------------------------------------------------------------------------
| Master level (admin)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:api', 'role:owner,marketing'])->group(function () {
    Route::post('levels', [LevelController::class, 'store']);
    Route::put('levels/{id}', [LevelController::class, 'update'])->whereNumber('id');
    Route::delete('levels/{id}', [LevelController::class, 'destroy'])->whereNumber('id');
});
