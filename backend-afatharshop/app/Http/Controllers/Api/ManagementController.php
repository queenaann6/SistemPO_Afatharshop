<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Address;
use App\Models\AppSetting;
use App\Models\BankAccount;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Courier;
use App\Models\DepositTransaction;
use App\Models\Installment;
use App\Models\Invoice;
use App\Models\Level;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\PaymentRequest;
use App\Models\PoBatch;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Support\OrderSerializer;
use App\Support\TerminPlan;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Data lintas modul untuk dashboard marketing, finance, dan owner.
 */
class ManagementController extends Controller
{
    /**
     * Snapshot seluruh data manajemen dalam satu respons agar dashboard
     * hanya perlu satu permintaan dan datanya konsisten antar modul.
     */
    public function bootstrap(): JsonResponse
    {
        $section = function (callable $fn) {
            try {
                $response = $fn();
                if ($response instanceof JsonResponse) {
                    return $response->getData(true)['data'] ?? [];
                }
                return [];
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Bootstrap section failed: ' . $e->getMessage());
                return [];
            }
        };

        return response()->json([
            'success' => true,
            'message' => 'Snapshot data manajemen.',
            'data'    => [
                'orders'           => $section(fn () => $this->orders()),
                'trashed_orders'   => $section(fn () => $this->trashedOrders()),
                'users'            => $section(fn () => $this->users()),
                'products'         => $section(fn () => $this->products()),
                'brands'           => $section(fn () => $this->brands()),
                'categories'       => $section(fn () => $this->categories()),
                'deposits'         => $section(fn () => $this->deposits()),
                'payments'         => $section(fn () => $this->payments()),
                'suppliers'        => $section(fn () => $this->suppliers()),
                'batches'          => $section(fn () => $this->batches()),
                'payment_requests' => $section(fn () => $this->paymentRequests()),
                'notifications'    => $section(fn () => $this->notifications()),
                'bank_accounts'    => $section(fn () => $this->bankAccounts()),
                'couriers'         => $section(fn () => $this->couriers()),
                'settings'         => $section(fn () => $this->settings()),
            ],
        ]);
    }

