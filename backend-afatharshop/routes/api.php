<?php

use App\Http\Controllers\Api\Admin\LoginController as AdminLoginController;
use App\Http\Controllers\Api\Admin\LogoutController as AdminLogoutController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CourierController;
use App\Http\Controllers\Api\LevelController;
use App\Http\Controllers\Api\ManagementController;
use App\Http\Controllers\Api\MitraDataController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SupplierController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'success' => true,
    'service' => 'afatharshop-api',
    'time'    => now()->toIso8601String(),
]));

/*
|--------------------------------------------------------------------------
| Autentikasi mitra
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:20,1');

    Route::middleware('auth:api')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
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

Route::get('levels', [LevelController::class, 'index']);
Route::get('levels/{id}', [LevelController::class, 'show'])->whereNumber('id');

/*
|--------------------------------------------------------------------------
| Transaksi & data mitra (wajib login)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:api')->group(function () {
    Route::post('uploads', [ManagementController::class, 'uploadFile']);

    Route::get('orders', [OrderController::class, 'index']);
    Route::post('orders', [OrderController::class, 'store'])->middleware('throttle:20,1');
    Route::get('orders/{id}', [OrderController::class, 'show'])->whereNumber('id');

    Route::prefix('my')->group(function () {
        Route::get('deposits', [MitraDataController::class, 'deposits']);
        Route::post('deposits', [ManagementController::class, 'storeDeposit']);
        Route::get('payments', [MitraDataController::class, 'payments']);
        Route::post('payments', [ManagementController::class, 'storePayment']);
        Route::post('payments/deposit', [ManagementController::class, 'payWithDeposit']);
        Route::get('notifications', [MitraDataController::class, 'notifications']);

        Route::get('addresses', [MitraDataController::class, 'addresses']);
        Route::post('addresses', [MitraDataController::class, 'storeAddress']);
        Route::put('addresses/{id}', [MitraDataController::class, 'updateAddress'])->whereNumber('id');
        Route::delete('addresses/{id}', [MitraDataController::class, 'destroyAddress'])->whereNumber('id');
    });
});

/*
|--------------------------------------------------------------------------
| Data manajemen (dibagi per role)
|--------------------------------------------------------------------------
*/
Route::prefix('management')->middleware('auth:api')->group(function () {

    // Owner, finance, marketing
    Route::middleware('role:owner,finance,marketing')->group(function () {
        Route::get('bootstrap', [ManagementController::class, 'bootstrap']);
        Route::get('orders', [ManagementController::class, 'orders']);
        Route::patch('orders/{id}/status', [ManagementController::class, 'updateOrderStatus']);
        Route::put('orders/{id}', [ManagementController::class, 'updateOrderStatus']);

        Route::get('batches', [ManagementController::class, 'batches']);
        Route::post('batches', [ManagementController::class, 'storeBatch']);
        Route::put('batches/{id}', [ManagementController::class, 'updateBatch']);
        Route::delete('batches/{id}', [ManagementController::class, 'destroyBatch']);

        Route::get('products', [ManagementController::class, 'products']);
        Route::post('products', [ManagementController::class, 'storeProduct']);
        Route::put('products/{id}', [ManagementController::class, 'updateProduct']);
        Route::delete('products/{id}', [ManagementController::class, 'destroyProduct']);

        Route::get('suppliers', [ManagementController::class, 'suppliers']);
        Route::post('suppliers', [ManagementController::class, 'storeSupplier']);
        Route::put('suppliers/{id}', [ManagementController::class, 'updateSupplier']);
        Route::delete('suppliers/{id}', [ManagementController::class, 'destroySupplier']);

        Route::get('brands', [ManagementController::class, 'brands']);
        Route::post('brands', [ManagementController::class, 'storeBrand']);
        Route::put('brands/{id}', [ManagementController::class, 'updateBrand']);
        Route::delete('brands/{id}', [ManagementController::class, 'destroyBrand']);

        Route::get('categories', [ManagementController::class, 'categories']);
        Route::post('categories', [ManagementController::class, 'storeCategory']);
        Route::put('categories/{id}', [ManagementController::class, 'updateCategory']);
        Route::delete('categories/{id}', [ManagementController::class, 'destroyCategory']);

        Route::get('master/bank-accounts', [ManagementController::class, 'bankAccounts']);
        Route::post('master/bank-accounts', [ManagementController::class, 'storeBankAccount']);
        Route::put('master/bank-accounts/{id}', [ManagementController::class, 'updateBankAccount']);
        Route::delete('master/bank-accounts/{id}', [ManagementController::class, 'destroyBankAccount']);

        Route::get('master/couriers', [ManagementController::class, 'couriers']);
        Route::post('master/couriers', [ManagementController::class, 'storeCourier']);
        Route::put('master/couriers/{id}', [ManagementController::class, 'updateCourier']);
        Route::delete('master/couriers/{id}', [ManagementController::class, 'destroyCourier']);

        Route::put('settings', [ManagementController::class, 'updateSettings']);

        // Pencatatan bukti oleh tim purchasing/finance; verifikasi tetap milik owner & finance.
        Route::post('deposits', [ManagementController::class, 'storeDeposit']);
        Route::post('payments', [ManagementController::class, 'storePayment']);

        // Purchasing mengajukan & me-review pengajuan bayar; keputusan owner/divalidasi transfer
        // dijaga di controller sesuai peran pemanggil.
        Route::get('payment-requests', [ManagementController::class, 'paymentRequests']);
        Route::post('payment-requests', [ManagementController::class, 'storePaymentRequest']);
        Route::patch('payment-requests/{id}', [ManagementController::class, 'updatePaymentRequest']);

        Route::get('notifications', [ManagementController::class, 'notifications']);
    });

    // Data keuangan: owner & finance
    Route::middleware('role:owner,finance')->group(function () {
        Route::get('deposits', [ManagementController::class, 'deposits']);
        Route::patch('deposits/{id}/verify', [ManagementController::class, 'verifyDeposit']);

        Route::get('payments', [ManagementController::class, 'payments']);
        Route::patch('payments/{id}/verify', [ManagementController::class, 'verifyPayment']);
    });

    // Manajemen Pengguna (Tim & Mitra): owner, marketing, finance
    Route::middleware('role:owner,marketing,finance')->group(function () {
        Route::get('users', [ManagementController::class, 'users']);
        Route::post('users', [ManagementController::class, 'storeUser']);
        Route::put('users/{id}', [ManagementController::class, 'updateUser']);
        Route::delete('users/{id}', [ManagementController::class, 'destroyUser']);
    });

    // Data sensitif: owner saja
    Route::middleware('role:owner')->group(function () {
        Route::get('settings', [ManagementController::class, 'settings']);
        Route::get('activity-logs', [ManagementController::class, 'activityLogs']);
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