    public function orders(): JsonResponse
    {
        $orders = Order::active()
            ->with([
                'user',
                'address',
                'items.variant.product.brand',
                'items.variant.product.batch',
                'items.address',
                'invoice.installments',
                'invoice.payments',
            ])
            ->orderByDesc('ordered_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Seluruh pesanan PO.',
            'total'   => $orders->count(),
            'data'    => $orders->map(fn (Order $order) => $this->orderPayload($order))->values(),
        ]);
    }

    public function trashedOrders(): JsonResponse
    {
        $orders = Order::trashedOnly()
            ->with([
                'user',
                'address',
                'items.variant.product.brand',
                'items.variant.product.batch',
                'items.address',
                'invoice.installments',
                'invoice.payments',
            ])
            ->orderByDesc('deleted_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pesanan di arsip terhapus.',
            'total'   => $orders->count(),
            'data'    => $orders->map(fn (Order $order) => $this->orderPayload($order))->values(),
        ]);
    }

    private function findOrderByIdentifier($id, bool $activeOnly = false): ?Order
    {
        $query = $activeOnly ? Order::active() : Order::query();

        return $query
            ->where(function ($q) use ($id) {
                $q->where('id', $id)
                  ->orWhere('order_number', $id)
                  ->orWhereHas('invoice', fn ($iq) => $iq->where('invoice_number', $id));
            })
            ->first();
    }

    public function invoice(Request $request, string $id): JsonResponse
    {
        $order = Order::active()
            ->with([
                'user',
                'address',
                'items.variant.product.brand',
                'items.variant.product.batch',
                'items.address',
                'invoice.installments',
                'invoice.payments',
            ])
            ->where(function ($q) use ($id) {
                $q->where('id', $id)
                  ->orWhere('order_number', $id)
                  ->orWhereHas('invoice', fn ($iq) => $iq->where('id', $id)->orWhere('invoice_number', $id));
            })
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice atau pesanan tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail invoice berhasil dimuat.',
            'data'    => $this->orderPayload($order),
        ]);
    }

    public function users(): JsonResponse
    {
        $users = User::query()->withCount('orders')->orderBy('id')->get();

        $data = $users->map(function (User $user) {
            return [
                'id'              => $user->id,
                'mitra_id'        => $user->mitra_id,
                'name'            => $user->nama,
                'nama'            => $user->nama,
                'email'           => $user->email,
                'role'            => $user->role,
                'level'           => $user->level,
                'phone'           => $user->phone,
                'avatar'          => $user->avatar,
                'city'            => $user->city,
                'deposit_balance' => (float) $user->deposit_balance,
                'is_active'       => (bool) $user->is_active,
                'orders_count'    => (int) ($user->orders_count ?? 0),
                'joined_at'       => optional($user->created_at)->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Daftar pengguna (mitra & tim).',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function deposits(): JsonResponse
    {
        $deposits = DepositTransaction::query()
            ->with(['user', 'bankAccount', 'verifier'])
            ->orderByDesc('created_at')
            ->get();

        $data = $deposits->map(fn (DepositTransaction $deposit) => $this->depositPayload($deposit));

        return response()->json([
            'success' => true,
            'message' => 'Riwayat deposit mitra.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function payments(): JsonResponse
    {
        $payments = Payment::query()
            ->with(['installment', 'verifier', 'invoice.order.user'])
            ->whereHas('invoice.order', fn ($q) => $q->whereNull('deleted_at'))
            ->orderByDesc('uploaded_at')
            ->get();

        $data = $payments->map(function (Payment $payment) {
            $invoice = $payment->invoice;
            $order = $invoice?->order;

            return [
                'id'               => $payment->id,
                'invoice_id'       => $payment->invoice_id,
                'invoice_number'   => $invoice?->invoice_number,
                'order_id'         => $order?->id,
                'order_number'     => $order?->order_number,
                'mitra_id'         => $order?->user_id,
                'mitra_name'       => $order?->user?->nama,
                'amount'           => (float) $payment->amount,
                'stage'            => $payment->installment?->type ?: ($payment->invoice_id ? 'ongkir' : null),
                'installment_id'   => $payment->installment_id,
                'status'           => $payment->status,
                'status_label'     => $this->statusLabel($payment->status),
                'proof_url'        => $payment->proof_url,
                'method'           => $payment->method,
                'bank_name'        => $payment->bank_name,
                'account_number'   => $payment->account_number,
                'note'             => $payment->note,
                'rejection_reason' => $payment->rejection_reason,
                'uploaded_at'      => optional($payment->uploaded_at)->toIso8601String(),
                'verified_by'      => $payment->verifier?->nama,
                'verified_at'      => optional($payment->verified_at)->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Riwayat pembayaran mitra.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function suppliers(): JsonResponse
    {
        $suppliers = Supplier::query()->with('brands')->orderBy('id')->get();

        $data = $suppliers->map(fn (Supplier $supplier) => [
            'id'             => $supplier->id,
            'name'           => $supplier->name,
            'city'           => $supplier->city,
            'phone'          => $supplier->phone,
            'contact_person' => $supplier->contact_person,
            'brands'         => $supplier->brands->pluck('name')->values(),
            'brands_count'   => $supplier->brands->count(),
            'created_at'     => optional($supplier->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar supplier.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function storeSupplier(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $name = trim((string) $request->name);
        if ($this->duplicateName(Supplier::query(), $name)) {
            return $this->duplicateResponse('supplier');
        }

        $sup = Supplier::create([
            'name'           => $name,
            'city'           => $request->city ?? '',
            'phone'          => $request->phone ?? '',
            'contact_person' => $request->contact_person ?? $request->contact ?? '',
        ]);

        $this->logActivity('supplier.create', 'Master Data', "Supplier {$sup->name} ditambahkan");

        return response()->json([
            'success' => true,
            'message' => "Supplier {$sup->name} berhasil ditambahkan.",
            'data'    => $sup,
        ], 201);
    }

    public function updateSupplier(Request $request, $id): JsonResponse
    {
        $sup = Supplier::find($id);
        if (!$sup) {
            return response()->json(['success' => false, 'message' => 'Supplier tidak ditemukan.'], 404);
        }

        if ($request->filled('name')) {
            $name = trim((string) $request->name);
            if ($this->duplicateName(Supplier::query(), $name, (int) $sup->id)) {
                return $this->duplicateResponse('supplier');
            }
            $sup->name = $name;
        }
        if ($request->has('city')) $sup->city = $request->city;
        if ($request->has('phone')) $sup->phone = $request->phone;
        if ($request->has('contact_person') || $request->has('contact')) {
            $sup->contact_person = $request->contact_person ?? $request->contact;
        }
        $sup->save();

        $this->logActivity('supplier.update', 'Master Data', "Supplier {$sup->name} diperbarui");

        return response()->json([
            'success' => true,
            'message' => "Supplier {$sup->name} berhasil diperbarui.",
            'data'    => $sup->load('brands'),
        ]);
    }

    public function destroySupplier($id): JsonResponse
    {
        $sup = Supplier::find($id);
        if (!$sup) {
            return response()->json(['success' => false, 'message' => 'Supplier tidak ditemukan.'], 404);
        }

        $brandCount = $sup->brands()->count();
        if ($brandCount > 0) {
            return $this->linkedResponse('supplier', 'brand', $brandCount);
        }

        $name = $sup->name;
        $sup->delete();

        $this->logActivity('supplier.delete', 'Master Data', "Supplier {$name} dihapus");

        return response()->json([
            'success' => true,
            'message' => "Supplier {$name} berhasil dihapus dari database.",
        ]);
    }

    // Brands
    public function brands(): JsonResponse
    {
        $brands = Brand::with('supplier')->withCount('products')->orderBy('id')->get();
        $data = $brands->map(fn (Brand $b) => [
            'id'                => $b->id,
            'name'              => $b->name,
            'supplier_id'       => $b->supplier_id,
            'supplier'          => $b->supplier?->name ?? '',
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
            'is_active'         => (bool) $b->is_active,
            'active'            => (bool) $b->is_active,
            'products_count'    => $b->products_count,
            'created_at'        => optional($b->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar brand.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function storeBrand(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $name = trim((string) $request->name);
        $existing = Brand::with('supplier')->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => "Brand {$existing->name} sudah terdaftar.",
                'data'    => $existing,
            ], 200);
        }

        $supplierId = null;
        if ($request->filled('supplier')) {
            $sup = Supplier::firstOrCreate(['name' => trim((string) $request->supplier)], ['city' => $request->address ?? 'Solo']);
            $supplierId = $sup->id;
        } elseif ($request->filled('supplier_id')) {
            try {
                $supplierId = $this->resolveMasterRef(Supplier::class, $request->supplier_id, 'supplier_id');
            } catch (\Throwable $e) {
                $supplierId = null;
            }
        }

        $brand = Brand::create([
            'name'              => $name,
            'supplier_id'       => $supplierId,
            'logo'              => $request->logo ?? null,
            'description'       => $request->description ?? null,
            'discount_db_all'   => (float) ($request->discount_db_all ?? $request->discountDBAll ?? 30),
            'discount_sub_db'   => (float) ($request->discount_sub_db ?? $request->discountSubDB ?? 25),
            'discount_agen'     => (float) ($request->discount_agen ?? $request->discountAgen ?? 20),
            'discount_reseller' => (float) ($request->discount_reseller ?? $request->discountReseller ?? 15),
            'is_active'         => $request->boolean('is_active', true),
        ]);

        $this->logActivity('brand.create', 'Master Data', "Brand {$brand->name} ditambahkan");

        $brand->load('supplier');
        return response()->json([
            'success' => true,
            'message' => "Brand {$brand->name} berhasil ditambahkan.",
            'data'    => [
                'id'                => $brand->id,
                'name'              => $brand->name,
                'supplier_id'       => $brand->supplier_id,
                'supplier'          => $brand->supplier?->name ?? ($request->supplier ?? ''),
                'address'           => $request->address ?? $brand->supplier?->city ?? 'Solo',
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
                'discount_type'     => $request->discountType ?? $request->discount_type ?? 'pct',
                'discountType'      => $request->discountType ?? $request->discount_type ?? 'pct',
                'discount_value'    => (float) ($request->discountValue ?? $request->discount_value ?? $brand->discount_db_all ?? 30),
                'discountValue'     => (float) ($request->discountValue ?? $request->discount_value ?? $brand->discount_db_all ?? 30),
                'fee_type'          => $request->feeType ?? $request->fee_type ?? 'pct',
                'feeType'           => $request->feeType ?? $request->fee_type ?? 'pct',
                'is_active'         => (bool) $brand->is_active,
                'active'            => (bool) $brand->is_active,
                'products_count'    => 0,
            ],
        ], 201);
    }

    public function updateBrand(Request $request, $id): JsonResponse
    {
        $cleanId = is_string($id) && preg_match('/^[a-z]+-(\d+)$/i', trim($id), $matches)
            ? (int) $matches[1]
            : (is_numeric($id) ? (int) $id : null);

        $brand = $cleanId ? Brand::find($cleanId) : null;
        if (!$brand && is_string($id)) {
            $brand = Brand::whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($id))])->first();
        }
        if (!$brand && is_numeric($id)) {
            $brand = Brand::find((int) $id);
        }
        if (!$brand && $request->filled('name')) {
            $brand = Brand::whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($request->name))])->first();
        }
        if (!$brand) {
            return response()->json(['success' => false, 'message' => 'Brand tidak ditemukan.'], 404);
        }

        if ($request->filled('name')) {
            $name = trim((string) $request->name);
            if ($this->duplicateName(Brand::query(), $name, (int) $brand->id)) {
                return $this->duplicateResponse('brand');
            }
            $brand->name = $name;
        }
        if ($request->has('is_active') || $request->has('active')) {
            $brand->is_active = (bool) ($request->is_active ?? $request->active);
        }
        if ($request->has('description')) $brand->description = $request->description;
        if ($request->has('discount_db_all') || $request->has('discountDBAll')) {
            $brand->discount_db_all = (float) ($request->discount_db_all ?? $request->discountDBAll);
        }
        if ($request->has('discount_sub_db') || $request->has('discountSubDB')) {
            $brand->discount_sub_db = (float) ($request->discount_sub_db ?? $request->discountSubDB);
        }
        if ($request->has('discount_agen') || $request->has('discountAgen')) {
            $brand->discount_agen = (float) ($request->discount_agen ?? $request->discountAgen);
        }
        if ($request->has('discount_reseller') || $request->has('discountReseller')) {
            $brand->discount_reseller = (float) ($request->discount_reseller ?? $request->discountReseller);
        }

        if ($request->filled('supplier')) {
            $sup = Supplier::firstOrCreate(['name' => trim((string) $request->supplier)], ['city' => $request->address ?? 'Solo']);
            $brand->supplier_id = $sup->id;
        } elseif ($request->filled('supplier_id')) {
            try {
                $brand->supplier_id = $this->resolveMasterRef(Supplier::class, $request->supplier_id, 'supplier_id');
            } catch (\Throwable $e) {
                // Jangan crash bila ID supplier belum terdaftar
                $brand->supplier_id = null;
            }
        } elseif ($request->exists('supplier') && empty($request->supplier)) {
            $brand->supplier_id = null;
        }

        if ($brand->supplier_id && $request->filled('address')) {
            $sup = Supplier::find($brand->supplier_id);
            if ($sup) {
                $sup->city = trim((string) $request->address);
                $sup->save();
            }
        }

        $brand->save();

        $this->logActivity('brand.update', 'Master Data', "Brand {$brand->name} diperbarui");

        $brand->load('supplier');
        return response()->json([
            'success' => true,
            'message' => "Brand {$brand->name} berhasil diperbarui.",
            'data'    => [
                'id'                => $brand->id,
                'name'              => $brand->name,
                'supplier_id'       => $brand->supplier_id,
                'supplier'          => $brand->supplier?->name ?? ($request->supplier ?? ''),
                'address'           => $request->address ?? $brand->supplier?->city ?? 'Solo',
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
                'discount_type'     => $request->discountType ?? $request->discount_type ?? 'pct',
                'discountType'      => $request->discountType ?? $request->discount_type ?? 'pct',
                'discount_value'    => (float) ($request->discountValue ?? $request->discount_value ?? $brand->discount_db_all ?? 30),
                'discountValue'     => (float) ($request->discountValue ?? $request->discount_value ?? $brand->discount_db_all ?? 30),
                'fee_type'          => $request->feeType ?? $request->fee_type ?? 'pct',
                'feeType'           => $request->feeType ?? $request->fee_type ?? 'pct',
                'is_active'         => (bool) $brand->is_active,
                'active'            => (bool) $brand->is_active,
                'products_count'    => $brand->products()->count(),
            ],
        ]);
    }

    public function destroyBrand($id): JsonResponse
    {
        $cleanId = is_string($id) && preg_match('/^[a-z]+-(\d+)$/i', trim($id), $matches)
            ? (int) $matches[1]
            : (is_numeric($id) ? (int) $id : null);

        $brand = $cleanId ? Brand::find($cleanId) : null;
        if (!$brand && is_string($id)) {
            $brand = Brand::whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($id))])->first();
        }
        if (!$brand && is_numeric($id)) {
            $brand = Brand::find((int) $id);
        }
        if (!$brand) {
            return response()->json(['success' => false, 'message' => 'Brand tidak ditemukan.'], 404);
        }

        $productCount = $brand->products()->count();
        if ($productCount > 0) {
            return $this->linkedResponse('brand', 'produk', $productCount);
        }

        $batchCount = PoBatch::where('brand_id', $brand->id)->count();
        if ($batchCount > 0) {
            return $this->linkedResponse('brand', 'batch PO', $batchCount);
        }

        $name = $brand->name;
        $brand->delete();

        $this->logActivity('brand.delete', 'Master Data', "Brand {$name} dihapus");

        return response()->json([
            'success' => true,
            'message' => "Brand {$name} berhasil dihapus dari database.",
        ]);
    }

    // Categories
    public function categories(): JsonResponse
    {
        $categories = Category::withCount('products')->orderBy('name')->get();
        return response()->json([
            'success' => true,
            'message' => 'Daftar kategori.',
            'total'   => $categories->count(),
            'data'    => $categories,
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $name = trim((string) $request->name);
        if ($this->duplicateName(Category::query(), $name)) {
            return $this->duplicateResponse('kategori');
        }

        $cat = Category::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'icon' => $request->icon ?? 'TagIcon',
        ]);

        $this->logActivity('category.create', 'Master Data', "Kategori {$cat->name} ditambahkan");

        return response()->json([
            'success' => true,
            'message' => "Kategori {$cat->name} berhasil ditambahkan.",
            'data'    => $cat,
        ], 201);
    }

    public function updateCategory(Request $request, $id): JsonResponse
    {
        $cat = Category::find($id);
        if (!$cat) {
            return response()->json(['success' => false, 'message' => 'Kategori tidak ditemukan.'], 404);
        }

        if ($request->filled('name')) {
            $name = trim((string) $request->name);
            if ($this->duplicateName(Category::query(), $name, (int) $cat->id)) {
                return $this->duplicateResponse('kategori');
            }
            $cat->name = $name;
            $cat->slug = Str::slug($name);
        }
        if ($request->has('icon')) $cat->icon = $request->icon;
        $cat->save();

        $this->logActivity('category.update', 'Master Data', "Kategori {$cat->name} diperbarui");

        return response()->json([
            'success' => true,
            'message' => "Kategori {$cat->name} berhasil diperbarui.",
            'data'    => $cat,
        ]);
    }

    public function destroyCategory($id): JsonResponse
    {
        $cat = Category::find($id);
        if (!$cat) {
            return response()->json(['success' => false, 'message' => 'Kategori tidak ditemukan.'], 404);
        }

        $productCount = $cat->products()->count();
        if ($productCount > 0) {
            return $this->linkedResponse('kategori', 'produk', $productCount);
        }

        $name = $cat->name;
        $cat->delete();

        $this->logActivity('category.delete', 'Master Data', "Kategori {$name} dihapus");

        return response()->json([
            'success' => true,
            'message' => "Kategori {$name} berhasil dihapus.",
        ]);
    }

    // Products
    public function products(?Request $request = null): JsonResponse
    {
        Product::autoSyncExpired();

        $request = $request ?? request();
        $query = Product::with(['brand.supplier', 'category', 'batch', 'variants', 'prices.level'])
            ->orderBy('id');

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

        if ($request->filled('po_batch_id')) {
            $query->where('po_batch_id', $request->po_batch_id);
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

        $products = $query->get();
        $data = $products->map(fn (Product $p) => $this->productPayload($p));

        return response()->json([
            'success' => true,
            'message' => 'Daftar produk manajemen.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function batches(): JsonResponse
    {
        Product::autoSyncExpired();

        $batches = PoBatch::query()->with(['brand', 'products'])->orderBy('id')->get();

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
        ]);
    }

    public function paymentRequests(): JsonResponse
    {
        $requests = PaymentRequest::query()
            ->with(['creator', 'bankAccount'])
            ->orderByDesc('created_at')
            ->get();

        $data = $requests->map(fn (PaymentRequest $request) => $this->paymentRequestRow($request));

        return response()->json([
            'success' => true,
            'message' => 'Daftar pengajuan pembayaran.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    /**
     * Bentuk respons pengajuan bayar yang dipakai adapter frontend.
     */
    private function paymentRequestRow(PaymentRequest $request): array
    {
        return [
            'id'                  => $request->id,
            'code'                => $request->code,
            'created_by'          => $request->creator?->nama,
            'created_at'          => optional($request->created_at)->toIso8601String(),
            'amount'              => (float) $request->amount,
            'bank'                => $request->bankAccount?->bank_name,
            'bank_account'        => $request->bankAccount?->account_number,
            'bank_holder'         => $request->bankAccount?->account_holder,
            'purpose'             => $request->purpose,
            'reference'           => $request->reference,
            'note'                => $request->note,
            'status'              => $request->status,
            'marketing'           => $request->marketing_by ? [
                'by'       => $request->marketing_by,
                'at'       => optional($request->marketing_at)->toIso8601String(),
                'note'     => $request->marketing_note,
                'decision' => $request->marketing_decision,
            ] : null,
            'owner'               => $request->owner_by ? [
                'by'       => $request->owner_by,
                'at'       => optional($request->owner_at)->toIso8601String(),
                'note'     => $request->owner_note,
                'decision' => $request->owner_decision,
            ] : null,
            'transfer'            => $request->transfer_by ? [
                'by'    => $request->transfer_by,
                'at'    => optional($request->transfer_at)->toIso8601String(),
                'note'  => $request->transfer_note,
                'proof' => $request->transfer_proof,
            ] : null,
        ];
    }

    public function activityLogs(): JsonResponse
    {
        $logs = ActivityLog::query()->with('user')->orderByDesc('created_at')->limit(100)->get();

        $data = $logs->map(fn (ActivityLog $log) => [
            'id'          => $log->id,
            'at'          => optional($log->created_at)->toIso8601String(),
            'by'          => $log->user?->nama,
            'role'        => $log->user?->role,
            'action'      => $log->action,
            'module'      => $log->module,
            'description' => $log->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Audit trail aktivitas.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function notifications(): JsonResponse
    {
        $user = auth('api')->user();
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Notifikasi pengguna.',
                'total'   => 0,
                'data'    => [],
            ]);
        }

        $notifications = Notification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $data = $notifications->map(fn (Notification $notification) => [
            'id'         => $notification->id,
            'title'      => $notification->title,
            'message'    => $notification->message,
            'type'       => $notification->type,
            'is_read'    => (bool) $notification->is_read,
            'created_at' => optional($notification->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi pengguna.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function markNotificationsAsRead(Request $request): JsonResponse
    {
        $userId = auth('api')->id();
        $query = Notification::query();
        if ($userId) {
            $query->where('user_id', $userId);
        }
        $query->where('is_read', false);

        if ($request->filled('id')) {
            $query->where('id', $request->id);
        }

        $query->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi berhasil ditandai sudah dibaca.',
        ]);
    }

    public function settings(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => AppSetting::asMap(),
        ]);
    }

    private const SETTINGS_KEYS = [
        'shopName',
        'senderName',
        'dpPct',
        'pelunasanDueDays',
        'ongkirDueDays',
        'waFooter',
        'instagram',
    ];

    public function updateSettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'shopName'         => 'nullable|string|max:150',
            'senderName'       => 'nullable|string|max:150',
            'dpPct'            => 'nullable|numeric|min:10|max:90',
            'pelunasanDueDays' => 'nullable|integer|min:1|max:365',
            'ongkirDueDays'    => 'nullable|integer|min:1|max:365',
            'waFooter'         => 'nullable|string|max:500',
            'instagram'        => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Pengaturan toko tidak valid.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        foreach (self::SETTINGS_KEYS as $key) {
            if (!$request->has($key)) {
                continue;
            }

            $value = $request->input($key);
            $value = is_string($value) ? trim($value) : $value;

            AppSetting::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        }

        $this->logActivity('settings.update', 'Pengaturan', 'Pengaturan toko diperbarui.');

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan toko tersimpan.',
            'data'    => AppSetting::asMap(),
        ]);
    }

    /**
     * Menyimpan berkas foto/bukti transfer ke public/uploads dan mengembalikan path relatif.
     * Kolom image/proof_url di database hanya menampung URL pendek (max 255 karakter),
     * jadi bukti berupa base64 dari frontend harus diunggah lebih dulu.
     */
    public function uploadFile(Request $request): JsonResponse
    {
        $actor = auth('api')->user();
        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $isAdmin = in_array($actor->role ?? '', ['owner', 'finance', 'marketing'], true);

        $folder = in_array((string) $request->folder, ['proof', 'product', 'avatar', 'avatars'], true)
            ? (string) $request->folder
            : 'proof';

        // Pelanggan/mitra hanya diizinkan mengunggah bukti bayar atau foto profil
        if (!$isAdmin && !in_array($folder, ['proof', 'avatar', 'avatars'], true)) {
            $folder = 'proof';
        }

        $rules = $isAdmin
            ? 'required|file|mimes:jpg,jpeg,png,webp,gif,mp4,mov,webm|max:20480'
            : 'required|file|mimes:jpg,jpeg,png,webp|max:5120';

        $validator = Validator::make($request->all(), [
            'file' => $rules,
        ], [
            'file.required' => 'Berkas wajib dipilih.',
            'file.mimes'    => $isAdmin
                ? 'Berkas harus berupa gambar (JPG, PNG, WEBP) atau video (MP4, WEBM).'
                : 'Berkas harus berupa gambar JPG, PNG, atau WEBP.',
            'file.max'      => $isAdmin
                ? 'Ukuran berkas maksimal 20 MB.'
                : 'Ukuran berkas bukti transfer / foto profil maksimal 5 MB.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first('file') ?: 'Validasi berkas gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $file = $request->file('file');
        $name = $folder . '-' . now()->format('YmdHis') . '-' . Str::random(6) . '.' . strtolower((string) $file->extension());
        $relative = 'uploads/' . $folder . '/' . now()->format('Y-m');

        $targetDir = public_path($relative);
        if (!is_dir($targetDir) && !@mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
            return response()->json([
                'success' => false,
                'message' => 'Folder upload di server tidak dapat dibuat. Periksa izin tulis folder public/.',
            ], 500);
        }

        try {
            $file->move(public_path($relative), $name);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Gagal menyimpan berkas: ' . $e->getMessage()], 500);
        }

        $path = '/' . $relative . '/' . $name;

        $this->logActivity('upload.create', 'Berkas', 'Berkas ' . $path . ' berhasil diunggah');

        return response()->json([
            'success' => true,
            'message' => 'Berkas berhasil diunggah ke server.',
            'data'    => [
                'path' => $path,
                'url'  => $request->getSchemeAndHttpHost() . $path,
            ],
        ], 201);
    }

    public function bankAccounts(?Request $request = null): JsonResponse
    {
        $request ??= request();
        $query = BankAccount::query();
        if ($request && $request->filled('type')) {
            $query->where('type', $request->type);
        }
        $accounts = $query->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar rekening.',
            'total'   => $accounts->count(),
            'data'    => $accounts,
        ]);
    }

    public function storeBankAccount(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'bank_name'      => 'required|string|max:50',
            'account_number' => 'required|string|max:50',
            'account_holder' => 'required|string|max:150',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Data rekening tidak valid.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $exists = BankAccount::where('account_number', trim($request->account_number))->exists();
        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor rekening tersebut sudah terdaftar.',
            ], 409);
        }

        $brands = $request->input('brands');
        if (is_string($brands)) {
            $decoded = json_decode($brands, true);
            $brands = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $brands)));
        }
        if (is_array($brands)) {
            $brands = array_values(array_filter(array_map('trim', $brands)));
        } else {
            $brands = null;
        }

        $type = trim((string) $request->input('type', 'public')) ?: 'public';
        $purpose = trim((string) $request->input('purpose', '')) ?: null;
        if (!$purpose && !empty($brands)) {
            $purpose = 'Brand: ' . implode(', ', $brands);
        }

        $account = BankAccount::create([
            'bank_name'      => trim($request->bank_name),
            'account_number' => trim($request->account_number),
            'account_holder' => trim($request->account_holder),
            'type'           => $type,
            'purpose'        => $purpose,
            'brands'         => $brands,
            'is_active'      => $request->boolean('is_active', true),
        ]);

        $this->logActivity('create', 'bank', "Rekening {$account->bank_name} {$account->account_number} ({$account->type}) ditambahkan.");

        return response()->json([
            'success' => true,
            'message' => "Rekening {$account->bank_name} berhasil ditambahkan.",
            'data'    => $account,
        ], 201);
    }

    public function updateBankAccount(Request $request, $id): JsonResponse
    {
        $account = BankAccount::find($id);
        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Rekening tidak ditemukan.'], 404);
        }

        foreach (['bank_name', 'account_number', 'account_holder', 'type', 'purpose'] as $field) {
            if ($request->has($field)) {
                $value = trim((string) $request->input($field));
                if ($value === '' && in_array($field, ['bank_name', 'account_number', 'account_holder'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Data rekening tidak boleh kosong.',
                    ], 422);
                }
                $account->$field = $value ?: null;
            }
        }

        if ($request->has('brands')) {
            $brands = $request->input('brands');
            if (is_string($brands)) {
                $decoded = json_decode($brands, true);
                $brands = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $brands)));
            }
            if (is_array($brands)) {
                $brands = array_values(array_filter(array_map('trim', $brands)));
            } else {
                $brands = null;
            }
            $account->brands = $brands;
            if (!$account->purpose && !empty($brands)) {
                $account->purpose = 'Brand: ' . implode(', ', $brands);
            }
        }

        if ($request->has('is_active')) {
            $account->is_active = (bool) $request->input('is_active');
        }

        $account->save();
        $this->logActivity('update', 'bank', "Rekening {$account->bank_name} diperbarui.");

        return response()->json([
            'success' => true,
            'message' => "Rekening {$account->bank_name} berhasil diperbarui.",
            'data'    => $account,
        ]);
    }

    public function destroyBankAccount($id): JsonResponse
    {
        $account = BankAccount::find($id);
        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Rekening tidak ditemukan.'], 404);
        }

        $used = DepositTransaction::where('bank_account_id', $account->id)->count();
        if ($used > 0) {
            return $this->linkedResponse('Rekening', 'transaksi deposit', $used);
        }

        $name = $account->bank_name;
        $account->delete();
        $this->logActivity('delete', 'bank', "Rekening {$name} dihapus.");

        return response()->json([
            'success' => true,
            'message' => "Rekening {$name} berhasil dihapus.",
        ]);
    }

    public function couriers(): JsonResponse
    {
        $couriers = Courier::query()->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar ekspedisi.',
            'total'   => $couriers->count(),
            'data'    => $couriers,
        ]);
    }

    public function storeCourier(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Nama ekspedisi wajib diisi.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $name = trim($request->name);
        if ($this->duplicateName(Courier::query(), $name)) {
            return response()->json([
                'success' => false,
                'message' => "Ekspedisi {$name} sudah terdaftar.",
            ], 409);
        }

        $courier = Courier::create([
            'name'        => $name,
            'code'        => trim((string) ($request->code ?: strtoupper(substr($name, 0, 5)))) ?: null,
            'description' => $request->description ?? $request->note ?? null,
            'is_active'   => $request->boolean('is_active', true),
        ]);

        $this->logActivity('create', 'courier', "Ekspedisi {$courier->name} ditambahkan.");

        return response()->json([
            'success' => true,
            'message' => "Ekspedisi {$courier->name} berhasil ditambahkan.",
            'data'    => $courier,
        ], 201);
    }

    public function updateCourier(Request $request, $id): JsonResponse
    {
        $courier = Courier::find($id);
        if (!$courier) {
            return response()->json(['success' => false, 'message' => 'Ekspedisi tidak ditemukan.'], 404);
        }

        if ($request->has('name')) {
            $name = trim((string) $request->input('name'));
            if ($name === '') {
                return response()->json(['success' => false, 'message' => 'Nama ekspedisi tidak boleh kosong.'], 422);
            }
            if ($this->duplicateName(Courier::query(), $name, (int) $courier->id)) {
                return response()->json(['success' => false, 'message' => "Ekspedisi {$name} sudah terdaftar."], 409);
            }
            $courier->name = $name;
        }

        if ($request->has('code')) {
            $courier->code = trim((string) $request->input('code')) ?: $courier->code;
        }
        if ($request->has('description') || $request->has('note')) {
            $courier->description = $request->description ?? $request->note;
        }
        if ($request->has('is_active') || $request->has('active')) {
            $courier->is_active = (bool) ($request->input('is_active') ?? $request->input('active'));
        }

        $courier->save();
        $this->logActivity('update', 'courier', "Ekspedisi {$courier->name} diperbarui.");

        return response()->json([
            'success' => true,
            'message' => "Ekspedisi {$courier->name} berhasil diperbarui.",
            'data'    => $courier,
        ]);
    }

    public function destroyCourier($id): JsonResponse
    {
        $courier = Courier::find($id);
        if (!$courier) {
            return response()->json(['success' => false, 'message' => 'Ekspedisi tidak ditemukan.'], 404);
        }

        $used = Order::where('courier_name', $courier->name)->count();
        if ($used > 0) {
            return $this->linkedResponse('Ekspedisi', 'pesanan', $used);
        }

        $name = $courier->name;
        $courier->delete();
        $this->logActivity('delete', 'courier', "Ekspedisi {$name} dihapus.");

        return response()->json([
            'success' => true,
            'message' => "Ekspedisi {$name} berhasil dihapus.",
        ]);
    }

    private function orderPayload(Order $order): array
    {
        return OrderSerializer::payload($order);
    }

    // =========================================================================
    // 1. USER MANAGEMENT (Owner, Marketing, Finance)
    // =========================================================================
    public function storeUser(Request $request): JsonResponse
    {
        if ($request->filled('email')) {
            $request->merge([
                'email' => strtolower(trim((string) $request->email)),
            ]);
        }

        $validator = Validator::make($request->all(), [
            'email'    => 'required|email|max:150|unique:users,email',
            'nama'     => 'nullable|string|max:150',
            'name'     => 'nullable|string|max:150',
            'role'     => 'nullable|string|max:50',
            'level'    => 'nullable|string|max:50',
            'phone'    => 'nullable|string|max:30',
            'city'     => 'nullable|string|max:100',
            'address'  => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi pembuatan user gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $nama = trim((string) ($request->nama ?? $request->name ?? ''));
        if ($nama === '') {
            return response()->json([
                'success' => false,
                'message' => 'Nama pengguna wajib diisi.',
                'errors'  => ['nama' => ['Nama pengguna wajib diisi.']],
            ], 422);
        }

        $role = strtolower(trim((string) ($request->role ?? 'mitra')));
        if ($role === 'purchasing') $role = 'marketing';
        if ($role === 'keuangan') $role = 'finance';
        if ($role === 'direksi') $role = 'owner';

        $level = strtolower(trim((string) ($request->level ?? '')));
        $level = str_replace(['-', '_'], ' ', $level);

        if ($level === '') {
            $level = $role === 'mitra' ? 'reseller' : $role;
        }

        if ($role !== 'mitra') {
            if (!in_array($role, ['owner', 'finance', 'marketing'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Role harus salah satu dari mitra, owner, finance, atau marketing.',
                ], 422);
            }
            $level = $role;
        } else {
            if (str_contains($level, 'sub')) {
                $level = 'sub db';
            } elseif (str_contains($level, 'agen')) {
                $level = 'agen';
            } elseif (str_contains($level, 'reseller')) {
                $level = 'reseller';
            } elseif (str_contains($level, 'db')) {
                $level = 'db all';
            } elseif (!in_array($level, User::MITRA_LEVELS, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Level mitra harus salah satu dari: ' . implode(', ', User::MITRA_LEVELS) . '.',
                ], 422);
            }
        }

        $password = $request->filled('password') ? (string) $request->password : 'Afathar#123';
        $city = trim((string) ($request->city ?? $request->address ?? ''));

        $user = User::create([
            'nama'            => $nama,
            'email'           => strtolower(trim((string) $request->email)),
            'password'        => $password,
            'level'           => $level,
            'phone'           => $request->phone ?? null,
            'city'            => $city !== '' ? $city : null,
            'deposit_balance' => (float) ($request->deposit_balance ?? 0),
            'is_active'       => $request->boolean('is_active', true),
        ]);

        $this->logActivity('user.create', 'Pengguna', "Pengguna {$user->nama} ({$user->role}/{$user->level}) ditambahkan");
        $this->notify(
            (int) $user->id,
            'Selamat datang di Afathar Shop',
            'Akun kamu sudah aktif. Password awal: ' . $password . ' — segera ganti di profil kamu.',
            'success'
        );

        return response()->json([
            'success' => true,
            'message' => "Pengguna {$user->nama} ({$user->role}) berhasil ditambahkan ke database.",
            'data'    => [
                'id'              => $user->id,
                'nama'            => $user->nama,
                'name'            => $user->nama,
                'email'           => $user->email,
                'role'            => $user->role,
                'level'           => $user->level,
                'phone'           => $user->phone,
                'city'            => $user->city,
                'deposit_balance' => (float) $user->deposit_balance,
                'is_active'       => (bool) $user->is_active,
                'created_at'      => optional($user->created_at)->toIso8601String(),
            ],
        ], 201);
    }

    public function updateUser(Request $request, $id): JsonResponse
    {
        $numericId = is_numeric($id) ? (int) $id : (int) preg_replace('/\D/', '', (string) $id);
        $user = $numericId > 0 ? User::find($numericId) : null;
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User tidak ditemukan.'], 404);
        }

        if ($request->filled('nama') || $request->filled('name')) {
            $user->nama = trim((string) ($request->nama ?? $request->name));
        }
        if ($request->filled('email')) {
            $email = strtolower(trim((string) $request->email));
            if (User::whereRaw('LOWER(email) = ?', [$email])->where('id', '!=', $user->id)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email sudah dipakai pengguna lain.',
                    'errors'  => ['email' => ['Email sudah dipakai pengguna lain.']],
                ], 422);
            }
            $user->email = $email;
        }
        if ($request->filled('phone')) {
            $user->phone = trim((string) $request->phone);
        }
        if ($request->has('city') || $request->has('address')) {
            $user->city = trim((string) ($request->city ?? $request->address ?? ''));
        }
        if ($request->filled('level')) {
            $level = strtolower(trim((string) $request->level));
            $level = str_replace(['-', '_'], ' ', $level);
            if (str_contains($level, 'sub')) {
                $level = 'sub db';
            } elseif (str_contains($level, 'agen')) {
                $level = 'agen';
            } elseif (str_contains($level, 'reseller')) {
                $level = 'reseller';
            } elseif (str_contains($level, 'db')) {
                $level = 'db all';
            }

            $allowed = array_merge(User::MITRA_LEVELS, ['owner', 'finance', 'marketing']);
            if (!in_array($level, $allowed, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Level tidak dikenali: ' . $level,
                ], 422);
            }
            $user->level = $level;
        } elseif ($request->filled('role')) {
            $r = strtolower(trim((string) $request->role));
            if ($r === 'purchasing') $r = 'marketing';
            if ($r === 'keuangan') $r = 'finance';
            if ($r === 'direksi') $r = 'owner';
            if (!in_array($r, ['mitra', 'owner', 'finance', 'marketing'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Role harus salah satu dari mitra, owner, finance, atau marketing.',
                ], 422);
            }
            $user->level = $r === 'mitra' ? ($user->isMitra() ? $user->level : 'reseller') : $r;
        }
        $wasActive = (bool) $user->is_active;
        if ($request->has('is_active')) {
            $user->is_active = $request->boolean('is_active');
        }
        if ($request->has('deposit_balance')) {
            $newBalance = (float) $request->deposit_balance;
            if (abs($newBalance - (float) $user->deposit_balance) > 0.001) {
                $before = (float) $user->deposit_balance;
                $user->deposit_balance = $newBalance;
                DepositTransaction::create([
                    'user_id'        => $user->id,
                    'type'           => 'penyesuaian',
                    'amount'         => $newBalance - $before,
                    'status'         => 'disetujui',
                    'verified_by'    => auth('api')->id(),
                    'verified_at'    => now(),
                    'balance_before' => $before,
                    'balance_after'  => $newBalance,
                    'description'    => 'Penyesuaian saldo oleh ' . (auth('api')->user()?->nama ?? 'admin'),
                    'created_at'     => now(),
                ]);
            }
        }
        if ($request->filled('password')) {
            $pwd = (string) $request->password;
            if (strlen($pwd) < 6) {
                return response()->json([
                    'success' => false,
                    'message' => 'Password minimal 6 karakter.',
                    'errors'  => ['password' => ['Password minimal 6 karakter.']],
                ], 422);
            }
            $user->password = $pwd;
            $this->logActivity('user.password_reset', 'Pengguna', "Password pengguna {$user->nama} diperbarui");
        }
        $user->save();

        if (!$wasActive && $user->is_active) {
            $this->notify(
                (int) $user->id,
                'Akun Mitra Disetujui',
                'Selamat! Pendaftaran akun Anda telah di-ACC oleh Admin. Anda sekarang dapat masuk dan melakukan PO.',
                'success'
            );
            $this->logActivity('user.approve', 'Pengguna', "Akun {$user->nama} ({$user->role}/{$user->level}) di-ACC dan diaktifkan");
        } else {
            $this->logActivity('user.update', 'Pengguna', "Pengguna {$user->nama} ({$user->role}/{$user->level}) diperbarui");
        }

        return response()->json([
            'success' => true,
            'message' => "Data pengguna {$user->nama} berhasil diperbarui di database.",
            'data'    => [
                'id'              => $user->id,
                'nama'            => $user->nama,
                'name'            => $user->nama,
                'email'           => $user->email,
                'role'            => $user->role,
                'level'           => $user->level,
                'phone'           => $user->phone,
                'city'            => $user->city,
                'deposit_balance' => (float) $user->deposit_balance,
                'is_active'       => (bool) $user->is_active,
            ],
        ]);
    }

    public function destroyUser($id): JsonResponse
    {
        $numericId = is_numeric($id) ? (int) $id : (int) preg_replace('/\D/', '', (string) $id);
        $user = $numericId > 0 ? User::find($numericId) : null;
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User tidak ditemukan.'], 404);
        }

        if (auth('api')->id() == $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.'
            ], 400);
        }

        if ($user->role === 'owner') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Owner tidak dapat dihapus demi keamanan sistem.'
            ], 403);
        }

        $orderCount = $user->orders()->count();
        if ($orderCount > 0 && !request()->boolean('force')) {
            return $this->linkedResponse('pengguna', 'pesanan', $orderCount);
        }

        $depositCount = DepositTransaction::where('user_id', $user->id)->count();
        if ($depositCount > 0 && !request()->boolean('force')) {
            return $this->linkedResponse('pengguna', 'riwayat deposit', $depositCount);
        }

        $nama = $user->nama ?? $user->name;

        DB::transaction(function () use ($user) {
            // Hapus seluruh pesanan terkait beserta invoice dan pembayarannya
            foreach ($user->orders as $order) {
                $order->items()->delete();
                $order->statusHistories()->delete();

                if ($order->invoice) {
                    $order->invoice->payments()->delete();
                    $order->invoice->installments()->delete();
                    $order->invoice->delete();
                }

                $order->delete();
            }

            // Hapus riwayat deposit
            DepositTransaction::where('user_id', $user->id)->delete();

            // Hapus keranjang belanja
            if ($user->cart) {
                $user->cart->items()->delete();
                $user->cart->delete();
            }

            // Hapus wishlist, notifikasi, alamat, payment request, dan audit log
            \App\Models\Wishlist::where('user_id', $user->id)->delete();
            Notification::where('user_id', $user->id)->delete();
            $user->addresses()->delete();
            PaymentRequest::where('created_by', $user->id)->delete();
            PaymentRequest::where('marketing_by', $user->id)->update(['marketing_by' => null]);
            PaymentRequest::where('owner_by', $user->id)->update(['owner_by' => null]);
            PaymentRequest::where('transfer_by', $user->id)->update(['transfer_by' => null]);
            ActivityLog::where('user_id', $user->id)->delete();

            // Lepaskan relasi verifier jika user ini pernah memverifikasi transaksi
            Payment::where('verified_by', $user->id)->update(['verified_by' => null]);
            DepositTransaction::where('verified_by', $user->id)->update(['verified_by' => null]);

            $user->delete();
        });

        $this->logActivity('user.delete', 'Pengguna', "Pengguna {$nama} dihapus");

        return response()->json([
            'success' => true,
            'message' => "Pengguna {$nama} berhasil dihapus dari database.",
        ]);
    }

    // =========================================================================
    // 2. PRODUCT MANAGEMENT (Marketing)
    // =========================================================================
    public function storeProduct(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'     => 'nullable|string|max:200',
            'title'    => 'nullable|string|max:200',
            'status'   => 'nullable|in:pre_order,closed_po,ready_stock',
            'price'    => 'nullable|numeric|min:0',
            'image'    => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $name = trim((string) ($request->name ?? $request->title ?? ''));
        if ($name === '') {
            return response()->json([
                'success' => false,
                'message' => 'Nama produk wajib diisi.',
                'errors'  => ['name' => ['Nama produk wajib diisi.']],
            ], 422);
        }

        try {
            $brandId = $this->resolveRef(Brand::class, $request->brand_id, $request->brand, 'brand');
            $categoryId = $this->resolveRef(Category::class, $request->category_id, $request->category, 'kategori');
            $batchId = $this->resolveRef(PoBatch::class, $request->po_batch_id, $request->batch, 'batch PO');
        } catch (\InvalidArgumentException $e) {
            return $this->invalidRefResponse($e->getMessage());
        }

        foreach (['variants', 'prices'] as $listField) {
            if ($request->has($listField) && !is_array($request->{$listField})) {
                return $this->invalidRefResponse("Field {$listField} harus berupa daftar (array).");
            }
        }

        $product = DB::transaction(function () use ($request, $name, $brandId, $categoryId, $batchId) {
            $batchModel = $batchId ? PoBatch::find($batchId) : null;
            $tutupPo = ($request->filled('tutup_po') && ($ts = strtotime($request->tutup_po)) && $ts > 0)
                ? date('Y-m-d H:i:s', $ts)
                : ($batchModel?->close_date ? $batchModel->close_date->format('Y-m-d H:i:s') : null);

            $estShipment = ($request->filled('estimated_shipment') && ($ets = strtotime($request->estimated_shipment)) && $ets > 0)
                ? date('Y-m-d', $ets)
                : ($batchModel?->estimated_shipment ? $batchModel->estimated_shipment->toDateString() : null);

            $status = $request->status ?? 'pre_order';
            if ($batchModel && $batchModel->status === 'closed' && $status === 'pre_order') {
                $status = 'closed_po';
            }

            $articleCode = $request->article_code ?: ($request->series ?: 'ART-' . strtoupper(Str::random(6)));

            $p = Product::create([
                'name'               => $name,
                'article_code'       => $articleCode,
                'brand_id'           => $brandId,
                'category_id'        => $categoryId,
                'po_batch_id'        => $batchId,
                'image'              => $request->image ?? null,
                'image2'             => $request->image2 ?? null,
                'image3'             => $request->image3 ?? null,
                'image4'             => $request->image4 ?? null,
                'image5'             => $request->image5 ?? null,
                'image6'             => $request->image6 ?? null,
                'reel_url'           => $request->reel_url ?? $request->reelUrl ?? $request->video_url ?? null,
                'thumbnails'         => $request->thumbnails ?? array_values(array_filter([$request->image, $request->image2, $request->image3, $request->image4, $request->image5, $request->image6])),
                'series'             => $request->series ?? null,
                'status'             => $status,
                'tutup_po'           => $tutupPo,
                'estimated_shipment' => $estShipment,
                'min_dp_percent'     => (int) ($request->min_dp_percent ?: ($request->dpPct ?: TerminPlan::DEFAULT_DP_PERCENT)),
                'payment_stages'     => $request->input('payment_stages') ?? $request->input('paymentStages') ?? $request->input('stages') ?? null,
                'termin_count'       => (int) ($request->input('terminCount') ?? $request->input('termin_count') ?? 2),
                'stock_quota'        => (int) ($request->stock_quota ?? 50),
                'description'        => $request->description ?? null,
                'material_detail'    => $request->material_detail ?? null,
                'is_sale'            => $request->boolean('is_sale', false),
                'discount_percent'   => (int) ($request->discount_percent ?? 0),
                'original_price'     => $request->original_price ? (float) $request->original_price : null,
                'is_active'          => true,
            ]);

            $this->syncVariants($p, $request->variants, (int) ($request->stock_quota ?? 50));
            $this->syncPrices($p, $request->prices, (float) ($request->price ?? $request->hpp ?? 0));

            return $p->load(['brand.supplier', 'category', 'batch', 'variants', 'prices.level']);
        });

        $this->logActivity('product.create', 'Katalog', "Produk {$product->name} ({$product->article_code}) ditambahkan");

        return response()->json([
            'success' => true,
            'message' => "Produk {$product->name} berhasil disimpan ke database.",
            'data'    => $this->productPayload($product),
        ], 201);
    }

    public function updateProduct(Request $request, $id): JsonResponse
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Produk tidak ditemukan.'], 404);
        }

        try {
            if ($request->has('brand_id') || $request->has('brand')) {
                $product->brand_id = $this->resolveRef(Brand::class, $request->brand_id, $request->brand, 'brand');
            }
            if ($request->has('category_id') || $request->has('category')) {
                $product->category_id = $this->resolveRef(Category::class, $request->category_id, $request->category, 'kategori');
            }
            if ($request->has('po_batch_id') || $request->has('batch')) {
                $product->po_batch_id = $this->resolveRef(PoBatch::class, $request->po_batch_id, $request->batch, 'batch PO');
            }
        } catch (\InvalidArgumentException $e) {
            return $this->invalidRefResponse($e->getMessage());
        }

        foreach (['variants', 'prices'] as $listField) {
            if ($request->has($listField) && !is_array($request->{$listField})) {
                return $this->invalidRefResponse("Field {$listField} harus berupa daftar (array).");
            }
        }

        if ($request->filled('status') && !in_array($request->status, ['pre_order', 'closed_po', 'ready_stock'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Status produk harus pre_order, closed_po, atau ready_stock.',
            ], 422);
        }

        $fields = [
            'name', 'series', 'article_code', 'status', 'description', 'material_detail',
            'image', 'image2', 'image3', 'image4', 'image5', 'image6', 'reel_url', 'thumbnails',
            'is_active', 'is_sale', 'discount_percent', 'original_price',
            'min_dp_percent', 'payment_stages', 'termin_count', 'stock_quota'
        ];
        foreach ($fields as $f) {
            if ($request->has($f)) {
                $product->{$f} = $request->{$f};
            }
        }
        if ($request->has('reelUrl') || $request->has('video_url')) {
            $product->reel_url = $request->input('reelUrl') ?? $request->input('video_url');
        }
        if ($request->has('paymentStages') || $request->has('stages')) {
            $product->payment_stages = $request->input('paymentStages') ?? $request->input('stages');
        }
        if ($request->has('terminCount')) {
            $product->termin_count = (int) $request->input('terminCount');
        }
        if ($request->has('dpPct') && !$request->has('min_dp_percent')) {
            $product->min_dp_percent = (int) $request->input('dpPct');
        }
        if ($request->filled('title')) $product->name = trim((string) $request->title);
        if ($request->filled('tutup_po')) {
            $ts = strtotime($request->tutup_po);
            if ($ts && $ts > 0) {
                $product->tutup_po = date('Y-m-d H:i:s', $ts);
            }
        } elseif ($product->po_batch_id && !$product->tutup_po) {
            $b = PoBatch::find($product->po_batch_id);
            if ($b?->close_date) {
                $product->tutup_po = $b->close_date;
            }
        }
        if ($request->has('estimated_shipment')) {
            $ets = $request->filled('estimated_shipment') ? strtotime($request->estimated_shipment) : false;
            $product->estimated_shipment = ($ets && $ets > 0) ? date('Y-m-d', $ets) : null;
        }

        DB::transaction(function () use ($request, $product) {
            $product->save();

            if ($request->has('variants')) {
                $this->syncVariants($product, $request->variants, (int) ($product->stock_quota ?: 50));
            }
            if ($request->has('prices') || $request->has('price')) {
                $fallback = (float) ($request->price ?? $request->hpp ?? $product->prices->min('price') ?? 0);
                $this->syncPrices($product, $request->prices, $fallback);
            }
        });

        if ($request->hasAny(['payment_stages', 'paymentStages', 'stages', 'terminCount', 'termin_count'])) {
            $this->syncInvoiceInstallmentsForProduct($product->fresh());
        }

        $this->logActivity('product.update', 'Katalog', "Produk {$product->name} diperbarui");

        return response()->json([
            'success' => true,
            'message' => "Produk {$product->name} berhasil diperbarui di database.",
            'data'    => $this->productPayload($product->fresh(['brand.supplier', 'category', 'batch', 'variants', 'prices.level'])),
        ]);
    }

    /**
     * Selarangkan termin invoice pesanan yang belum dibayar dengan
     * payment_stages terbaru di katalog. Invoice yang sudah punya pembayaran
     * atau bukti transfer tidak disentuh agar riwayat validasi tidak rusak.
     */
    protected function syncInvoiceInstallmentsForProduct(Product $product): void
    {
        $stages = TerminPlan::catalogOnly($product);
        if ($stages === null) {
            return;
        }

        $variantIds = $product->variants()->pluck('id');
        if ($variantIds->isEmpty()) {
            return;
        }

        $invoices = Invoice::where('paid_amount', 0)
            ->where('status', '!=', 'lunas')
            ->whereHas('order', function ($q) {
                $q->where('status', 'not like', '%batal%')->where('status', 'not like', '%tolak%');
            })
            ->whereHas('order.items.variant', fn ($q) => $q->whereIn('id', $variantIds))
            ->with(['payments', 'order'])
            ->get();

        foreach ($invoices as $invoice) {
            if ($invoice->payments()->count() > 0) {
                continue;
            }
            $base = round((float) ($invoice->order?->subtotal ?? $invoice->total_amount), 2);
            if ($base <= 0) {
                continue;
            }

            DB::transaction(function () use ($invoice, $stages, $base) {
                $invoice->installments()->delete();
                foreach (TerminPlan::split($base, $stages) as $stage) {
                    Installment::create([
                        'invoice_id'      => $invoice->id,
                        'type'            => $stage['type'],
                        'sequence_number' => $stage['sequence'],
                        'amount'          => $stage['amount'],
                        'paid_amount'     => 0,
                        'status'          => 'belum_bayar',
                        'due_at'          => $stage['due_at'],
                    ]);
                }
            });
        }
    }

    public function destroyProduct($id): JsonResponse
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Produk tidak ditemukan.'], 404);
        }

        $ordered = OrderItem::whereHas('variant', fn ($q) => $q->where('product_id', $product->id))->count();
        if ($ordered > 0) {
            return $this->linkedResponse('produk', 'item pesanan', $ordered);
        }

        $name = $product->name;

        DB::transaction(function () use ($product) {
            $product->variants()->delete();
            $product->prices()->delete();
            $product->delete();
        });

        $this->logActivity('product.delete', 'Katalog', "Produk {$name} dihapus");

        return response()->json([
            'success' => true,
            'message' => "Produk {$name} berhasil dihapus dari database.",
        ]);
    }

    // =========================================================================
    // 3. PO BATCH MANAGEMENT (Marketing)
    // =========================================================================
    public function storeBatch(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'   => 'required|string|max:150',
            'status' => 'nullable|in:open,closed',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $name = trim((string) $request->name);
        if ($this->duplicateName(PoBatch::query(), $name)) {
            return $this->duplicateResponse('batch PO');
        }

        try {
            $brandId = $this->resolveRef(Brand::class, $request->brand_id, $request->brand, 'brand');
        } catch (\InvalidArgumentException $e) {
            return $this->invalidRefResponse($e->getMessage());
        }

        if (!$brandId) {
            return response()->json([
                'success' => false,
                'message' => 'Batch PO wajib terhubung ke satu brand. Pilih brand lebih dulu.',
            ], 422);
        }

        $batch = PoBatch::create([
            'name'               => $name,
            'brand_id'           => $brandId,
            'start_date'         => $request->start_date ? date('Y-m-d', strtotime($request->start_date)) : now()->toDateString(),
            'close_date'         => $request->close_date ? date('Y-m-d H:i:s', strtotime($request->close_date)) : null,
            'estimated_shipment' => $request->estimated_shipment ? date('Y-m-d', strtotime($request->estimated_shipment)) : null,
            'status'             => $request->status ?? 'open',
        ]);

        $this->logActivity('batch.create', 'Batch PO', "Batch {$batch->name} dibuat");

        return response()->json([
            'success' => true,
            'message' => "Batch PO {$batch->name} berhasil dibuat di database.",
            'data'    => $batch->load('brand'),
        ], 201);
    }

    public function updateBatch(Request $request, $id): JsonResponse
    {
        $batch = PoBatch::find($id);
        if (!$batch) {
            return response()->json(['success' => false, 'message' => 'Batch PO tidak ditemukan.'], 404);
        }

        if ($request->filled('name')) {
            $name = trim((string) $request->name);
            if ($this->duplicateName(PoBatch::query(), $name, (int) $batch->id)) {
                return $this->duplicateResponse('batch PO');
            }
            $batch->name = $name;
        }
        if ($request->has('status')) {
            $status = $request->status;
            if (!in_array($status, ['open', 'closed'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Status batch harus open atau closed.',
                ], 422);
            }
            $batch->status = $status;
        }
        if ($request->filled('start_date')) $batch->start_date = date('Y-m-d', strtotime($request->start_date));
        if ($request->filled('close_date')) $batch->close_date = date('Y-m-d H:i:s', strtotime($request->close_date));
        if ($request->filled('estimated_shipment')) $batch->estimated_shipment = date('Y-m-d', strtotime($request->estimated_shipment));

        try {
            if ($request->has('brand_id') || $request->has('brand')) {
                $batch->brand_id = $this->resolveRef(Brand::class, $request->brand_id, $request->brand, 'brand');
            }
        } catch (\InvalidArgumentException $e) {
            return $this->invalidRefResponse($e->getMessage());
        }

        $batch->save();

        // Sinkronisasi status batch dan jadwal ke produk yang terhubung
        $productUpdates = [];
        if ($request->has('status')) {
            $productUpdates['status'] = $batch->status === 'closed' ? 'closed_po' : 'pre_order';
        }
        if ($request->filled('close_date')) {
            $productUpdates['tutup_po'] = $batch->close_date;
        }
        if ($request->filled('estimated_shipment')) {
            $productUpdates['estimated_shipment'] = $batch->estimated_shipment;
        }
        if (!empty($productUpdates)) {
            Product::where('po_batch_id', $batch->id)->update($productUpdates);
        }

        $this->logActivity('batch.update', 'Batch PO', "Batch {$batch->name} diperbarui");

        return response()->json([
            'success' => true,
            'message' => "Batch PO {$batch->name} berhasil diperbarui di database.",
            'data'    => $batch->load('brand'),
        ]);
    }

    public function destroyBatch($id): JsonResponse
    {
        $batch = PoBatch::find($id);
        if (!$batch) {
            return response()->json(['success' => false, 'message' => 'Batch PO tidak ditemukan.'], 404);
        }

        $productCount = $batch->products()->count();
        if ($productCount > 0) {
            return $this->linkedResponse('batch PO', 'produk', $productCount);
        }

        $name = $batch->name;
        $batch->delete();

        $this->logActivity('batch.delete', 'Batch PO', "Batch {$name} dihapus");

        return response()->json([
            'success' => true,
            'message' => "Batch PO {$name} berhasil dihapus dari database.",
        ]);
    }

    // =========================================================================
    // 4a. INVOICE EDIT (Finance mengubah rincian tagihan & termin)
    // =========================================================================

    /**
     * Ubah produk, diskon, addon, dan DP sebuah invoice. Semua nominal dihitung
     * ulang di server lalu jadwal termin disusun kembali dari payment_stages
     * katalog, jadi dashboard tidak lagi menyimpan angkanya sendiri.
     */
    public function updateOrderInvoice(Request $request, $id): JsonResponse
    {
        Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|integer|min:1',
            'items.*.product_variant_id' => 'nullable|integer|min:1',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_pct' => 'nullable|numeric|min:0|max:100',
            'items.*.addon' => 'nullable|numeric|min:0',
            'dp_pct' => 'nullable|numeric|min:1|max:100',
            'shipping_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ])->validate();

        $order = $this->findOrderByIdentifier($id, true);
        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Pesanan tidak ditemukan.'], 404);
        }
        if ($order->invoice && $order->invoice->status === 'lunas') {
            return response()->json([
                'success' => false,
                'message' => 'Invoice sudah lunas sehingga rincian tagihan tidak dapat diubah.',
            ], 422);
        }

        $lines = $this->normalizeInvoiceLines($request->input('items'));
        $subtotal = round(array_sum(array_column($lines, 'subtotal')), 2);
        if ($subtotal <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Subtotal tagihan harus lebih dari nol.',
            ], 422);
        }

        $variantIds = array_values(array_unique(array_filter(array_column($lines, 'variant_id'))));
        if ($variantIds) {
            $known = ProductVariant::whereIn('id', $variantIds)->pluck('id')->all();
            $unknown = array_diff($variantIds, array_map('intval', $known));
            if ($unknown) {
                return response()->json([
                    'success' => false,
                    'message' => 'Varian produk tidak ditemukan di katalog: ' . implode(', ', $unknown) . '.',
                ], 422);
            }
        }

        $edited = DB::transaction(function () use ($request, $order, $lines, $subtotal) {
            $locked = Order::where('id', $order->id)->lockForUpdate()->first();

            if ($request->has('shipping_cost')) {
                $locked->shipping_cost = max(0, (float) $request->input('shipping_cost'));
            }
            if ($request->has('notes')) {
                $locked->notes = $request->input('notes');
            }
            $locked->subtotal = $subtotal;
            $locked->total_amount = round($subtotal + (float) $locked->shipping_cost, 2);
            $locked->save();

            $this->syncOrderItems($locked, $lines);
            $this->rescheduleInstallments($locked, $request->has('dp_pct') ? (float) $request->input('dp_pct') : null);

            $invoice = $locked->invoice;
            if ($invoice) {
                $this->syncInvoiceTotals($invoice);
            }

            return $locked;
        });

        $this->logActivity(
            'order.invoice',
            'Pesanan',
            "{$edited->order_number}: rincian tagihan diperbarui menjadi Rp " . number_format($edited->total_amount, 0, ',', '.')
        );

        if ($edited->user_id) {
            $this->notify(
                (int) $edited->user_id,
                'Tagihan diperbarui',
                "Invoice {$edited->order_number} diperbarui admin Finance. Total kini Rp "
                    . number_format($edited->total_amount, 0, ',', '.') . '.',
                'order'
            );
        }

        return response()->json([
            'success' => true,
            'message' => "Rincian tagihan {$edited->order_number} berhasil diperbarui.",
            'data'    => $this->orderPayload($edited->fresh([
                'user', 'address', 'items.variant.product.brand', 'invoice.installments', 'invoice.payments',
            ])),
        ]);
    }

    /**
     * Hitung ulang tiap baris produk: diskon persen dipotong dari gross, addon
     * ditambahkan setelahnya.
     */
    protected function normalizeInvoiceLines(array $rows): array
    {
        $lines = [];
        foreach ($rows as $row) {
            $qty = max(1, (int) ($row['quantity'] ?? 1));
            $price = round((float) ($row['unit_price'] ?? 0), 2);
            $gross = round($price * $qty, 2);
            $discountPct = max(0, min(100, (float) ($row['discount_pct'] ?? 0)));
            $discount = min($gross, round($gross * $discountPct / 100, 2));
            $addonTotal = round(max(0, (float) ($row['addon'] ?? 0)) * $qty, 2);

            $lines[] = [
                'id' => isset($row['id']) ? (int) $row['id'] : null,
                'variant_id' => isset($row['product_variant_id']) ? (int) $row['product_variant_id'] : null,
                'quantity' => $qty,
                'unit_price' => $price,
                'gross' => $gross,
                'discount' => $discount,
                'addon_total' => $addonTotal,
                'subtotal' => round($gross - $discount + $addonTotal, 2),
            ];
        }

        return $lines;
    }

    /**
     * Sinkronkan baris order_items dengan hasil hitungan invoice editor.
     * Kolom fee lama tetap diisi (addon - diskon) supaya data lama yang
     * membacanya tidak berubah makna.
     */
    protected function syncOrderItems(Order $order, array $lines): void
    {
        $existing = $order->items()->get()->keyBy('id');
        $keep = [];

        foreach ($lines as $line) {
            $data = [
                'product_variant_id' => $line['variant_id'],
                'quantity' => $line['quantity'],
                'unit_price' => $line['unit_price'],
                'fee' => round($line['addon_total'] - $line['discount'], 2),
                'discount_nominal' => $line['discount'],
                'addon_nominal' => $line['addon_total'],
                'subtotal' => $line['subtotal'],
            ];

            $item = $line['id'] !== null ? $existing->get($line['id']) : null;
            if ($item) {
                $item->fill($data)->save();
            } else {
                $item = $order->items()->create(array_merge($data, ['created_at' => now()]));
            }
            $keep[] = $item->id;
        }

        $order->items()->whereNotIn('id', $keep)->delete();
    }

    /**
     * Susun ulang jadwal termin di atas subtotal (ongkir ditagih terpisah lewat
     * payment tanpa installment_id). Termin yang sudah punya pembayaran
     * dibiarkan utuh supaya riwayat bukti bayar tidak rusak.
     */
    protected function rescheduleInstallments(Order $order, ?float $dpPct): void
    {
        $invoice = $order->invoice;
        if (!$invoice) {
            return;
        }

        $base = round((float) $order->subtotal, 2);
        $firstItem = $order->items()->with('variant.product')->first();
        $stages = TerminPlan::forProduct($firstItem?->variant?->product, $dpPct, now());

        $byType = $invoice->installments()->get()->keyBy('type');
        $lockedSum = 0.0;
        $keep = [];
        $free = [];

        foreach ($stages as $index => $stage) {
            $row = $byType->get($stage['type']);
            if ($row && $this->isInstallmentLocked($row)) {
                $lockedSum += (float) $row->amount;
                $keep[] = $row->id;
                continue;
            }
            $free[$index] = ['stage' => $stage, 'row' => $row];
        }

        $remaining = max(0, round($base - $lockedSum, 2));
        $amounts = TerminPlan::split($remaining, TerminPlan::rescale(array_values(array_column($free, 'stage'))));
        $freeIndexes = array_keys($free);

        foreach ($amounts as $offset => $stage) {
            $row = $free[$freeIndexes[$offset]]['row'];
            $data = [
                'invoice_id'      => $invoice->id,
                'type'            => $stage['type'],
                'sequence_number' => $stage['sequence'],
                'amount'          => $stage['amount'],
                'due_at'          => $stage['due_at'],
            ];
            if ($row) {
                $row->fill($data)->save();
            } else {
                $row = Installment::create(array_merge($data, ['paid_amount' => 0, 'status' => 'belum_bayar']));
            }
            $keep[] = $row->id;
        }

        $invoice->installments()->whereNotIn('id', $keep)->delete();
    }

    protected function isInstallmentLocked(Installment $row): bool
    {
        if ((float) $row->paid_amount > 0 || $row->status === 'lunas') {
            return true;
        }

        return Payment::where('installment_id', $row->id)->exists();
    }

    /**
     * Satu rumus untuk saldo invoice: pembayaran termin (dari baris installment)
     * ditambah pembayaran di luar termin seperti ongkir.
     */
    protected function syncInvoiceTotals(Invoice $invoice): void
    {
        $installmentPaid = (float) $invoice->installments()->sum('paid_amount');
        $stagelessPaid = (float) Payment::where('invoice_id', $invoice->id)
            ->whereNull('installment_id')
            ->where('status', 'disetujui')
            ->sum('amount');

        $paid = round($installmentPaid + $stagelessPaid, 2);
        $total = round((float) ($invoice->order?->total_amount ?? $invoice->total_amount), 2);

        $invoice->total_amount = $total;
        $invoice->paid_amount = $paid;
        $invoice->outstanding_amount = max(0, round($total - $paid, 2));
        $invoice->status = ($total > 0 && $invoice->outstanding_amount <= 0) ? 'lunas' : 'belum_lunas';
        $invoice->save();
    }

    // =========================================================================
    // 4a. ORDER CREATE (Manual Order dari Marketing / Finance / Owner)
    // =========================================================================
    public function storeOrder(Request $request): JsonResponse
    {
        $rawItems = $request->input('items', []);
        if (is_array($rawItems)) {
            $rawItems = array_map(function ($item) {
                if (empty($item['product_variant_id']) && !empty($item['variant_id'])) {
                    $item['product_variant_id'] = $item['variant_id'];
                }
                if (!empty($item['product_variant_id'])) {
                    $exists = ProductVariant::where('id', $item['product_variant_id'])->exists();
                    if (!$exists) {
                        $item['product_variant_id'] = null;
                    }
                }

                $productId = $item['product_id'] ?? $item['produkId'] ?? $item['produk_id'] ?? null;
                if (empty($item['product_variant_id']) && !empty($productId)) {
                    $vQuery = ProductVariant::where('product_id', $productId);
                    if (!empty($item['model'])) $vQuery->where('model', $item['model']);
                    if (!empty($item['size'])) $vQuery->where('size', $item['size']);
                    if (!empty($item['color'])) $vQuery->where('color', $item['color']);
                    $item['product_variant_id'] = $vQuery->value('id') ?? ProductVariant::where('product_id', $productId)->value('id');

                    if (empty($item['product_variant_id'])) {
                        $prod = Product::find($productId);
                        if ($prod) {
                            $v = ProductVariant::create([
                                'product_id' => $prod->id,
                                'model'      => $item['model'] ?? 'Standar',
                                'size'       => $item['size'] ?? 'ALL',
                                'color'      => $item['color'] ?? 'Default',
                                'sku'        => 'SKU-' . strtoupper(Str::random(6)),
                                'stock'      => 100,
                                'price'      => $prod->price,
                                'is_active'  => true,
                            ]);
                            $item['product_variant_id'] = $v->id;
                        }
                    }
                }

                if (empty($item['product_variant_id'])) {
                    $item['product_variant_id'] = ProductVariant::whereHas('product', fn ($q) => $q->where('is_active', true))->value('id');
                }

                if (!isset($item['quantity']) && isset($item['qty'])) {
                    $item['quantity'] = $item['qty'];
                }
                if (!isset($item['unit_price']) && isset($item['price'])) {
                    $item['unit_price'] = $item['price'];
                }

                return $item;
            }, $rawItems);
            $request->merge(['items' => $rawItems]);
        }

        $validator = Validator::make($request->all(), [
            'total_amount'               => 'nullable|numeric|min:0',
            'subtotal'                   => 'nullable|numeric|min:0',
            'shipping_cost'              => 'nullable|numeric|min:0',
            'user_id'                    => 'nullable|integer',
            'mitra_id'                   => 'nullable|integer',
            'address_id'                 => 'nullable|integer',
            'courier_name'               => 'nullable|string|max:100',
            'notes'                      => 'nullable|string',
            'items'                      => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|integer',
            'items.*.quantity'           => 'required|integer|min:1',
            'items.*.unit_price'         => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi pembuatan pesanan gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $userId = $request->input('user_id') ?? $request->input('mitra_id');
        $user = $userId ? User::find($userId) : null;
        if (!$user) {
            $user = auth('api')->user();
        }

        $variants = ProductVariant::with('product')
            ->whereIn('id', collect($request->items)->pluck('product_variant_id'))
            ->get()
            ->keyBy('id');

        $computedSubtotal = 0.0;
        $resolvedLines = [];
        foreach ($request->items as $item) {
            $amounts = OrderSerializer::resolveLineAmounts($item);
            $computedSubtotal += $amounts['subtotal'];
            $resolvedLines[] = array_merge($amounts, [
                'product_variant_id' => $item['product_variant_id'],
            ]);
        }

        $subtotal = (float) ($request->subtotal ?? $computedSubtotal);
        if ($computedSubtotal > 0 && abs($computedSubtotal - $subtotal) > 1) {
            $subtotal = round($computedSubtotal, 2);
        }

        $shippingCost = (float) ($request->shipping_cost ?? $request->ongkir ?? 0);
        $totalAmount = (float) ($request->total_amount ?? ($subtotal + $shippingCost));
        if (abs(($subtotal + $shippingCost) - $totalAmount) > 1) {
            $totalAmount = round($subtotal + $shippingCost, 2);
        }

        $status = $request->input('status', 'Menunggu DP');
        $marketingStatus = strtoupper(trim((string) $request->input(
            'marketing_status',
            stripos($status, 'menunggu acc') !== false ? 'PENDING' : 'ACC'
        )));
        $marketingBy = $request->input('marketing_by') ?? ($marketingStatus === 'ACC' ? (auth('api')->user()?->nama ?? 'Purchasing') : null);
        $marketingAt = $marketingStatus === 'ACC'
            ? ($request->filled('marketing_at') ? Carbon::parse($request->marketing_at) : now())
            : null;

        $order = DB::transaction(function () use ($request, $user, $status, $marketingStatus, $marketingBy, $marketingAt, $totalAmount, $subtotal, $shippingCost, $variants, $resolvedLines) {
            $requestedOrderNumber = trim((string) ($request->order_number ?? $request->orderNo ?? ''));
            if ($requestedOrderNumber && !Order::where('order_number', $requestedOrderNumber)->exists()) {
                $orderNumber = $requestedOrderNumber;
            } else {
                $orderNumber = 'PO-' . date('Ymd') . '-' . strtoupper(Str::random(5));
            }

            $order = Order::create([
                'user_id'          => $user ? $user->id : auth('api')->id(),
                'address_id'       => $request->address_id,
                'order_number'     => $orderNumber,
                'status'           => $status,
                'marketing_status' => $marketingStatus,
                'marketing_by'     => $marketingBy,
                'marketing_at'     => $marketingAt,
                'marketing_note'   => $request->input('marketing_note'),
                'production_status'=> $request->input('production_status', 'Antrian'),
                'courier_name'     => $request->courier_name ?: $request->ekspedisi,
                'tracking_number'  => $request->tracking_number ?: $request->resi,
                'notes'            => $request->notes,
                'is_split_address' => (bool) $request->input('is_split_address', false),
                'subtotal'         => $subtotal,
                'shipping_cost'    => $shippingCost,
                'total_amount'     => $totalAmount,
                'ordered_at'       => now(),
            ]);

            OrderStatusHistory::create([
                'order_id'   => $order->id,
                'status'     => $status,
                'note'       => 'Pesanan manual dibuat oleh ' . (auth('api')->user()?->nama ?? 'Admin/Marketing'),
                'changed_by' => auth('api')->id(),
                'created_at' => now(),
            ]);

            foreach ($resolvedLines as $line) {
                OrderItem::create([
                    'order_id'           => $order->id,
                    'product_variant_id' => $line['product_variant_id'],
                    'quantity'           => $line['quantity'],
                    'unit_price'         => $line['unit_price'],
                    'fee'                => $line['fee'],
                    'discount_nominal'   => $line['discount_nominal'],
                    'addon_nominal'      => $line['addon_nominal'],
                    'subtotal'           => $line['subtotal'],
                    'created_at'         => now(),
                ]);
            }

            $requestedInvoiceNumber = trim((string) ($request->invoice ?? $request->invoice_number ?? ''));
            if ($requestedInvoiceNumber && !Invoice::where('invoice_number', $requestedInvoiceNumber)->exists()) {
                $invoiceNumber = $requestedInvoiceNumber;
            } else {
                $invoiceNumber = 'INV/' . date('Y/m') . '/' . str_pad((string) $order->id, 5, '0', STR_PAD_LEFT);
                if (Invoice::where('invoice_number', $invoiceNumber)->exists()) {
                    $invoiceNumber .= '-' . strtoupper(Str::random(3));
                }
            }

            $invoice = Invoice::create([
                'order_id'           => $order->id,
                'invoice_number'     => $invoiceNumber,
                'total_amount'       => $totalAmount,
                'paid_amount'        => 0,
                'outstanding_amount' => $totalAmount,
                'status'             => 'belum_lunas',
                'due_at'             => now()->addDays(3),
            ]);

            $product = $variants->first()?->product;
            $plan = TerminPlan::split($subtotal, TerminPlan::forProduct($product, null, now()));

            foreach ($plan as $stage) {
                Installment::create([
                    'invoice_id'      => $invoice->id,
                    'type'            => $stage['type'],
                    'sequence_number' => $stage['sequence'],
                    'amount'          => $stage['amount'],
                    'paid_amount'     => 0,
                    'status'          => 'belum_bayar',
                    'due_at'          => $stage['due_at'],
                ]);
            }

            return $order->load(['items.variant.product.brand', 'invoice.installments', 'invoice.payments', 'address', 'user']);
        });

        $this->logActivity('order.create', 'Order', 'Pesanan ' . $order->order_number . ' dibuat manual oleh ' . (auth('api')->user()?->nama ?? 'Admin'));

        return response()->json([
            'success' => true,
            'message' => 'Pesanan berhasil dibuat.',
            'data'    => $this->orderPayload($order->fresh([
                'user', 'address', 'items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments',
            ])),
        ], 201);
    }

    // =========================================================================
    // 4b. ORDER UPDATE (Items, Split Alamat, Kurir, Catatan)
    // =========================================================================
    public function updateOrder(Request $request, $id): JsonResponse
    {
        $orderRes = app(OrderController::class)->update($request, (string) $id);
        $orderData = $orderRes->getData(true);

        if (!$orderRes->isSuccessful()) {
            return response()->json($orderData, $orderRes->getStatusCode());
        }

        $order = $this->findOrderByIdentifier($id, true);

        return response()->json([
            'success' => true,
            'message' => $orderData['message'] ?? 'Pesanan berhasil diperbarui.',
            'data'    => $order ? $this->orderPayload($order) : ($orderData['data'] ?? null),
        ], 200);
    }

    // =========================================================================
    // 4c. ORDER STATUS (Marketing ACC / Resi / Pengiriman)
    // =========================================================================
    public function updateOrderStatus(Request $request, $id): JsonResponse
    {
        $order = $this->findOrderByIdentifier($id, true);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Pesanan tidak ditemukan.'], 404);
        }

        $prevStatus = $order->status;
        if ($request->filled('status')) {
            $order->status = trim((string) $request->status);
        }

        $marketingStatus = strtoupper(trim((string) ($request->input('marketing_status') ?? $request->input('marketingStatus') ?? '')));
        if ($marketingStatus !== '') {
            $order->marketing_status = $marketingStatus;
            if ($request->filled('marketing_by') || $request->filled('marketingBy')) {
                $order->marketing_by = trim((string) ($request->input('marketing_by') ?? $request->input('marketingBy')));
            } elseif (in_array($marketingStatus, ['ACC', 'TOLAK'], true)) {
                $order->marketing_by = auth('api')->user()?->nama ?? $order->marketing_by;
            }
            if ($request->filled('marketing_at') || $request->filled('marketingAt')) {
                $order->marketing_at = Carbon::parse($request->input('marketing_at') ?? $request->input('marketingAt'));
            } elseif (in_array($marketingStatus, ['ACC', 'TOLAK'], true)) {
                $order->marketing_at = now();
            }
            if ($marketingStatus === 'PENDING') {
                $order->marketing_note = null;
            }
        }
        if ($request->has('marketing_note') || $request->has('marketingNote')) {
            $mNote = $request->input('marketing_note') ?? $request->input('marketingNote');
            $order->marketing_note = $mNote !== '' ? $mNote : null;
        }

        if ($request->filled('courier_name')) {
            $order->courier_name = trim((string) $request->courier_name);
        }
        if ($request->filled('tracking_number')) {
            $order->tracking_number = trim((string) $request->tracking_number);
            $order->shipped_at = $request->filled('shipped_at') || $request->filled('shippedAt')
                ? Carbon::parse($request->input('shipped_at') ?? $request->input('shippedAt'))
                : ($order->shipped_at ?? now());
        }
        if ($request->has('production_status')) {
            $production = trim((string) $request->production_status);
            if ($production !== '' && !in_array($production, ['Antrian', 'Produksi', 'Ready'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Status produksi harus Antrian, Produksi, atau Ready.',
                ], 422);
            }
            $order->production_status = $production !== '' ? $production : null;
            if ($production === 'Ready') {
                $order->ready_at = $request->filled('ready_at') || $request->filled('readyAt')
                    ? Carbon::parse($request->input('ready_at') ?? $request->input('readyAt'))
                    : ($order->ready_at ?? now());
            }
        }
        if ($request->filled('ready_at') || $request->filled('readyAt')) {
            $order->ready_at = Carbon::parse($request->input('ready_at') ?? $request->input('readyAt'));
        }
        if ($request->has('notes')) {
            $order->notes = $request->notes;
        }
        if ($request->has('shipping_cost')) {
            $shipping = max(0, (float) $request->shipping_cost);
            $order->shipping_cost = $shipping;
            $order->total_amount = round((float) $order->subtotal + $shipping, 2);
            $order->ongkir_at = $request->filled('ongkir_at') || $request->filled('ongkirAt')
                ? Carbon::parse($request->input('ongkir_at') ?? $request->input('ongkirAt'))
                : ($order->ongkir_at ?? now());
        }
        if ($request->has('weight_kg') || $request->has('weight')) {
            $rawWeight = $request->input('weight_kg') ?? $request->input('weight');
            $order->weight_kg = $rawWeight !== '' && $rawWeight !== null ? max(0, (float) $rawWeight) : null;
        }
        if ($request->has('shipping_note') || $request->has('shippingNote')) {
            $order->shipping_note = $request->input('shipping_note') ?? $request->input('shippingNote');
        }
        if ($request->filled('ongkir_at') || $request->filled('ongkirAt')) {
            $order->ongkir_at = Carbon::parse($request->input('ongkir_at') ?? $request->input('ongkirAt'));
        }
        if ($request->filled('shipped_at') || $request->filled('shippedAt')) {
            $order->shipped_at = Carbon::parse($request->input('shipped_at') ?? $request->input('shippedAt'));
        }
        if ($request->filled('received_at') || $request->filled('receivedAt')) {
            $order->received_at = Carbon::parse($request->input('received_at') ?? $request->input('receivedAt'));
        } elseif (strcasecmp((string) $order->status, 'Selesai') === 0 && !$order->received_at) {
            $order->received_at = now();
        }
        if (strcasecmp((string) $order->status, 'Dikirim') === 0 && !$order->shipped_at) {
            $order->shipped_at = now();
        }
        $order->save();

        // Sinkronisasi status termin DP / Pelunasan / Ongkir bila dikirim dari Finance
        $invoice = $order->invoice;
        if ($invoice) {
            $dpStatusReq = strtoupper(trim((string) ($request->input('dpStatus') ?? $request->input('dp_status') ?? '')));
            if ($dpStatusReq === 'ACC' || $dpStatusReq === 'LUNAS') {
                $dpInstallment = $invoice->installments()->where('type', 'dp')->first();
                if ($dpInstallment) {
                    $dpInstallment->status = 'lunas';
                    $dpInstallment->paid_amount = $dpInstallment->amount;
                    $dpInstallment->save();

                    Payment::where('installment_id', $dpInstallment->id)
                        ->where('status', 'menunggu_verifikasi')
                        ->update([
                            'status'      => 'disetujui',
                            'verified_by' => auth('api')->id(),
                            'verified_at' => now(),
                        ]);
                }
            } elseif (in_array($dpStatusReq, ['TOLAK', 'DITOLAK'], true)) {
                $dpInstallment = $invoice->installments()->where('type', 'dp')->first();
                if ($dpInstallment) {
                    Payment::where('installment_id', $dpInstallment->id)
                        ->where('status', 'menunggu_verifikasi')
                        ->update([
                            'status'           => 'ditolak',
                            'rejection_reason' => $request->input('note') ?? 'Ditolak Finance',
                            'verified_by'      => auth('api')->id(),
                            'verified_at'      => now(),
                        ]);
                }
            }

            $pelunasanStatusReq = strtoupper(trim((string) ($request->input('pelunasanStatus') ?? $request->input('pelunasan_status') ?? '')));
            if ($pelunasanStatusReq === 'ACC' || $pelunasanStatusReq === 'LUNAS') {
                $pelInstallment = $invoice->installments()->where('type', 'pelunasan')->first();
                if ($pelInstallment) {
                    $pelInstallment->status = 'lunas';
                    $pelInstallment->paid_amount = $pelInstallment->amount;
                    $pelInstallment->save();

                    Payment::where('installment_id', $pelInstallment->id)
                        ->where('status', 'menunggu_verifikasi')
                        ->update([
                            'status'      => 'disetujui',
                            'verified_by' => auth('api')->id(),
                            'verified_at' => now(),
                        ]);
                }
            } elseif (in_array($pelunasanStatusReq, ['TOLAK', 'DITOLAK'], true)) {
                $pelInstallment = $invoice->installments()->where('type', 'pelunasan')->first();
                if ($pelInstallment) {
                    Payment::where('installment_id', $pelInstallment->id)
                        ->where('status', 'menunggu_verifikasi')
                        ->update([
                            'status'           => 'ditolak',
                            'rejection_reason' => $request->input('note') ?? 'Ditolak Finance',
                            'verified_by'      => auth('api')->id(),
                            'verified_at'      => now(),
                        ]);
                }
            }

            $ongkirStatusReq = strtoupper(trim((string) ($request->input('ongkirStatus') ?? $request->input('ongkir_status') ?? '')));
            if ($ongkirStatusReq === 'ACC' || $ongkirStatusReq === 'LUNAS') {
                Payment::where('invoice_id', $invoice->id)
                    ->whereNull('installment_id')
                    ->where('status', 'menunggu_verifikasi')
                    ->update([
                        'status'      => 'disetujui',
                        'verified_by' => auth('api')->id(),
                        'verified_at' => now(),
                    ]);
            } elseif (in_array($ongkirStatusReq, ['TOLAK', 'DITOLAK'], true)) {
                Payment::where('invoice_id', $invoice->id)
                    ->whereNull('installment_id')
                    ->where('status', 'menunggu_verifikasi')
                    ->update([
                        'status'           => 'ditolak',
                        'rejection_reason' => $request->input('note') ?? 'Ditolak Finance',
                        'verified_by'      => auth('api')->id(),
                        'verified_at'      => now(),
                    ]);
            }

            // Saldo invoice dihitung dengan satu rumus yang sama seperti
            // verifikasi pembayaran, termasuk ongkir yang tidak punya termin.
            $this->syncInvoiceTotals($invoice);
            if ($invoice->status === 'lunas' && in_array($order->status, ['Menunggu Pelunasan + Ongkir', 'Menunggu Pelunasan', 'Menunggu Pembayaran Sisa Pelunasan + Ongkir'], true)) {
                $order->status = 'Siap Kirim';
                $order->ready_at = $order->ready_at ?? now();
                $order->save();
            }
        }

        if ($order->status !== $prevStatus) {
            $historyStatus = $this->historyStatus($order->status);
            if ($historyStatus) {
                OrderStatusHistory::create([
                    'order_id'   => $order->id,
                    'status'     => $historyStatus,
                    'note'       => $request->note ?? "Status diubah dari {$prevStatus} menjadi {$order->status}",
                    'changed_by' => auth('api')->id(),
                    'created_at' => now(),
                ]);
            }

            $this->logActivity('order.status', 'Pesanan', "{$order->order_number}: {$prevStatus} -> {$order->status}");
            if ($order->user_id) {
                $this->notify(
                    (int) $order->user_id,
                    'Status pesanan diperbarui',
                    "Pesanan {$order->order_number} kini berstatus {$order->status}." . ($order->tracking_number ? " Resi: {$order->tracking_number}." : ''),
                    'order'
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Status pesanan {$order->order_number} berhasil diperbarui menjadi {$order->status}.",
            'data'    => $this->orderPayload($order->fresh(['user', 'address', 'items.variant.product.brand', 'invoice.installments', 'invoice.payments'])),
        ]);
    }

    public function trashOrder(Request $request, $id): JsonResponse
    {
        $order = $this->findOrderByIdentifier($id, true);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan atau sudah berada di arsip terhapus.',
            ], 404);
        }

        $order->deleted_at = now();
        $order->deleted_by = $request->input('deleted_by') ?? auth('api')->user()?->nama ?? 'Purchasing';
        $order->delete_reason = $request->input('delete_reason') ?? $request->input('reason') ?? null;
        $order->save();

        $this->logActivity('order.trash', 'Penjualan', "Pesanan {$order->order_number} dipindahkan ke arsip terhapus" . ($order->delete_reason ? " ({$order->delete_reason})" : ''));

        return response()->json([
            'success' => true,
            'message' => "Pesanan {$order->order_number} dipindahkan ke Penjualan Terhapus.",
            'data'    => $this->orderPayload($order->fresh(['user', 'address', 'items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments'])),
        ]);
    }

    public function restoreOrder($id): JsonResponse
    {
        $order = $this->findOrderByIdentifier($id, false);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        $order->deleted_at = null;
        $order->deleted_by = null;
        $order->delete_reason = null;
        $order->save();

        $this->logActivity('order.restore', 'Penjualan', "Pesanan {$order->order_number} dipulihkan dari arsip terhapus");

        return response()->json([
            'success' => true,
            'message' => "Pesanan {$order->order_number} berhasil dipulihkan.",
            'data'    => $this->orderPayload($order->fresh(['user', 'address', 'items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments'])),
        ]);
    }

    public function destroyOrder($id): JsonResponse
    {
        $order = $this->findOrderByIdentifier($id, false);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        $orderNumber = $order->order_number;

        DB::transaction(function () use ($order) {
            if ($order->invoice) {
                $invoice = $order->invoice;
                Payment::where('invoice_id', $invoice->id)->delete();
                Installment::where('invoice_id', $invoice->id)->delete();
                $invoice->delete();
            }

            $order->items()->delete();
            $order->statusHistories()->delete();
            $order->delete();
        });

        $this->logActivity('order.delete_permanent', 'Penjualan', "Pesanan {$orderNumber} berhasil dihapus permanen");

        return response()->json([
            'success' => true,
            'message' => "Pesanan {$orderNumber} berhasil dihapus permanen dari database.",
        ]);
    }

    private function resolveInvoiceForPayment(Request $request): ?Invoice
    {
        $invoiceId = is_numeric($request->invoice_id) ? (int) $request->invoice_id : null;
        if (!$invoiceId && $request->filled('order_id')) {
            $rawOrderId = trim((string) $request->order_id);
            $ord = is_numeric($rawOrderId)
                ? Order::active()->find((int) $rawOrderId)
                : Order::active()->where('order_number', $rawOrderId)->first();
            $invoiceId = $ord?->invoice?->id;
        }
        if (!$invoiceId && $request->filled('order_number')) {
            $ord = Order::active()->where('order_number', trim((string) $request->order_number))->first();
            $invoiceId = $ord?->invoice?->id;
        }
        if (!$invoiceId && $request->filled('invoice_number')) {
            $invoiceId = Invoice::where('invoice_number', trim((string) $request->invoice_number))
                ->whereHas('order', fn ($q) => $q->whereNull('deleted_at'))
                ->value('id');
        }

        if (!$invoiceId) {
            return null;
        }

        return Invoice::with('order')
            ->whereHas('order', fn ($q) => $q->whereNull('deleted_at'))
            ->find($invoiceId);
    }

    private function resolveInstallmentForInvoice(Invoice $invoice, Request $request): array
    {
        $installment = null;
        $stageInput = strtolower(trim((string) $request->input('stage', '')));
        $isOngkirPayment = ($stageInput === 'ongkir' || str_contains($stageInput, 'ongkir'));

        if ($request->filled('installment_id')) {
            $installment = Installment::where('invoice_id', $invoice->id)->find($request->installment_id);
            if (!$installment) {
                return [null, $isOngkirPayment, 'Cicilan tidak ditemukan pada invoice ini.'];
            }
            return [$installment, false, null];
        }

        if (!$isOngkirPayment) {
            $type = $this->installmentType((string) $request->input('stage', ''));
            if ($type) {
                $installment = Installment::where('invoice_id', $invoice->id)
                    ->where(function ($q) use ($type) {
                        if ($type === 'cicilan') {
                            $q->where('type', 'like', 'cicilan%');
                        } else {
                            $q->where('type', $type);
                        }
                    })
                    ->orderByRaw("case when status = 'lunas' then 1 else 0 end")
                    ->orderBy('sequence_number')
                    ->first();
                if (!$installment) {
                    return [null, false, "Tahap pembayaran {$type} belum tersedia pada invoice {$invoice->invoice_number}."];
                }
            }
        }

        return [$installment, $isOngkirPayment, null];
    }

    private function resolvePaymentBankMeta(Request $request, string $defaultMethod = 'transfer'): array
    {
        $bankName = trim((string) ($request->input('bank_name') ?? $request->input('bank') ?? ''));
        $accountNumber = trim((string) ($request->input('account_number') ?? $request->input('bank_account') ?? ''));
        if ($request->filled('bank_account_id') && ($bankName === '' || $accountNumber === '')) {
            $acc = BankAccount::find($request->bank_account_id);
            if ($acc) {
                if ($bankName === '') {
                    $bankName = trim((string) $acc->bank_name);
                }
                if ($accountNumber === '') {
                    $accountNumber = trim((string) $acc->account_number);
                }
            }
        }

        $method = trim((string) $request->input('method', ''));
        if ($method === '') {
            $method = $defaultMethod;
        }

        return [
            'method'         => $method,
            'bank_name'      => $bankName !== '' ? $bankName : ($method === 'deposit' ? 'Deposit' : 'Transfer Bank'),
            'account_number' => $accountNumber !== '' ? $accountNumber : ($method === 'deposit' ? 'Saldo Deposit' : ''),
            'note'           => $request->input('note'),
        ];
    }

    private function advanceOrderLifecycleAfterPayment(Invoice $invoice, ?Installment $installment, int $actorId, string $sourceLabel): void
    {
        $order = $invoice->order;
        if (!$order) {
            return;
        }

        $isDpStage = $installment ? $installment->type === 'dp' : false;
        if ($isDpStage && in_array($order->status, ['Menunggu DP', 'Menunggu ACC Marketing', 'Open', 'Menunggu Pembayaran DP'], true)) {
            $order->status = 'Produksi';
            if (empty($order->production_status) || $order->production_status === 'Antrian') {
                $order->production_status = 'Produksi';
            }
            $order->save();
            OrderStatusHistory::create([
                'order_id'   => $order->id,
                'status'     => 'Produksi',
                'note'       => "DP {$sourceLabel}",
                'changed_by' => $actorId,
                'created_at' => now(),
            ]);
        }

        if ($invoice->outstanding_amount <= 0 && in_array($order->status, ['Menunggu Pelunasan + Ongkir', 'Menunggu Pelunasan', 'Menunggu Pembayaran Sisa Pelunasan + Ongkir'], true)) {
            $order->status = 'Siap Kirim';
            $order->ready_at = $order->ready_at ?? now();
            $order->save();
            OrderStatusHistory::create([
                'order_id'   => $order->id,
                'status'     => 'Siap Kirim',
                'note'       => "Pelunasan & ongkir {$sourceLabel}. Siap dikirim.",
                'changed_by' => $actorId,
                'created_at' => now(),
            ]);
        }
    }

    // =========================================================================
    // 5. PAYMENT VERIFICATION (Finance ACC Bukti Bayar)
    // =========================================================================
    public function storePayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $invoice = $this->resolveInvoiceForPayment($request);
        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice tidak ditemukan. Kirim invoice_id, invoice_number, order_id, atau order_number yang benar.',
            ], 422);
        }

        $actor = auth('api')->user();
        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }
        $isAdminFinance = in_array($actor->role ?? '', ['owner', 'finance'], true);
        if (!$isAdminFinance && (int) $invoice->order?->user_id !== (int) $actor->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bukti bayar hanya bisa diunggah untuk pesanan kamu sendiri.',
            ], 403);
        }

        [$installment, $isOngkirPayment, $stageErr] = $this->resolveInstallmentForInvoice($invoice, $request);
        if ($stageErr !== null) {
            return response()->json(['success' => false, 'message' => $stageErr], 422);
        }

        $bankMeta = $this->resolvePaymentBankMeta($request, 'transfer');

        $uploadedAt = now();
        $rawDate = $request->input('uploaded_at') ?? $request->input('transferred_at') ?? $request->input('date');
        if ($rawDate) {
            try {
                $uploadedAt = \Carbon\Carbon::parse((string) $rawDate);
            } catch (\Throwable $e) {
                $uploadedAt = now();
            }
        }

        $payment = Payment::create([
            'invoice_id'       => $invoice->id,
            'installment_id'   => $installment?->id,
            'amount'           => (float) $request->amount,
            'proof_url'        => (string) ($request->proof_url ?? ''),
            'method'           => $bankMeta['method'],
            'bank_name'        => $bankMeta['bank_name'],
            'account_number'   => $bankMeta['account_number'],
            'note'             => $bankMeta['note'],
            'status'           => 'menunggu_verifikasi',
            'rejection_reason' => null,
            'uploaded_at'      => $uploadedAt,
        ]);

        $paymentLabel = $isOngkirPayment
            ? 'Ongkos Kirim'
            : ($installment ? 'Cicilan ' . $installment->type : 'Pembayaran');
        $this->logActivity('payment.upload', 'Pembayaran', "Bukti bayar {$paymentLabel} Rp " . number_format($payment->amount, 0, ',', '.') . " untuk invoice {$invoice->invoice_number}");
        foreach (User::query()->where('level', 'finance')->where('is_active', true)->pluck('id') as $financeId) {
            $this->notify((int) $financeId, "Bukti bayar {$paymentLabel} baru menunggu verifikasi", "{$invoice->invoice_number}: Rp " . number_format($payment->amount, 0, ',', '.'), 'payment');
        }

        $freshOrder = $invoice->order
            ? $invoice->order->fresh(['user', 'address', 'items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments'])
            : null;

        return response()->json([
            'success' => true,
            'message' => 'Bukti pembayaran berhasil diunggah ke database.',
            'data'    => $payment->fresh(['installment', 'invoice.order']),
            'order'   => $freshOrder ? $this->orderPayload($freshOrder) : null,
        ], 201);
    }

    /**
     * Pelunasan tahap invoice memakai saldo deposit mitra (langsung tercatat lunas).
     */
    public function payWithDeposit(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $actor = auth('api')->user();
        if (!$actor || !$actor->isMitra()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya mitra yang dapat membayar memakai saldo deposit.',
            ], 403);
        }

        $invoice = $this->resolveInvoiceForPayment($request);
        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice tidak ditemukan. Kirim invoice_number atau order_number.',
            ], 422);
        }
        if ((int) $invoice->order?->user_id !== (int) $actor->id) {
            return response()->json([
                'success' => false,
                'message' => 'Tagihan ini bukan milik akun mitra kamu.',
            ], 422);
        }

        [$installment, $isOngkirPayment, $stageErr] = $this->resolveInstallmentForInvoice($invoice, $request);
        if ($stageErr !== null) {
            return response()->json(['success' => false, 'message' => $stageErr], 422);
        }

        $amount = (float) $request->amount;
        $stageLabel = $isOngkirPayment ? 'ongkir' : ($installment?->type ?: 'tagihan');

        return DB::transaction(function () use ($request, $actor, $invoice, $installment, $isOngkirPayment, $amount, $stageLabel) {
            $user = User::where('id', $actor->id)->lockForUpdate()->first();
            $balanceBefore = (float) $user->deposit_balance;
            if ($balanceBefore < $amount) {
                abort(422, 'Saldo deposit tidak mencukupi. Sisa saldo Rp ' . number_format($balanceBefore, 0, ',', '.'));
            }

            $payment = Payment::create([
                'invoice_id'       => $invoice->id,
                'installment_id'   => $installment?->id,
                'amount'           => $amount,
                'proof_url'        => 'DEPOSIT',
                'method'           => 'deposit',
                'bank_name'        => 'Deposit',
                'account_number'   => 'Saldo Deposit',
                'note'             => $request->input('note'),
                'status'           => 'disetujui',
                'rejection_reason' => null,
                'uploaded_at'      => now(),
                'verified_by'      => $user->id,
                'verified_at'      => now(),
            ]);

            if ($installment) {
                $installment->paid_amount = (float) $installment->paid_amount + $amount;
                $installment->status = $installment->paid_amount >= (float) $installment->amount ? 'lunas' : 'belum_bayar';
                $installment->save();
            }

            $this->syncInvoiceTotals($invoice);

            DepositTransaction::create([
                'user_id'         => $user->id,
                'type'            => 'used',
                'amount'          => $amount,
                'proof_url'       => null,
                'status'          => 'disetujui',
                'reference_type'  => 'invoice',
                'reference_id'    => $invoice->id,
                'description'     => "Pelunasan {$stageLabel} invoice {$invoice->invoice_number} via saldo deposit",
                'balance_before'  => $balanceBefore,
                'balance_after'   => $balanceBefore - $amount,
                'verified_by'     => $user->id,
                'verified_at'     => now(),
                'created_at'      => now(),
            ]);

            $user->deposit_balance = $balanceBefore - $amount;
            $user->save();

            $this->advanceOrderLifecycleAfterPayment($invoice, $installment, (int) $user->id, 'dibayar memakai saldo deposit');

            foreach (User::query()->where('level', 'owner')->pluck('id') as $ownerId) {
                $this->notify(
                    (int) $ownerId,
                    'Tagihan dilunasi dari saldo deposit',
                    "{$user->nama} membayarkan Rp " . number_format($amount, 0, ',', '.') . " untuk invoice {$invoice->invoice_number} memakai saldo deposit.",
                    'finance'
                );
            }

            $this->logActivity(
                'payment.deposit_offset',
                'Pembayaran',
                "{$user->nama} melunasi invoice {$invoice->invoice_number} Rp " . number_format($amount, 0, ',', '.') . ' dari saldo deposit'
            );

            $freshOrder = $invoice->order ? $invoice->order->fresh(['user', 'address', 'items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments']) : null;

            return response()->json([
                'success' => true,
                'message' => "Pembayaran invoice {$invoice->invoice_number} berhasil dilunasi dari saldo deposit.",
                'data'    => [
                    'payment'         => $payment->fresh(['installment', 'invoice.order']),
                    'deposit_balance' => (float) $user->deposit_balance,
                    'stage'           => $isOngkirPayment ? 'ongkir' : $installment?->type,
                    'order'           => $freshOrder ? $this->orderPayload($freshOrder) : null,
                ],
            ], 201);
        });
    }

    public function verifyPayment(Request $request, $id): JsonResponse
    {
        $payment = Payment::find($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Data pembayaran tidak ditemukan.'], 404);
        }

        if ($payment->status !== 'menunggu_verifikasi') {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran ini sudah ' . $this->statusLabel($payment->status) . ' sehingga tidak dapat diverifikasi ulang.',
            ], 422);
        }

        $isApproved = in_array(strtolower(trim((string) ($request->status ?? 'disetujui'))), ['disetujui', 'acc', 'lunas', 'berhasil', 'setuju'], true);
        $payment->status = $isApproved ? 'disetujui' : 'ditolak';
        $payment->rejection_reason = $isApproved ? null : ($request->rejection_reason ?? $request->notes ?? $request->note ?? 'Ditolak Finance');
        $payment->verified_by = auth('api')->id();
        $payment->verified_at = now();
        $payment->save();

        $order = $payment->invoice?->order;

        if ($isApproved) {
            if ($payment->installment) {
                $payment->installment->status = 'lunas';
                $payment->installment->paid_amount = $payment->amount;
                $payment->installment->save();
            }
            if ($payment->invoice) {
                $this->syncInvoiceTotals($payment->invoice);
                $this->advanceOrderLifecycleAfterPayment(
                    $payment->invoice,
                    $payment->installment,
                    (int) ($payment->verified_by ?? auth('api')->id()),
                    'terverifikasi Finance'
                );

                if ($order?->user_id) {
                    $this->notify(
                        (int) $order->user_id,
                        $payment->installment ? 'Cicilan ' . $payment->installment->type . ' dinyatakan lunas' : 'Pembayaran dinyatakan lunas',
                        'Pembayaran Rp ' . number_format($payment->amount, 0, ',', '.') . " untuk invoice {$payment->invoice->invoice_number} sudah diverifikasi.",
                        'success'
                    );
                }
            }
        } else {
            if ($order?->user_id) {
                $this->notify(
                    (int) $order->user_id,
                    'Bukti bayar ditolak',
                    'Pembayaran Rp ' . number_format($payment->amount, 0, ',', '.') . " pada invoice {$payment->invoice->invoice_number} ditolak. Alasan: {$payment->rejection_reason}",
                    'warning'
                );
            }
        }

        $this->logActivity('payment.verify', 'Pembayaran', 'Pembayaran #' . $payment->id . ' ' . $this->statusLabel($payment->status));

        $freshPayment = $payment->fresh(['installment', 'invoice.order']);
        $freshOrder = $order ? $order->fresh(['user', 'address', 'items.variant.product.brand', 'items.variant.product.batch', 'items.address', 'invoice.installments', 'invoice.payments']) : null;

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran berhasil diverifikasi (' . $this->statusLabel($payment->status) . ').',
            'data'    => $freshPayment,
            'order'   => $freshOrder ? $this->orderPayload($freshOrder) : null,
        ]);
    }

    // =========================================================================
    // 6. DEPOSIT MANAGEMENT (Mitra Top Up & Finance ACC)
    // =========================================================================
    public function storeDeposit(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1000',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $actor = auth('api')->user();
        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }
        $isAdminFinance = in_array($actor->role ?? '', ['owner', 'finance'], true);
        $rawTargetId = $isAdminFinance ? ($request->user_id ?? $actor->id) : $actor->id;
        if (is_string($rawTargetId) && preg_match('/^[a-z]+-(\d+)$/i', trim($rawTargetId), $m)) {
            $rawTargetId = $m[1];
        }
        $user = is_numeric($rawTargetId) ? User::find((int) $rawTargetId) : null;
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Mitra tidak ditemukan.'], 422);
        }

        try {
            $bankAccountId = $this->resolveMasterRef(BankAccount::class, $request->bank_account_id, 'bank_account_id');
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $createdAt = now();
        $rawDate = $request->input('date') ?? $request->input('created_at');
        if ($rawDate) {
            try {
                $createdAt = \Carbon\Carbon::parse((string) $rawDate);
            } catch (\Throwable $e) {
                $createdAt = now();
            }
        }

        $balanceBefore = (float) $user->deposit_balance;

        $deposit = DepositTransaction::create([
            'user_id'         => $user->id,
            'bank_account_id' => $bankAccountId,
            'type'            => 'deposit',
            'amount'          => (float) $request->amount,
            'proof_url'       => (string) ($request->proof_url ?? ''),
            'status'          => 'menunggu_verifikasi',
            'description'     => $request->description ?? 'Pengajuan deposit mitra',
            'balance_before'  => $balanceBefore,
            'balance_after'   => $balanceBefore,
            'created_at'      => $createdAt,
        ]);

        $this->logActivity('deposit.create', 'Deposit', "Mitra {$user->nama} mengajukan deposit Rp " . number_format($deposit->amount, 0, ',', '.'));

        $verifiers = User::query()
            ->whereIn('level', ['owner', 'finance'])
            ->where('is_active', true)
            ->pluck('id');
        foreach ($verifiers as $verifierId) {
            $this->notify($verifierId, 'Deposit baru menunggu verifikasi', "{$user->nama} mengajukan deposit Rp " . number_format($deposit->amount, 0, ',', '.'), 'deposit');
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan deposit berhasil dikirim ke database.',
            'data'    => $this->depositPayload($deposit),
        ], 201);
    }

    public function verifyDeposit(Request $request, $id): JsonResponse
    {
        $deposit = DepositTransaction::find($id);
        if (!$deposit) {
            return response()->json(['success' => false, 'message' => 'Data deposit tidak ditemukan.'], 404);
        }

        if ($deposit->status !== 'menunggu_verifikasi') {
            return response()->json([
                'success' => false,
                'message' => "Deposit ini sudah {$this->statusLabel($deposit->status)} sehingga tidak dapat diverifikasi ulang.",
            ], 422);
        }

        $isApproved = in_array(strtolower(trim((string) ($request->status ?? 'acc'))), ['acc', 'disetujui', 'berhasil', 'setuju'], true);

        $deposit->status = $isApproved ? 'disetujui' : 'ditolak';
        $deposit->verified_by = auth('api')->id();
        $deposit->verified_at = now();

        if ($isApproved) {
            $user = $deposit->user;
            if ($user) {
                $deposit->balance_before = (float) $user->deposit_balance;
                $user->deposit_balance = (float) $user->deposit_balance + (float) $deposit->amount;
                $user->save();
                $deposit->balance_after = (float) $user->deposit_balance;
            }
        } else {
            $deposit->balance_after = $deposit->balance_before;
            $rejectionNote = $request->input('note') ?? $request->input('description') ?? $request->input('notes');
            if (!empty($rejectionNote)) {
                $deposit->description = trim((string) $rejectionNote);
            }
        }
        $deposit->save();

        $this->logActivity('deposit.verify', 'Deposit', 'Deposit #' . $deposit->id . " {$deposit->amount} " . $this->statusLabel($deposit->status));
        if ($deposit->user_id) {
            $this->notify(
                (int) $deposit->user_id,
                $isApproved ? 'Deposit kamu sudah masuk' : 'Deposit ditolak',
                $isApproved
                    ? 'Deposit Rp ' . number_format($deposit->amount, 0, ',', '.') . ' berhasil diverifikasi. Saldo kamu sekarang Rp ' . number_format($deposit->balance_after, 0, ',', '.') . '.'
                    : 'Deposit Rp ' . number_format($deposit->amount, 0, ',', '.') . ' ditolak. ' . ($deposit->description ?? ''),
                $isApproved ? 'success' : 'warning'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Deposit berhasil diverifikasi (' . $this->statusLabel($deposit->status) . ').',
            'data'    => $this->depositPayload($deposit->fresh(['user', 'bankAccount', 'verifier'])),
        ]);
    }

    // =========================================================================
    // 7. PAYMENT REQUESTS (Finance Request & Owner Approval)
    // =========================================================================
    public function storePaymentRequest(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount'  => 'required|numeric|min:1000',
            'purpose' => 'required|string|max:150',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $code = 'PR-' . date('Ymd') . '-' . strtoupper(Str::random(4));
        $actor = auth('api')->user();
        $actorRole = strtolower((string) ($actor?->role ?? ''));
        $reviewedByPurchasing = $actorRole !== 'finance';

        $pr = PaymentRequest::create([
            'code'               => $code,
            'created_by'         => $actor?->id,
            'bank_account_id'    => $this->resolveMasterRef(BankAccount::class, $request->bank_account_id, 'bank_account_id'),
            'amount'             => (float) $request->amount,
            'purpose'            => trim((string) $request->purpose),
            'reference'          => $request->reference ?? null,
            'note'               => $request->note ?? null,
            'marketing_by'       => $actor?->nama,
            'marketing_at'       => $reviewedByPurchasing ? now() : null,
            'marketing_decision' => $reviewedByPurchasing ? 'ACC' : null,
            'status'             => $reviewedByPurchasing ? 'Menunggu ACC Owner' : 'Menunggu Review Purchasing',
        ]);

        $this->logActivity('payment_request.create', 'Pengajuan Bayar', "{$code} Rp " . number_format($pr->amount, 0, ',', '.') . " untuk {$pr->purpose}");
        foreach (User::query()->where('level', 'owner')->pluck('id') as $ownerId) {
            $this->notify((int) $ownerId, 'Pengajuan pembayaran menunggu ACC owner', "{$code}: Rp " . number_format($pr->amount, 0, ',', '.') . " ({$pr->purpose})", 'finance');
        }

        return response()->json([
            'success' => true,
            'message' => "Pengajuan pembayaran {$code} berhasil diajukan ke Owner.",
            'data'    => $this->paymentRequestRow($pr->fresh(['creator', 'bankAccount'])),
        ], 201);
    }

    public function updatePaymentRequest(Request $request, $id): JsonResponse
    {
        $pr = PaymentRequest::find($id);
        if (!$pr) {
            return response()->json(['success' => false, 'message' => 'Pengajuan pembayaran tidak ditemukan.'], 404);
        }

        $user = auth('api')->user();
        $actorName = $user?->nama ?? 'Admin';
        $actorRole = strtolower((string) ($user?->role ?? ''));

        if ($request->has('marketing_decision')) {
            if (!in_array($actorRole, ['marketing', 'owner', 'finance'], true)) {
                return response()->json(['success' => false, 'message' => 'Hanya tim purchasing yang dapat me-review pengajuan ini.'], 403);
            }
            $pr->marketing_by = $actorName;
            $pr->marketing_at = now();
            $pr->marketing_decision = strtoupper(trim((string) $request->marketing_decision)) === 'ACC' ? 'ACC' : 'Tolak';
            $pr->marketing_note = $request->marketing_note ?? null;
            $pr->status = $pr->marketing_decision === 'ACC' ? 'Menunggu ACC Owner' : 'Ditolak Marketing';
        }

        if ($request->has('owner_decision')) {
            if ($actorRole !== 'owner') {
                return response()->json(['success' => false, 'message' => 'Keputusan akhir hanya dapat dibuat oleh owner.'], 403);
            }
            $pr->owner_by = $actorName;
            $pr->owner_at = now();
            $pr->owner_decision = strtoupper(trim((string) $request->owner_decision)) === 'ACC' ? 'ACC' : 'Tolak';
            $pr->owner_note = $request->owner_note ?? null;
            $pr->status = $pr->owner_decision === 'ACC' ? 'ACC Owner' : 'Ditolak Owner';

            if ($pr->created_by) {
                $this->notify(
                    (int) $pr->created_by,
                    'Pengajuan bayar ' . $pr->code . ' ' . strtolower($pr->owner_decision),
                    $pr->owner_decision === 'ACC'
                        ? 'ACC owner. Menunggu transfer oleh finance.'
                        : 'Ditolak owner. ' . ($pr->owner_note ?? ''),
                    $pr->owner_decision === 'ACC' ? 'success' : 'warning'
                );
            }
        }

        if ($request->has('transfer_proof') || $request->has('transfer_by')) {
            if (!in_array($actorRole, ['owner', 'finance'], true)) {
                return response()->json(['success' => false, 'message' => 'Penandaan bukti transfer hanya untuk tim finance/owner.'], 403);
            }
            if ($pr->owner_decision !== 'ACC') {
                return response()->json([
                    'success' => false,
                    'message' => 'Pengajuan belum di-ACC owner, tidak bisa ditandai selesai dikirim.',
                ], 422);
            }
            $pr->transfer_by = $actorName;
            $pr->transfer_at = now();
            $pr->transfer_proof = $request->transfer_proof ?? null;
            $pr->transfer_note = $request->transfer_note ?? null;
            $pr->status = 'Selesai Ditransfer';

            if ($pr->created_by) {
                $this->notify((int) $pr->created_by, 'Dana ' . $pr->code . ' sudah ditransfer', 'Bukti transfer: ' . ($pr->transfer_proof ?? '-'), 'success');
            }
        }

        if ($request->filled('status') && !$request->hasAny(['owner_decision', 'marketing_decision', 'transfer_proof', 'transfer_by'])) {
            $status = trim((string) $request->status);
            if (!in_array($status, self::PR_STATUSES, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Status pengajuan bayar tidak dikenali: ' . $status,
                ], 422);
            }
            if ($actorRole !== 'owner' && $status !== 'Dibatalkan') {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya owner yang dapat mengubah status pengajuan selain membatalkannya.',
                ], 403);
            }
            $pr->status = $status;
        }

        $pr->save();

        $this->logActivity('payment_request.update', 'Pengajuan Bayar', "{$pr->code} -> {$pr->status}");

        return response()->json([
            'success' => true,
            'message' => "Pengajuan pembayaran {$pr->code} berhasil diperbarui ({$pr->status}).",
            'data'    => $this->paymentRequestRow($pr->fresh(['creator', 'bankAccount'])),
        ]);
    }

    public function destroyPaymentRequest($id): JsonResponse
    {
        $pr = PaymentRequest::find($id);
        if (!$pr) {
            return response()->json(['success' => false, 'message' => 'Pengajuan pembayaran tidak ditemukan.'], 404);
        }

        $code = $pr->code;
        $pr->delete();

        $this->logActivity('payment_request.delete', 'Pengajuan Bayar', "Pengajuan pembayaran {$code} dihapus oleh owner");

        return response()->json([
            'success' => true,
            'message' => "Pengajuan pembayaran {$code} berhasil dihapus.",
        ]);
    }

    public function destroyPayment($id): JsonResponse
    {
        $payment = Payment::find($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Catatan mutasi kas pembayaran tidak ditemukan.'], 404);
        }

        $ref = $payment->reference ?: 'INV-' . $payment->id;
        $payment->delete();

        $this->logActivity('payment.delete', 'Buku Kas', "Catatan mutasi kas pembayaran {$ref} dihapus oleh owner");

        return response()->json([
            'success' => true,
            'message' => "Mutasi pembayaran {$ref} berhasil dihapus dari buku kas.",
        ]);
    }

    public function destroyDeposit($id): JsonResponse
    {
        $dep = DepositTransaction::find($id);
        if (!$dep) {
            return response()->json(['success' => false, 'message' => 'Catatan mutasi deposit tidak ditemukan.'], 404);
        }

        $ref = 'DEP-' . $dep->id;
        $dep->delete();

        $this->logActivity('deposit.delete', 'Buku Kas', "Catatan mutasi deposit {$ref} dihapus oleh owner");

        return response()->json([
            'success' => true,
            'message' => "Mutasi deposit {$ref} berhasil dihapus dari buku kas.",
        ]);
    }

    public function destroyActivityLog($id): JsonResponse
    {
        $log = ActivityLog::find($id);
        if (!$log) {
            return response()->json(['success' => false, 'message' => 'Log aktivitas tidak ditemukan.'], 404);
        }

        $log->delete();

        return response()->json([
            'success' => true,
            'message' => 'Log riwayat aktivitas berhasil dihapus.',
        ]);
    }

    public function clearActivityLogs(): JsonResponse
    {
        ActivityLog::truncate();

        $this->logActivity('audit.clear', 'Audit Trail', 'Seluruh riwayat jejak audit dibersihkan oleh owner');

        return response()->json([
            'success' => true,
            'message' => 'Seluruh jejak riwayat audit berhasil dibersihkan.',
        ]);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private const PR_STATUSES = [
        'Menunggu Review Purchasing',
        'Menunggu ACC Owner',
        'ACC Owner',
        'Selesai Ditransfer',
        'Ditolak Marketing',
        'Ditolak Owner',
        'Dibatalkan',
    ];

    private const STATUS_LABELS = [
        'menunggu_verifikasi' => 'Menunggu Verifikasi',
        'disetujui'           => 'ACC',
        'ditolak'             => 'Ditolak',
        'belum_lunas'         => 'Belum Lunas',
        'lunas'               => 'Lunas',
        'belum_bayar'         => 'Belum Bayar',
    ];

    private const HISTORY_STATUSES = ['Open', 'Produksi', 'Pengisian Alamat', 'Menunggu Pengiriman', 'Update Resi', 'Terkirim'];

    private function statusLabel(?string $status): string
    {
        return self::STATUS_LABELS[$status] ?? (string) $status;
    }

    private function historyStatus(string $status): ?string
    {
        $clean = trim($status);
        return $clean !== '' ? $clean : null;
    }

    /**
     * Nama tahap versi dashboard ('DP', 'Cicilan 1', 'Pelunasan', 'ongkir') ke tipe installment.
     * Tahap 'ongkir' tidak punya baris cicilan sehingga dikembalikan null.
     */
    private function installmentType(string $stage): ?string
    {
        $raw = strtolower(trim($stage));

        if ($raw === '') {
            return null;
        }
        if ($raw === 'dp' || str_starts_with($raw, 'dp')) {
            return 'dp';
        }
        if (str_contains($raw, 'pelunasan') || $raw === 'lunas') {
            return 'pelunasan';
        }
        if (str_contains($raw, 'cicilan') || $raw === 'installment') {
            return 'cicilan';
        }

        return null;
    }

    private function duplicateName($query, string $name, ?int $exceptId = null): bool
    {
        return $query
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($name))])
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();
    }

    private function duplicateResponse(string $label): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => "Nama sudah dipakai oleh {$label} lain. Gunakan nama lain.",
            'errors'  => ['name' => ["Nama {$label} harus unik."]],
        ], 422);
    }

    private function invalidRefResponse(string $message): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 422);
    }

    private function linkedResponse(string $label, string $childLabel, int $count): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => "{$label} ini masih dipakai {$count} {$childLabel}. Pindahkan atau hapus {$childLabel} tersebut lebih dulu supaya data tetap terhubung.",
        ], 409);
    }

    /**
     * Mengambil id master data dari id numerik; null kalau kosong, exception kalau tidak dikenal.
     */
    private function resolveMasterRef(string $modelClass, $id, string $field): ?int
    {
        if ($id === null || $id === '' || $id === 0 || $id === '0') {
            return null;
        }

        // Tangani id berprefix string seperti "b-9", "cat-3", dsb.
        if (is_string($id) && preg_match('/^[a-z]+-(\d+)$/i', trim($id), $matches)) {
            $id = $matches[1];
        }

        if (!is_numeric($id)) {
            throw new \InvalidArgumentException("Ref {$field} harus berupa id angka, bukan \"{$id}\".");
        }

        $found = $modelClass::find((int) $id);
        if (!$found) {
            throw new \InvalidArgumentException("Data untuk {$field} (id {$id}) tidak ditemukan.");
        }

        return (int) $found->id;
    }

    /**
     * Master data boleh dikirim lewat id atau nama, tapi harus sudah terdaftar.
     */
    private function resolveRef(string $modelClass, $id, $name, string $label): ?int
    {
        try {
            if ($id !== null && $id !== '' && $id !== 0 && $id !== '0') {
                return $this->resolveMasterRef($modelClass, $id, $label);
            }
        } catch (\InvalidArgumentException $e) {
            // Jika pencarian dengan id gagal, tapi $name diisi, coba fallback cari lewat nama sebelum throw error
            if ($name !== null && trim((string) $name) !== '') {
                $trimmedName = trim((string) $name);
                $foundByName = $modelClass::whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($trimmedName)])->first();
                if ($foundByName) {
                    return (int) $foundByName->id;
                }
                if ($modelClass === Brand::class) {
                    $newBrand = Brand::create(['name' => $trimmedName, 'is_active' => true]);
                    return (int) $newBrand->id;
                }
                if ($modelClass === Category::class) {
                    $newCat = Category::create(['name' => $trimmedName]);
                    return (int) $newCat->id;
                }
                if ($modelClass === PoBatch::class) {
                    $newBatch = PoBatch::create([
                        'name' => $trimmedName,
                        'status' => 'open',
                        'start_date' => now(),
                        'close_date' => now()->addDays(14),
                    ]);
                    return (int) $newBatch->id;
                }
            }
            throw new \InvalidArgumentException("Ref {$label} tidak valid: " . $e->getMessage());
        }

        $name = trim((string) $name);
        if ($name === '') {
            return null;
        }

        if (!is_numeric($name)) {
            $found = $modelClass::whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])->first();
            if (!$found) {
                if ($modelClass === Brand::class) {
                    $newBrand = Brand::create(['name' => $name, 'is_active' => true]);
                    return (int) $newBrand->id;
                }
                if ($modelClass === Category::class) {
                    $newCat = Category::create(['name' => $name]);
                    return (int) $newCat->id;
                }
                if ($modelClass === PoBatch::class) {
                    $newBatch = PoBatch::create([
                        'name' => $name,
                        'status' => 'open',
                        'start_date' => now(),
                        'close_date' => now()->addDays(14),
                    ]);
                    return (int) $newBatch->id;
                }
                throw new \InvalidArgumentException("{$label} \"{$name}\" belum terdaftar. Tambahkan {$label} lebih dulu di menu master data.");
            }

            return (int) $found->id;
        }

        return $this->resolveMasterRef($modelClass, $name, $label);
    }

    private function ensureUniqueVariantSku(string $sku, ?int $ignoreVariantId = null, array $usedInBatch = []): string
    {
        $candidate = mb_substr(trim($sku), 0, 85);
        if ($candidate === '') {
            $candidate = 'SKU-' . strtoupper(Str::random(6));
        }

        $base = $candidate;
        $counter = 1;

        while (
            in_array(strtoupper($candidate), array_map('strtoupper', $usedInBatch), true) ||
            ProductVariant::where('sku', $candidate)
                ->when($ignoreVariantId, fn ($q) => $q->where('id', '!=', $ignoreVariantId))
                ->exists()
        ) {
            $counter++;
            $candidate = mb_substr($base, 0, 80) . '-' . $counter;
        }

        return $candidate;
    }

    private function syncVariants(Product $product, $variants, int $defaultStock): void
    {
        if ($variants === null || $variants === '') {
            return;
        }

        if (!is_array($variants)) {
            throw new \InvalidArgumentException('Daftar varian produk harus berupa array.');
        }

        $keep = [];
        $usedSkusInBatch = [];

        foreach ($variants as $v) {
            if (!is_array($v)) {
                continue;
            }

            $rawSku = isset($v['sku']) && trim((string) $v['sku']) !== ''
                ? mb_substr(trim((string) $v['sku']), 0, 85)
                : '';

            if ($rawSku === '') {
                $bCode = '';
                if ($product->brand_id) {
                    $bName = \App\Models\Brand::where('id', $product->brand_id)->value('name');
                    if ($bName) {
                        $bCode = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $bName), 0, 3));
                    }
                }
                $art = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $product->article_code ?: $product->name ?: 'SKU'));
                if ($bCode && str_starts_with($art, $bCode)) {
                    $art = substr($art, strlen($bCode));
                }
                $pfx = strtoupper(substr($art ?: 'SKU', 0, 4));
                $mCode = isset($v['model']) && trim((string) $v['model']) !== '' ? strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', (string) $v['model']), 0, 4)) : 'STD';
                $cCode = isset($v['color']) && trim((string) $v['color']) !== '' ? strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', (string) $v['color']), 0, 3)) : 'DEF';
                $sCode = isset($v['size']) && trim((string) $v['size']) !== '' ? strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', (string) $v['size']), 0, 4)) : 'ALL';
                $rawSku = ($bCode ? "{$bCode}-" : '') . "{$pfx}-{$mCode}-{$cCode}-{$sCode}";
            }

            $existingId = (!empty($v['id']) && is_numeric($v['id'])) ? (int) $v['id'] : null;
            $uniqueSku = $this->ensureUniqueVariantSku($rawSku, $existingId, $usedSkusInBatch);
            $usedSkusInBatch[] = $uniqueSku;

            $payload = [
                'model'     => isset($v['model']) ? mb_substr(trim((string) $v['model']), 0, 100) : null,
                'size'      => isset($v['size']) ? mb_substr(trim((string) $v['size']), 0, 20) : null,
                'color'     => isset($v['color']) ? mb_substr(trim((string) $v['color']), 0, 50) : null,
                'sku'       => $uniqueSku,
                'stock'     => (int) ($v['stock'] ?? $v['quota'] ?? $defaultStock),
                'price'     => isset($v['price']) && $v['price'] !== '' ? (float) $v['price'] : null,
                'addon'     => isset($v['addon']) && $v['addon'] !== '' ? (float) $v['addon'] : 0,
                'hpp'       => isset($v['hpp']) && $v['hpp'] !== '' ? (float) $v['hpp'] : null,
                'is_active' => isset($v['is_active']) ? (bool) $v['is_active'] : true,
            ];

            if ($existingId) {
                $existing = ProductVariant::where('product_id', $product->id)->find($existingId);
                if ($existing) {
                    $existing->update($payload);
                    $keep[] = $existing->id;
                    continue;
                }
            }

            $created = ProductVariant::create($payload + ['product_id' => $product->id]);
            $keep[] = $created->id;
        }

        if ($keep) {
            ProductVariant::where('product_id', $product->id)->whereNotIn('id', $keep)->delete();
        }

        if (!ProductVariant::where('product_id', $product->id)->exists()) {
            $defaultSku = $this->ensureUniqueVariantSku('SKU-' . strtoupper(Str::random(6)), null, $usedSkusInBatch);
            ProductVariant::create([
                'product_id' => $product->id,
                'model'      => 'All Size',
                'size'       => 'Standar',
                'color'      => 'Default',
                'sku'        => $defaultSku,
                'stock'      => $defaultStock ?: 50,
                'is_active'  => true,
            ]);
        }
    }

    private function syncPrices(Product $product, $prices, float $basePrice): void
    {
        $levels = Level::all();
        if ($levels->isEmpty()) {
            return;
        }

        $byLevel = [];
        $byLevelFee = [];
        if (is_array($prices)) {
            foreach ($prices as $p) {
                if (!is_array($p)) {
                    continue;
                }
                $levelId = $p['level_id'] ?? null;
                if ($levelId === null && !empty($p['level'])) {
                    $levelId = Level::whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim((string) $p['level']))])->value('id');
                }
                if ($levelId !== null) {
                    $byLevel[(int) $levelId] = (float) ($p['price'] ?? 0);
                    if (isset($p['fee'])) {
                        $byLevelFee[(int) $levelId] = (float) $p['fee'];
                    }
                }
            }
        }

        if ($basePrice <= 0) {
            $basePrice = (float) ($product->variants()->min('price') ?: ($product->prices()->min('price') ?: 0));
        }

        $isSale = (bool) ($product->is_sale ?? false);
        $discountPercent = (int) ($product->discount_percent ?? 0);
        $salePrice = ($isSale && $discountPercent > 0)
            ? round($basePrice * (1.0 - ($discountPercent / 100.0)))
            : $basePrice;

        $brand = $product->brand;

        foreach ($levels as $lvl) {
            $mult = $this->levelMultiplier($lvl->name, $brand);
            $price = $byLevel[$lvl->id] ?? round($salePrice * $mult);
            $fee = $byLevelFee[$lvl->id] ?? max(0, round($basePrice - (float) $price));

            ProductPrice::updateOrCreate(
                ['product_id' => $product->id, 'level_id' => $lvl->id],
                ['price' => max(0, (float) $price), 'fee' => (float) $fee]
            );
        }
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

    private function depositPayload(DepositTransaction $deposit): array
    {
        return [
            'id'             => $deposit->id,
            'type'           => $deposit->type,
            'mitra_id'       => $deposit->user_id,
            'mitra_name'     => $deposit->user?->nama,
            'amount'         => (float) $deposit->amount,
            'bank'           => $deposit->bankAccount?->bank_name,
            'bank_account'   => $deposit->bankAccount?->account_number,
            'proof_url'      => $deposit->proof_url,
            'status'         => $deposit->status,
            'status_label'   => $this->statusLabel($deposit->status),
            'verified_by'    => $deposit->verifier?->nama,
            'verified_at'    => optional($deposit->verified_at)->toIso8601String(),
            'balance_before' => (float) $deposit->balance_before,
            'balance_after'  => (float) $deposit->balance_after,
            'description'    => $deposit->description,
            'created_at'     => optional($deposit->created_at)->toIso8601String(),
        ];
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

    private function productPayload(Product $product): array
    {
        $effectiveTutupPo = $product->effective_tutup_po;
        $effectiveEstShipment = $product->estimated_shipment ?? $product->batch?->estimated_shipment;
        $effectiveStatus = $product->effective_status;

        return [
            'id'                 => $product->id,
            'title'              => $product->name,
            'name'               => $product->name,
            'article_code'       => $product->article_code,
            'brand'              => $product->brand?->name ?? '',
            'brand_id'           => $product->brand_id,
            'supplier'           => $product->brand?->supplier?->name ?? '',
            'category'           => $product->category?->name ?? '',
            'category_id'        => $product->category_id,
            'batch'              => $product->batch?->name ?? '',
            'po_batch_id'        => $product->po_batch_id,
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
            'isClosedPO'         => $product->isClosedPo(),
            'tutup_po'           => $this->formatIndonesianDate($effectiveTutupPo, true),
            'tutup_po_iso'       => $effectiveTutupPo?->toIso8601String(),
            'close_date'         => $effectiveTutupPo?->toDateString(),
            'close_time'         => $effectiveTutupPo?->format('H:i') ?? '23:59',
            'open_date'          => optional($product->batch?->start_date)->toDateString(),
            'estimated_shipment' => $this->formatIndonesianDate($effectiveEstShipment, false),
            'shipment_iso'       => $effectiveEstShipment && $effectiveEstShipment->year > 1970 ? $effectiveEstShipment->toDateString() : null,
            'min_dp_percent'     => (int) ($product->min_dp_percent ?: TerminPlan::DEFAULT_DP_PERCENT),
            'dp_percent'         => (int) ($product->min_dp_percent ?: TerminPlan::DEFAULT_DP_PERCENT),
            'payment_stages'     => $product->payment_stages,
            'stages'             => $product->payment_stages,
            'termin_count'       => (int) ($product->termin_count ?? 2),
            'stock_quota'        => (int) ($product->stock_quota ?? 50),
            'description'        => $product->description,
            'material_detail'    => $product->material_detail,
            'is_sale'            => (bool) $product->is_sale,
            'discount_percent'   => (int) ($product->discount_percent ?? 0),
            'original_price'     => (float) ($product->original_price ?? 0),
            'is_active'          => (bool) $product->is_active,
            'price'              => (float) ($product->variants->where('price', '>', 0)->min('price') ?: ($product->original_price ?: ($product->prices->min('price') ?: 0))),
            'variants'           => $product->variants->map(fn ($v) => [
                'id'        => $v->id,
                'model'     => $v->model,
                'size'      => $v->size,
                'color'     => $v->color,
                'sku'       => $v->sku,
                'stock'     => (int) $v->stock,
                'quota'     => (int) $v->stock,
                'price'     => $v->price !== null ? (float) $v->price : null,
                'addon'     => (float) ($v->addon ?? 0),
                'hpp'       => $v->hpp !== null ? (float) $v->hpp : null,
                'is_active' => (bool) $v->is_active,
            ])->values(),
            'prices'             => $product->prices->map(fn ($pr) => [
                'id'       => $pr->id,
                'level_id' => $pr->level_id,
                'level'    => $pr->level?->name,
                'price'    => (float) $pr->price,
                'fee'      => (float) $pr->fee,
            ])->values(),
        ];
    }

    private function logActivity(string $action, string $module, string $description): void
    {
        $user = auth('api')->user();
        if (!$user) {
            return;
        }

        ActivityLog::create([
            'user_id'     => $user->id,
            'action'      => $action,
            'module'      => $module,
            'description' => $description,
            'ip_address'  => request()->ip(),
        ]);
    }

    private function notify(int $userId, string $title, string $message, string $type = 'info'): void
    {
        Notification::create([
            'user_id'    => $userId,
            'title'      => $title,
            'message'    => $message,
            'type'       => $type,
            'is_read'    => false,
            'created_at' => now(),
        ]);
    }

    // =========================================================================
    // 7. LAPORAN, REKAP PRODUKSI & EKSPOR DATA
    // =========================================================================

    public function reportSummary(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $orderQuery = Order::active();
        $paymentQuery = Payment::query()->where('status', 'disetujui');

        if ($startDate) {
            $orderQuery->whereDate('created_at', '>=', $startDate);
            $paymentQuery->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $orderQuery->whereDate('created_at', '<=', $endDate);
            $paymentQuery->whereDate('created_at', '<=', $endDate);
        }

        $totalOrders = (clone $orderQuery)->count();
        $totalOmzet = (float) (clone $orderQuery)->where('status', '!=', 'batal')->where('status', '!=', 'Dibatalkan')->sum('total_amount');
        $totalPaid = (float) (clone $paymentQuery)->sum('amount');
        $totalOutstanding = max(0, $totalOmzet - $totalPaid);

        $statusCounts = (clone $orderQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $brandRekap = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('product_variants', 'order_items.product_variant_id', '=', 'product_variants.id')
            ->join('products', 'product_variants.product_id', '=', 'products.id')
            ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->whereNull('orders.deleted_at')
            ->where('orders.status', '!=', 'batal')
            ->where('orders.status', '!=', 'Dibatalkan')
            ->when($startDate, fn ($q) => $q->whereDate('orders.created_at', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('orders.created_at', '<=', $endDate))
            ->select(
                DB::raw('COALESCE(brands.name, "Tanpa Brand") as brand_name'),
                DB::raw('COUNT(DISTINCT orders.id) as total_orders'),
                DB::raw('SUM(order_items.quantity) as total_qty'),
                DB::raw('SUM(order_items.subtotal) as total_omzet')
            )
            ->groupBy('brand_name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Ringkasan laporan penjualan berhasil dimuat.',
            'data'    => [
                'total_orders'      => $totalOrders,
                'total_omzet'       => $totalOmzet,
                'total_paid'        => $totalPaid,
                'total_outstanding' => $totalOutstanding,
                'status_breakdown'  => $statusCounts,
                'brand_breakdown'   => $brandRekap,
            ],
        ]);
    }

    public function reportProduction(Request $request): JsonResponse
    {
        $batchId = $request->input('batch_id');

        $batches = PoBatch::query()
            ->when($batchId, fn ($q) => $q->where('id', $batchId))
            ->with(['products.variants'])
            ->orderByDesc('id')
            ->get();

        $data = $batches->map(function ($batch) {
            $productIds = $batch->products->pluck('id')->toArray();

            $variantSummary = OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->join('product_variants', 'order_items.product_variant_id', '=', 'product_variants.id')
                ->whereIn('product_variants.product_id', $productIds)
                ->whereNull('orders.deleted_at')
                ->where('orders.status', '!=', 'batal')
                ->where('orders.status', '!=', 'Dibatalkan')
                ->select(
                    'product_variants.id as variant_id',
                    'product_variants.product_id',
                    'product_variants.sku',
                    'product_variants.color',
                    'product_variants.size',
                    DB::raw('SUM(order_items.quantity) as total_ordered_qty')
                )
                ->groupBy('product_variants.id', 'product_variants.product_id', 'product_variants.sku', 'product_variants.color', 'product_variants.size')
                ->get();

            $orderProductionStatuses = Order::active()
                ->whereHas('items.variant.product', fn ($q) => $q->where('po_batch_id', $batch->id))
                ->select('production_status', DB::raw('count(*) as count'), DB::raw('SUM(total_amount) as total_amount'))
                ->groupBy('production_status')
                ->get();

            return [
                'batch_id'            => $batch->id,
                'batch_name'          => $batch->name,
                'start_date'          => $batch->start_date,
                'end_date'            => $batch->end_date,
                'estimated_delivery'  => $batch->estimated_delivery ?? $batch->target_date ?? null,
                'total_products'      => $batch->products->count(),
                'total_ordered_items' => (int) $variantSummary->sum('total_ordered_qty'),
                'variant_summary'     => $variantSummary,
                'production_statuses' => $orderProductionStatuses,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Rekap produksi batch PO berhasil dimuat.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function exportReport(Request $request)
    {
        $type = strtolower((string) $request->input('type', 'orders'));
        $filename = 'export_' . $type . '_' . now()->format('Ymd_His') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($type) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");

            if ($type === 'production') {
                fputcsv($handle, ['No. Pesanan', 'Tanggal Pesan', 'Batch', 'Nama Produk', 'Warna', 'Ukuran', 'Qty', 'Status Produksi', 'Status Pesanan']);
                $items = OrderItem::query()
                    ->join('orders', 'order_items.order_id', '=', 'orders.id')
                    ->join('product_variants', 'order_items.product_variant_id', '=', 'product_variants.id')
                    ->join('products', 'product_variants.product_id', '=', 'products.id')
                    ->leftJoin('po_batches', 'products.po_batch_id', '=', 'po_batches.id')
                    ->whereNull('orders.deleted_at')
                    ->select(
                        'orders.order_number',
                        'orders.created_at',
                        'po_batches.name as batch_name',
                        'products.name as product_name',
                        'product_variants.color',
                        'product_variants.size',
                        'order_items.quantity',
                        'orders.production_status',
                        'orders.status as order_status'
                    )
                    ->orderBy('orders.id', 'desc')
                    ->cursor();

                foreach ($items as $row) {
                    fputcsv($handle, [
                        $row->order_number,
                        $row->created_at ? \Carbon\Carbon::parse($row->created_at)->format('Y-m-d H:i') : '-',
                        $row->batch_name ?? '-',
                        $row->product_name ?? '-',
                        $row->color ?? '-',
                        $row->size ?? '-',
                        $row->quantity,
                        $row->production_status ?? '-',
                        $row->order_status,
                    ]);
                }
            } elseif ($type === 'finance' || $type === 'omzet') {
                fputcsv($handle, ['No. Invoice', 'No. Pesanan', 'Nama Mitra', 'Total Tagihan', 'Sudah Dibayar', 'Sisa Tagihan', 'Status Tagihan', 'Tanggal']);
                $invoices = Invoice::query()
                    ->with(['order.user'])
                    ->whereHas('order', fn ($q) => $q->whereNull('deleted_at'))
                    ->orderBy('id', 'desc')
                    ->cursor();

                foreach ($invoices as $inv) {
                    fputcsv($handle, [
                        $inv->invoice_number,
                        $inv->order?->order_number ?? '-',
                        $inv->order?->user?->nama ?? $inv->order?->user?->name ?? 'Mitra',
                        $inv->total_amount,
                        $inv->paid_amount,
                        $inv->outstanding_amount,
                        $inv->status,
                        $inv->created_at ? \Carbon\Carbon::parse($inv->created_at)->format('Y-m-d H:i') : '-',
                    ]);
                }
            } else {
                fputcsv($handle, ['No. Pesanan', 'Tanggal', 'Nama Mitra', 'Kota', 'Total Qty', 'Subtotal', 'Ongkir', 'Total Tagihan', 'Status Pesanan', 'Status Produksi']);
                $orders = Order::active()
                    ->with(['user', 'items'])
                    ->orderBy('id', 'desc')
                    ->cursor();

                foreach ($orders as $ord) {
                    fputcsv($handle, [
                        $ord->order_number,
                        $ord->created_at ? \Carbon\Carbon::parse($ord->created_at)->format('Y-m-d H:i') : '-',
                        $ord->user?->nama ?? $ord->user?->name ?? '-',
                        $ord->user?->city ?? '-',
                        $ord->items->sum('quantity'),
                        $ord->subtotal,
                        $ord->shipping_cost,
                        $ord->total_amount,
                        $ord->status,
                        $ord->production_status ?? '-',
                    ]);
                }
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
