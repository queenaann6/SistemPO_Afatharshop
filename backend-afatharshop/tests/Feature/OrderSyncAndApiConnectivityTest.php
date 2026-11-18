<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\BankAccount;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Courier;
use App\Models\Level;
use App\Models\PoBatch;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OrderSyncAndApiConnectivityTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<int, string> */
    private array $uploadedPublicFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->uploadedPublicFiles as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
        parent::tearDown();
    }

    private function resetJwtGuardState(): void
    {
        $guard = auth('api');
        $guard->forgetUser();
        if (method_exists($guard, 'unsetToken')) {
            $guard->unsetToken();
        }
        foreach (['tymon.jwt', 'tymon.jwt.auth'] as $binding) {
            if (app()->bound($binding)) {
                $instance = app($binding);
                if (method_exists($instance, 'unsetToken')) {
                    $instance->unsetToken();
                }
            }
        }
    }

    private function asToken(string $token): self
    {
        $this->resetJwtGuardState();

        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ]);
    }

    /**
     * Login actor through real auth endpoint so JWT guard matches HTTP traffic.
     */
    private function loginToken(string $email, string $password = 'secret123', string $endpoint = '/api/auth/login'): string
    {
        $this->resetJwtGuardState();

        $payload = $endpoint === '/api/admin/login'
            ? ['email' => $email, 'password' => $password]
            : ['login' => $email, 'password' => $password];

        $res = $this->postJson($endpoint, $payload);
        $res->assertStatus(200)->assertJsonPath('success', true);

        $token = (string) $res->json('token');
        $this->resetJwtGuardState();

        return $token;
    }

    /**
     * Create core actors across every dashboard role plus their active JWTs.
     */
    private function seedActors(): array
    {
        $password = Hash::make('secret123');

        $mitra = User::create([
            'nama' => 'Mitra Utama',
            'email' => 'mitra@afathar.test',
            'password' => $password,
            'level' => 'DB All',
            'phone' => '081234567890',
            'city' => 'Bandung',
            'deposit_balance' => 0,
            'is_active' => true,
        ]);

        $purchasing = User::create([
            'nama' => 'Purchasing Staff',
            'email' => 'purchasing@afathar.test',
            'password' => $password,
            'level' => 'marketing',
            'phone' => '081200000001',
            'city' => 'Jakarta',
            'is_active' => true,
        ]);

        $finance = User::create([
            'nama' => 'Finance Staff',
            'email' => 'finance@afathar.test',
            'password' => $password,
            'level' => 'finance',
            'phone' => '081200000002',
            'city' => 'Jakarta',
            'is_active' => true,
        ]);

        $owner = User::create([
            'nama' => 'Owner Afathar',
            'email' => 'owner@afathar.test',
            'password' => $password,
            'level' => 'owner',
            'phone' => '081200000003',
            'city' => 'Jakarta',
            'is_active' => true,
        ]);

        return [
            'mitra' => $mitra,
            'purchasing' => $purchasing,
            'finance' => $finance,
            'owner' => $owner,
            'tokens' => [
                'mitra' => $this->loginToken($mitra->email),
                'purchasing' => $this->loginToken($purchasing->email, 'secret123', '/api/admin/login'),
                'finance' => $this->loginToken($finance->email, 'secret123', '/api/admin/login'),
                'owner' => $this->loginToken($owner->email, 'secret123', '/api/admin/login'),
            ],
        ];
    }

    /**
     * Create active master entities + open PO batch product with 2 variants.
     */
    private function seedCatalog(): array
    {
        $level = Level::create(['name' => 'DB All', 'description' => 'Distributor Utama']);
        $supplier = Supplier::create(['name' => 'Konveksi Nusantara', 'city' => 'Bandung']);
        $brand = Brand::create(['name' => 'Afathar Kids', 'supplier_id' => $supplier->id, 'is_active' => true]);
        $category = Category::create(['name' => 'Gamis Anak', 'slug' => 'gamis-anak']);
        $batch = PoBatch::create([
            'brand_id' => $brand->id,
            'name' => 'Batch Test 01',
            'start_date' => now()->toDateString(),
            'close_date' => now()->addDays(14),
            'estimated_shipment' => now()->addDays(21)->toDateString(),
            'status' => 'open',
        ]);

        $product = Product::create([
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'po_batch_id' => $batch->id,
            'name' => 'Gamis Raya Silk',
            'article_code' => 'GRS-01',
            'series' => 'Raya',
            'status' => 'pre_order',
            'tutup_po' => now()->addDays(14),
            'estimated_shipment' => now()->addDays(21)->toDateString(),
            'min_dp_percent' => 30,
            'termin_count' => 2,
            'stock_quota' => 500,
            'is_active' => true,
        ]);

        ProductPrice::create([
            'product_id' => $product->id,
            'level_id' => $level->id,
            'level' => 'DB All',
            'price' => 100000,
            'discount_percent' => 0,
        ]);

        $v1 = ProductVariant::create([
            'product_id' => $product->id,
            'model' => 'Dewasa',
            'size' => 'M',
            'color' => 'Maroon',
            'sku' => 'GRS-DW-M',
            'stock' => 200,
            'price' => 100000,
            'addon' => 5000,
            'is_active' => true,
        ]);

        $v2 = ProductVariant::create([
            'product_id' => $product->id,
            'model' => 'Anak',
            'size' => 'L',
            'color' => 'Sage',
            'sku' => 'GRS-AN-L',
            'stock' => 200,
            'price' => 100000,
            'addon' => 0,
            'is_active' => true,
        ]);

        $courier = Courier::create(['name' => 'JNE Cargo', 'code' => 'JTR', 'is_active' => true]);
        $bank = BankAccount::create([
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_holder' => 'PT Afathar',
            'type' => 'public',
            'is_active' => true,
        ]);

        return compact('level', 'supplier', 'brand', 'category', 'batch', 'product', 'v1', 'v2', 'courier', 'bank');
    }

    public function test_auth_and_profile_endpoints(): void
    {
        $this->getJson('/api/health')->assertStatus(200)->assertJsonPath('success', true);

        $reg = $this->postJson('/api/auth/register', [
            'name' => 'Mitra Baru',
            'email' => 'baru@afathar.test',
            'password' => 'secret123',
            'level' => 'Reseller',
            'phone' => '081999999999',
            'city' => 'Surabaya',
        ]);
        $reg->assertStatus(200)->assertJsonPath('success', true)->assertJsonPath('user.role', 'mitra');
        $mitraToken = (string) $reg->json('token');

        $this->asToken($mitraToken)->getJson('/api/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.email', 'baru@afathar.test');

        $this->asToken($mitraToken)->getJson('/api/my/profile')
            ->assertStatus(200)
            ->assertJsonPath('data.level', 'Reseller');

        $this->asToken($mitraToken)->putJson('/api/auth/profile', [
            'nama' => 'Mitra Updated',
            'city' => 'Malang',
        ])->assertStatus(200)->assertJsonPath('user.nama', 'Mitra Updated');

        $this->asToken($mitraToken)->putJson('/api/my/profile', [
            'phone' => '081888888888',
        ])->assertStatus(200)->assertJsonPath('user.phone', '081888888888');

        $this->asToken($mitraToken)->putJson('/api/auth/password', [
            'current_password' => 'secret123',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ])->assertStatus(200);

        $this->asToken($mitraToken)->putJson('/api/my/password', [
            'current_password' => 'newpass123',
            'password' => 'finalpass123',
            'password_confirmation' => 'finalpass123',
        ])->assertStatus(200);

        $mitraToken = $this->loginToken('baru@afathar.test', 'finalpass123');
        $refresh = $this->asToken($mitraToken)->postJson('/api/auth/refresh');
        $refresh->assertStatus(200)->assertJsonStructure(['token']);
        $refreshedToken = (string) $refresh->json('token');

        $this->asToken($refreshedToken)->postJson('/api/auth/logout')->assertStatus(200);

        User::create([
            'nama' => 'Admin Panel',
            'email' => 'adminpanel@afathar.test',
            'password' => Hash::make('secret123'),
            'level' => 'owner',
            'is_active' => true,
        ]);
        $adminToken = $this->loginToken('adminpanel@afathar.test', 'secret123', '/api/admin/login');
        $this->asToken($adminToken)->postJson('/api/admin/logout')->assertStatus(200);
    }

    public function test_public_catalog_cart_wishlist_levels_and_addresses_endpoints(): void
    {
        $actors = $this->seedActors();
        $catalog = $this->seedCatalog();
        $mitraToken = $actors['tokens']['mitra'];
        $ownerToken = $actors['tokens']['owner'];

        $this->getJson('/api/catalog')->assertStatus(200)->assertJsonPath('success', true);
        $this->getJson('/api/products')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->getJson('/api/products/' . $catalog['product']->id)->assertStatus(200);
        $this->getJson('/api/brands')->assertStatus(200);
        $this->getJson('/api/suppliers')->assertStatus(200);
        $this->getJson('/api/categories')->assertStatus(200);
        $this->getJson('/api/couriers')->assertStatus(200);
        $this->getJson('/api/bank-accounts')->assertStatus(200);
        $this->getJson('/api/batches')->assertStatus(200);
        $this->getJson('/api/levels')->assertStatus(401);
        $this->getJson('/api/levels/' . $catalog['level']->id)->assertStatus(401);
        $this->asToken($mitraToken)->getJson('/api/levels')->assertStatus(200);
        $this->asToken($mitraToken)->getJson('/api/levels/' . $catalog['level']->id)->assertStatus(200);

        $this->asToken($mitraToken)->postJson('/api/levels', ['name' => 'Forbidden'])
            ->assertStatus(403);

        $createdLvl = $this->asToken($ownerToken)->postJson('/api/levels', [
            'name' => 'Distributor Gold',
            'description' => 'Level test',
        ])->assertStatus(201)->json('data.id');
        $this->asToken($ownerToken)->putJson('/api/levels/' . $createdLvl, ['name' => 'Distributor Platinum'])
            ->assertStatus(200);
        $this->asToken($ownerToken)->deleteJson('/api/levels/' . $createdLvl)->assertStatus(200);

        $addCart = $this->asToken($mitraToken)->postJson('/api/cart/items', [
            'product_variant_id' => $catalog['v1']->id,
            'quantity' => 2,
            'order_type' => 'dp',
        ])->assertStatus(201);
        $cartItemId = $addCart->json('data.0.id');

        $this->asToken($mitraToken)->getJson('/api/cart')->assertStatus(200);
        $this->asToken($mitraToken)->putJson('/api/cart/items/' . $cartItemId, ['quantity' => 3])
            ->assertStatus(200);
        $this->asToken($mitraToken)->postJson('/api/cart/sync', [
            'items' => [['product_variant_id' => $catalog['v2']->id, 'quantity' => 1, 'order_type' => 'lunas']],
        ])->assertStatus(200);
        $this->asToken($mitraToken)->deleteJson('/api/cart/items/' . $cartItemId)->assertStatus(200);
        $this->asToken($mitraToken)->deleteJson('/api/cart')->assertStatus(200);

        $this->asToken($mitraToken)->postJson('/api/wishlist/toggle', ['product_id' => $catalog['product']->id])
            ->assertStatus(200);
        $this->asToken($mitraToken)->getJson('/api/wishlist')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->asToken($mitraToken)->deleteJson('/api/wishlist/' . $catalog['product']->id)->assertStatus(200);

        $addrId = $this->asToken($mitraToken)->postJson('/api/my/addresses', [
            'label' => 'Rumah',
            'recipient_name' => 'Mitra Utama',
            'recipient_phone' => '081234567890',
            'address_line' => 'Jl. Braga No. 10',
            'city' => 'Bandung',
            'province' => 'Jawa Barat',
            'postal_code' => '40111',
            'is_default' => true,
        ])->assertStatus(201)->json('data.id');

        $this->asToken($mitraToken)->getJson('/api/my/addresses')->assertStatus(200);
        $this->asToken($mitraToken)->putJson('/api/my/addresses/' . $addrId, ['city' => 'Cimahi'])->assertStatus(200);
        $this->asToken($mitraToken)->deleteJson('/api/my/addresses/' . $addrId)->assertStatus(200);
    }

    public function test_full_order_lifecycle_synchronizes_across_all_dashboards(): void
    {
        $actors = $this->seedActors();
        $catalog = $this->seedCatalog();
        $mitra = $actors['mitra'];
        $mitraToken = $actors['tokens']['mitra'];
        $purchasingToken = $actors['tokens']['purchasing'];
        $financeToken = $actors['tokens']['finance'];

        $address = Address::create([
            'user_id' => $mitra->id,
            'label' => 'Gudang Mitra',
            'recipient_name' => 'Mitra Utama',
            'recipient_phone' => '081234567890',
            'address_line' => 'Jl. Dago No. 99',
            'city' => 'Bandung',
            'province' => 'Jawa Barat',
            'postal_code' => '40135',
            'is_default' => true,
        ]);

        // 1. Mitra Checkout with multi-item discount + addon + splits math
        // Item 1: 2 * 100000 - 20000 + 10000 = 190000; Item 2: 1 * 100000 = 100000; subtotal = 290000
        $orderRes = $this->asToken($mitraToken)->postJson('/api/orders', [
            'address_id' => $address->id,
            'courier_name' => 'JNE Cargo',
            'notes' => 'Order sinkronisasi penuh',
            'is_split_address' => true,
            'subtotal' => 290000,
            'shipping_cost' => 0,
            'total_amount' => 290000,
            'items' => [
                [
                    'product_variant_id' => $catalog['v1']->id,
                    'quantity' => 2,
                    'unit_price' => 100000,
                    'discount_nominal' => 20000,
                    'addon_nominal' => 10000,
                    'subtotal' => 190000,
                    'address_id' => $address->id,
                    'splits' => [[
                        'id' => 'SP-1',
                        'qty' => 2,
                        'address' => ['id' => $address->id, 'recipient_name' => 'Mitra Utama'],
                    ]],
                ],
                [
                    'product_variant_id' => $catalog['v2']->id,
                    'quantity' => 1,
                    'unit_price' => 100000,
                    'discount_nominal' => 0,
                    'addon_nominal' => 0,
                    'subtotal' => 100000,
                ],
            ],
        ]);

        $orderRes->assertStatus(201)
            ->assertJsonPath('data.status', 'Menunggu ACC Marketing')
            ->assertJsonPath('data.marketing_status', 'PENDING')
            ->assertJsonPath('data.subtotal', 290000)
            ->assertJsonPath('data.total_amount', 290000);

        $orderId = (int) $orderRes->json('data.id');
        $orderNumber = (string) $orderRes->json('data.order_number');
        $invoiceId = (int) $orderRes->json('data.invoice.id');
        $dpInstallment = collect($orderRes->json('data.invoice.installments'))->firstWhere('type', 'dp');
        $pelInstallment = collect($orderRes->json('data.invoice.installments'))->firstWhere('type', 'pelunasan');

        // Mitra updates note pre-ACC + inspects order/invoice routes
        $this->asToken($mitraToken)->putJson('/api/orders/' . $orderId, ['notes' => 'Catatan diperbarui'])
            ->assertStatus(200)
            ->assertJsonPath('data.notes', 'Catatan diperbarui');

        $this->asToken($mitraToken)->getJson('/api/orders')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->asToken($mitraToken)->getJson('/api/orders/' . $orderId)->assertStatus(200);
        $this->asToken($mitraToken)->getJson('/api/orders/' . $orderNumber . '/invoice')->assertStatus(200);
        $this->asToken($mitraToken)->getJson('/api/invoices/' . $invoiceId)->assertStatus(200);

        // Purchasing & Finance & Owner visibility
        $this->asToken($purchasingToken)->getJson('/api/management/orders')
            ->assertStatus(200)->assertJsonCount(1, 'data');
        $this->asToken($purchasingToken)->getJson('/api/management/bootstrap')
            ->assertStatus(200)->assertJsonCount(1, 'data.orders');
        $this->asToken($financeToken)->getJson('/api/management/orders/' . $orderId . '/invoice')
            ->assertStatus(200);
        $this->asToken($financeToken)->getJson('/api/management/invoices/' . $invoiceId)
            ->assertStatus(200);

        // 2. Purchasing Reject -> Reopen -> ACC
        $this->asToken($purchasingToken)->patchJson('/api/management/orders/' . $orderId . '/status', [
            'status' => 'Ditolak Marketing',
            'marketing_status' => 'TOLAK',
            'marketing_note' => 'Konfirmasi warna dulu',
        ])->assertStatus(200)
            ->assertJsonPath('data.marketing_status', 'TOLAK')
            ->assertJsonPath('data.marketing_note', 'Konfirmasi warna dulu');

        $this->asToken($purchasingToken)->patchJson('/api/management/orders/' . $orderId . '/status', [
            'status' => 'Menunggu ACC Marketing',
            'marketing_status' => 'PENDING',
        ])->assertStatus(200)
            ->assertJsonPath('data.marketing_status', 'PENDING')
            ->assertJsonPath('data.marketing_note', null);

        $this->asToken($purchasingToken)->patchJson('/api/management/orders/' . $orderId . '/status', [
            'status' => 'Menunggu DP',
            'marketing_status' => 'ACC',
        ])->assertStatus(200)
            ->assertJsonPath('data.status', 'Menunggu DP')
            ->assertJsonPath('data.marketing_status', 'ACC')
            ->assertJsonPath('data.marketing_by', 'Purchasing Staff');

        // 3. Mitra uploads file + submits DP -> Finance rejects -> Re-upload -> Finance ACC
        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        $uploadRes = $this->asToken($mitraToken)->post('/api/uploads', [
            'folder' => 'proof',
            'file' => UploadedFile::fake()->createWithContent('dp-proof.png', $tinyPng),
        ]);
        $uploadRes->assertStatus(201)->assertJsonStructure(['data' => ['path', 'url']]);
        $proofPath = (string) $uploadRes->json('data.path');
        $this->uploadedPublicFiles[] = public_path(ltrim($proofPath, '/'));

        $dpPayment1 = $this->asToken($mitraToken)->postJson('/api/my/payments', [
            'order_id' => $orderId,
            'invoice_id' => $invoiceId,
            'installment_id' => $dpInstallment['id'],
            'stage' => 'dp',
            'amount' => $dpInstallment['amount'],
            'proof_url' => $proofPath,
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'note' => 'DP percobaan 1',
        ])->assertStatus(201);

        $dpPay1Id = (int) $dpPayment1->json('data.id');
        $this->asToken($financeToken)->getJson('/api/management/payments')->assertStatus(200);
        $this->asToken($financeToken)->patchJson('/api/management/payments/' . $dpPay1Id . '/verify', [
            'status' => 'ditolak',
            'rejection_reason' => 'Foto bukti transfer buram',
        ])->assertStatus(200)->assertJsonPath('data.status', 'ditolak');

        $this->asToken($mitraToken)->getJson('/api/my/payments')
            ->assertStatus(200)
            ->assertJsonPath('data.0.status', 'ditolak')
            ->assertJsonPath('data.0.bank_name', 'BCA');

        $dpPayment2 = $this->asToken($mitraToken)->postJson('/api/my/payments', [
            'order_id' => $orderId,
            'invoice_id' => $invoiceId,
            'installment_id' => $dpInstallment['id'],
            'stage' => 'dp',
            'amount' => $dpInstallment['amount'],
            'proof_url' => $proofPath,
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'note' => 'DP jelas',
        ])->assertStatus(201);

        $dpVerify2 = $this->asToken($financeToken)->patchJson(
            '/api/management/payments/' . $dpPayment2->json('data.id') . '/verify',
            ['status' => 'disetujui']
        )->assertStatus(200);

        $dpVerify2->assertJsonPath('data.status', 'disetujui')
            ->assertJsonPath('order.id', $orderId);

        // Notifications delivered to mitra
        $notifId = $this->asToken($mitraToken)->getJson('/api/my/notifications')
            ->assertStatus(200)->json('data.0.id');
        $this->asToken($mitraToken)->patchJson('/api/my/notifications/read', ['id' => $notifId])
            ->assertStatus(200);

        // 4. Finance sets Production Ready -> Mitra confirms address -> Address lock check (423)
        $this->asToken($financeToken)->patchJson('/api/management/orders/' . $orderId . '/status', [
            'production_status' => 'Ready',
            'status' => 'Menunggu Alamat Mitra',
        ])->assertStatus(200)
            ->assertJsonPath('data.production_status', 'Ready')
            ->assertJsonPath('data.status', 'Menunggu Alamat Mitra');

        $this->assertNotNull(
            $this->asToken($financeToken)->getJson('/api/management/orders/' . $orderId . '/invoice')->json('data.ready_at')
        );

        $this->asToken($mitraToken)->patchJson('/api/orders/' . $orderId . '/address', [
            'address_id' => $address->id,
            'courier_name' => 'JNE Cargo',
            'notes' => 'Kirim ke gudang Bandung',
            'is_split_address' => false,
        ])->assertStatus(200)->assertJsonPath('data.status', 'Menunggu Input Ongkir');

        // Locked once submitted for weighing
        $this->asToken($mitraToken)->patchJson('/api/orders/' . $orderId . '/address', [
            'courier_name' => 'SiCepat',
        ])->assertStatus(423);

        // 5. Finance inputs Ongkir + edits Invoice line math without double subtraction
        $this->asToken($financeToken)->patchJson('/api/management/orders/' . $orderId . '/status', [
            'shipping_cost' => 25000,
            'courier_name' => 'JNE Cargo',
            'weight_kg' => 3.5,
            'shipping_note' => '1 koli aman',
            'status' => 'Menunggu Pelunasan + Ongkir',
        ])->assertStatus(200)
            ->assertJsonPath('data.shipping_cost', 25000)
            ->assertJsonPath('data.weight_kg', 3.5)
            ->assertJsonPath('data.shipping_note', '1 koli aman')
            ->assertJsonPath('data.total_amount', 315000);

        // Finance Invoice Edit before lunas: 2*100000 (10% disc = 20000, addon 5000*2 = 10000 => 190000) + 1*100000 => 290000
        $existingItems = $this->asToken($financeToken)->getJson('/api/management/orders/' . $orderId . '/invoice')->json('data.items');
        $invEdit = $this->asToken($financeToken)->patchJson('/api/management/orders/' . $orderId . '/invoice', [
            'dp_pct' => 30,
            'shipping_cost' => 25000,
            'items' => [
                [
                    'id' => $existingItems[0]['id'],
                    'product_variant_id' => $existingItems[0]['product_variant_id'],
                    'quantity' => 2,
                    'unit_price' => 100000,
                    'discount_pct' => 10,
                    'addon' => 5000,
                ],
                [
                    'id' => $existingItems[1]['id'],
                    'product_variant_id' => $existingItems[1]['product_variant_id'],
                    'quantity' => 1,
                    'unit_price' => 100000,
                    'discount_pct' => 0,
                    'addon' => 0,
                ],
            ],
        ])->assertStatus(200);

        $invEdit->assertJsonPath('data.subtotal', 290000)
            ->assertJsonPath('data.total_amount', 315000);

        // 6. Deposit Topup + Verify + Reject bad Ongkir proof + Pay Pelunasan & Ongkir via Saldo Deposit
        $depositRes = $this->asToken($mitraToken)->postJson('/api/my/deposits', [
            'amount' => 500000,
            'bank_account_id' => $catalog['bank']->id,
            'proof_url' => $proofPath,
            'description' => 'Topup untuk pelunasan dan ongkir',
        ])->assertStatus(201);

        $this->asToken($mitraToken)->getJson('/api/my/deposits')->assertStatus(200)->assertJsonCount(1, 'data');

        $this->asToken($financeToken)->patchJson('/api/management/deposits/' . $depositRes->json('data.id') . '/verify', [
            'status' => 'acc',
        ])->assertStatus(200)->assertJsonPath('data.balance_after', 500000);

        $badOngkir = $this->asToken($mitraToken)->postJson('/api/my/payments', [
            'order_id' => $orderId,
            'invoice_id' => $invoiceId,
            'stage' => 'ongkir',
            'amount' => 25000,
            'proof_url' => $proofPath,
            'bank_name' => 'BCA',
        ])->assertStatus(201);

        $this->asToken($financeToken)->patchJson('/api/management/payments/' . $badOngkir->json('data.id') . '/verify', [
            'status' => 'ditolak',
            'rejection_reason' => 'Nominal transfer salah',
        ])->assertStatus(200);

        $pelPay = $this->asToken($mitraToken)->postJson('/api/my/payments/deposit', [
            'order_id' => $orderId,
            'invoice_id' => $invoiceId,
            'installment_id' => $pelInstallment['id'],
            'stage' => 'pelunasan',
            'amount' => $pelInstallment['amount'],
            'note' => 'Bayar pelunasan dari deposit',
        ])->assertStatus(201);
        $pelPay->assertJsonPath('data.payment.method', 'deposit')
            ->assertJsonPath('data.payment.account_number', 'Saldo Deposit')
            ->assertJsonPath('data.stage', 'pelunasan');

        $ongkirPay = $this->asToken($mitraToken)->postJson('/api/my/payments/deposit', [
            'order_id' => $orderId,
            'invoice_id' => $invoiceId,
            'stage' => 'ongkir',
            'amount' => 25000,
            'note' => 'Bayar ongkir dari deposit',
        ])->assertStatus(201);
        $ongkirPay->assertJsonPath('data.payment.method', 'deposit')
            ->assertJsonPath('data.payment.account_number', 'Saldo Deposit')
            ->assertJsonPath('data.stage', 'ongkir')
            ->assertJsonPath('data.order.status', 'Siap Kirim');

        $mitra->refresh();
        $expectedLeftover = round(500000 - (float) $pelInstallment['amount'] - 25000, 2);
        $this->assertEquals($expectedLeftover, round((float) $mitra->deposit_balance, 2));

        // 7. Finance Resi & Selesai Priority over invoice.status === 'lunas'
        $shipRes = $this->asToken($financeToken)->patchJson('/api/management/orders/' . $orderId . '/status', [
            'tracking_number' => 'JNE-RESI-001',
            'status' => 'Dikirim',
        ])->assertStatus(200);
        $shipRes->assertJsonPath('data.status', 'Dikirim')
            ->assertJsonPath('data.tracking_number', 'JNE-RESI-001');
        $this->assertNotNull($shipRes->json('data.shipped_at'));

        $doneRes = $this->asToken($financeToken)->patchJson('/api/management/orders/' . $orderId . '/status', [
            'status' => 'Selesai',
        ])->assertStatus(200);
        $doneRes->assertJsonPath('data.status', 'Selesai');
        $this->assertNotNull($doneRes->json('data.received_at'));

        $this->asToken($mitraToken)->getJson('/api/orders/' . $orderId)
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'Selesai');
    }

    public function test_manual_order_trash_restore_and_permanent_delete_sync(): void
    {
        $actors = $this->seedActors();
        $catalog = $this->seedCatalog();
        $mitraToken = $actors['tokens']['mitra'];
        $purchasingToken = $actors['tokens']['purchasing'];
        $ownerToken = $actors['tokens']['owner'];

        $manual = $this->asToken($purchasingToken)->postJson('/api/management/orders', [
            'user_id' => $actors['mitra']->id,
            'courier_name' => 'JNE Cargo',
            'notes' => 'Order manual purchasing',
            'items' => [[
                'product_variant_id' => $catalog['v1']->id,
                'quantity' => 2,
                'unit_price' => 100000,
            ]],
        ])->assertStatus(201);
        $manualId = (int) $manual->json('data.id');

        $this->asToken($purchasingToken)->putJson('/api/management/orders/' . $manualId, [
            'notes' => 'Order manual updated',
        ])->assertStatus(200);

        $this->asToken($mitraToken)->postJson('/api/my/payments', [
            'order_id' => $manualId,
            'stage' => 'dp',
            'amount' => 60000,
            'bank_name' => 'BCA',
        ])->assertStatus(201);

        // Soft-trash excludes order from active feeds & mitra payments, appears in trashed endpoint
        $this->asToken($purchasingToken)->postJson('/api/management/orders/' . $manualId . '/trash', [
            'reason' => 'Duplikat input manual',
        ])->assertStatus(200)->assertJsonPath('data.delete_reason', 'Duplikat input manual');

        $this->asToken($mitraToken)->getJson('/api/orders')->assertStatus(200)->assertJsonCount(0, 'data');
        $this->asToken($mitraToken)->getJson('/api/my/payments')->assertStatus(200)->assertJsonCount(0, 'data');
        $this->asToken($purchasingToken)->getJson('/api/management/orders')->assertStatus(200)->assertJsonCount(0, 'data');
        $this->asToken($purchasingToken)->getJson('/api/management/bootstrap')->assertStatus(200)->assertJsonCount(0, 'data.orders');
        $this->asToken($purchasingToken)->getJson('/api/management/orders/trashed')->assertStatus(200)->assertJsonCount(1, 'data');

        // Restore brings order back to active listings
        $this->asToken($purchasingToken)->postJson('/api/management/orders/' . $manualId . '/restore')
            ->assertStatus(200)->assertJsonPath('data.deleted_at', null);

        $this->asToken($purchasingToken)->getJson('/api/management/orders/trashed')->assertStatus(200)->assertJsonCount(0, 'data');
        $this->asToken($purchasingToken)->getJson('/api/management/orders')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->asToken($mitraToken)->getJson('/api/orders')->assertStatus(200)->assertJsonCount(1, 'data');

        // Permanent delete hanya boleh dilakukan oleh Owner (Purchasing ditolak 403)
        $this->asToken($purchasingToken)->deleteJson('/api/management/orders/' . $manualId)->assertStatus(403);
        $this->asToken($ownerToken)->deleteJson('/api/management/orders/' . $manualId)->assertStatus(200);
        $this->asToken($purchasingToken)->getJson('/api/management/orders')->assertStatus(200)->assertJsonCount(0, 'data');
    }

    public function test_management_crud_payment_requests_settings_notifications_and_logs(): void
    {
        $actors = $this->seedActors();
        $catalog = $this->seedCatalog();
        $purchasingToken = $actors['tokens']['purchasing'];
        $financeToken = $actors['tokens']['finance'];
        $ownerToken = $actors['tokens']['owner'];

        // Master CRUD (suppliers, brands, categories, batches, products, bank-accounts, couriers, users)
        $supId = $this->asToken($purchasingToken)->postJson('/api/management/suppliers', ['name' => 'Supplier Baru'])
            ->assertStatus(201)->json('data.id');
        $this->asToken($purchasingToken)->putJson('/api/management/suppliers/' . $supId, ['name' => 'Supplier Revisi'])
            ->assertStatus(200);

        $brId = $this->asToken($purchasingToken)->postJson('/api/management/brands', [
            'name' => 'Brand Baru',
            'supplier_id' => $supId,
        ])->assertStatus(201)->json('data.id');
        $this->asToken($purchasingToken)->putJson('/api/management/brands/' . $brId, ['name' => 'Brand Revisi'])
            ->assertStatus(200);

        $catId = $this->asToken($purchasingToken)->postJson('/api/management/categories', ['name' => 'Koko Anak'])
            ->assertStatus(201)->json('data.id');
        $this->asToken($purchasingToken)->putJson('/api/management/categories/' . $catId, ['name' => 'Koko Premium'])
            ->assertStatus(200);

        $batchId = $this->asToken($purchasingToken)->postJson('/api/management/batches', [
            'name' => 'Batch CRUD 02',
            'brand_id' => $brId,
            'status' => 'open',
        ])->assertStatus(201)->json('data.id');
        $this->asToken($purchasingToken)->putJson('/api/management/batches/' . $batchId, ['name' => 'Batch CRUD Updated'])
            ->assertStatus(200);

        $prodId = $this->asToken($purchasingToken)->postJson('/api/management/products', [
            'name' => 'Koko Lebaran',
            'brand_id' => $brId,
            'category_id' => $catId,
            'po_batch_id' => $batchId,
            'price' => 120000,
            'status' => 'pre_order',
        ])->assertStatus(201)->json('data.id');
        $this->asToken($purchasingToken)->putJson('/api/management/products/' . $prodId, ['name' => 'Koko Lebaran Edit'])
            ->assertStatus(200);
        // Purchasing tidak berhak menghapus master data (harus ditolak 403)
        $this->asToken($purchasingToken)->deleteJson('/api/management/products/' . $prodId)->assertStatus(403);

        // Hanya Owner yang boleh menghapus master data produk, batch, dsb
        $this->asToken($ownerToken)->deleteJson('/api/management/products/' . $prodId)->assertStatus(200);
        $this->asToken($ownerToken)->deleteJson('/api/management/batches/' . $batchId)->assertStatus(200);
        $this->asToken($ownerToken)->deleteJson('/api/management/categories/' . $catId)->assertStatus(200);
        $this->asToken($ownerToken)->deleteJson('/api/management/brands/' . $brId)->assertStatus(200);
        $this->asToken($ownerToken)->deleteJson('/api/management/suppliers/' . $supId)->assertStatus(200);

        // Rekening bank dikelola oleh Finance & Owner
        $bankId = $this->asToken($financeToken)->postJson('/api/management/bank-accounts', [
            'bank_name' => 'Mandiri',
            'account_number' => '9988776655',
            'account_holder' => 'Afathar Finance',
        ])->assertStatus(201)->json('data.id');
        $this->asToken($financeToken)->putJson('/api/management/bank-accounts/' . $bankId, ['account_holder' => 'Afathar Corp'])
            ->assertStatus(200);
        $this->asToken($financeToken)->deleteJson('/api/management/bank-accounts/' . $bankId)->assertStatus(200);

        // Kurir operasional
        $courId = $this->asToken($purchasingToken)->postJson('/api/management/couriers', ['name' => 'Cargo Baru'])
            ->assertStatus(201)->json('data.id');
        $this->asToken($purchasingToken)->putJson('/api/management/couriers/' . $courId, ['name' => 'Cargo Edit'])
            ->assertStatus(200);
        $this->asToken($purchasingToken)->deleteJson('/api/management/couriers/' . $courId)->assertStatus(200);

        $usrId = $this->asToken($ownerToken)->postJson('/api/management/users', [
            'nama' => 'Mitra Created',
            'email' => 'createdmitra@afathar.test',
            'level' => 'Agen',
            'password' => 'secret123',
        ])->assertStatus(201)->json('data.id');
        $this->asToken($ownerToken)->putJson('/api/management/users/' . $usrId, ['city' => 'Semarang'])->assertStatus(200);
        $this->asToken($ownerToken)->deleteJson('/api/management/users/' . $usrId)->assertStatus(200);

        // Payment requests flow: Finance create -> Purchasing ACC -> Owner ACC -> Finance Transfer -> Delete
        $prId = $this->asToken($financeToken)->postJson('/api/management/payment-requests', [
            'amount' => 1500000,
            'purpose' => 'DP Bahan Kain',
            'bank_account_id' => $catalog['bank']->id,
        ])->assertStatus(201)->assertJsonPath('data.status', 'Menunggu Review Purchasing')->json('data.id');

        $this->asToken($purchasingToken)->patchJson('/api/management/payment-requests/' . $prId, [
            'marketing_decision' => 'ACC',
        ])->assertStatus(200)->assertJsonPath('data.status', 'Menunggu ACC Owner');

        $this->asToken($ownerToken)->patchJson('/api/management/payment-requests/' . $prId, [
            'owner_decision' => 'ACC',
        ])->assertStatus(200)->assertJsonPath('data.status', 'ACC Owner');

        $this->asToken($financeToken)->patchJson('/api/management/payment-requests/' . $prId, [
            'transfer_proof' => '/uploads/proof/vendor-transfer.jpg',
            'transfer_note' => 'Sudah dikirim',
        ])->assertStatus(200)->assertJsonPath('data.status', 'Selesai Ditransfer');

        $this->asToken($financeToken)->getJson('/api/management/payment-requests')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->asToken($ownerToken)->deleteJson('/api/management/payment-requests/' . $prId)->assertStatus(200);

        // Settings, manual deposit/payment delete, notifications & owner activity logs
        $this->asToken($financeToken)->getJson('/api/management/settings')->assertStatus(200);
        $this->asToken($financeToken)->putJson('/api/management/settings', ['dpPct' => 40])->assertStatus(200);

        $manualDepId = $this->asToken($financeToken)->postJson('/api/management/deposits', [
            'user_id' => $actors['mitra']->id,
            'amount' => 100000,
        ])->assertStatus(201)->json('data.id');
        $this->asToken($financeToken)->deleteJson('/api/management/deposits/' . $manualDepId)->assertStatus(200);

        $manualOrderId = $this->asToken($purchasingToken)->postJson('/api/management/orders', [
            'user_id' => $actors['mitra']->id,
            'items' => [['product_variant_id' => $catalog['v1']->id, 'quantity' => 1, 'unit_price' => 100000]],
        ])->assertStatus(201)->json('data.id');
        $manualPayId = $this->asToken($financeToken)->postJson('/api/management/payments', [
            'order_id' => $manualOrderId,
            'stage' => 'dp',
            'amount' => 30000,
        ])->assertStatus(201)->json('data.id');
        $this->asToken($financeToken)->deleteJson('/api/management/payments/' . $manualPayId)->assertStatus(200);

        $this->asToken($ownerToken)->getJson('/api/management/notifications')->assertStatus(200);
        $this->asToken($ownerToken)->patchJson('/api/management/notifications/read')->assertStatus(200);

        $logRes = $this->asToken($ownerToken)->getJson('/api/management/activity-logs')->assertStatus(200);
        $firstLogId = $logRes->json('data.0.id');
        if ($firstLogId) {
            $this->asToken($ownerToken)->deleteJson('/api/management/activity-logs/' . $firstLogId)->assertStatus(200);
        }
        $this->asToken($ownerToken)->deleteJson('/api/management/activity-logs')->assertStatus(200);
    }

    public function test_security_mitra_registration_and_idor_protection(): void
    {
        $actors = $this->seedActors();
        $mitraToken = $actors['tokens']['mitra'];

        // 1. Pendaftaran publik mengunci role ke mitra meskipun di request dikirim role admin/owner
        $regRes = $this->postJson('/api/auth/register', [
            'nama' => 'Hacker Admin Wannabe',
            'email' => 'hacker@afathar.test',
            'password' => 'secret123',
            'phone' => '089911223344',
            'city' => 'Jakarta',
            'role' => 'owner',
            'level' => 'owner',
        ])->assertStatus(200);

        $createdUser = \App\Models\User::where('email', 'hacker@afathar.test')->first();
        $this->assertNotNull($createdUser);
        $this->assertSame('Reseller', $createdUser->level);
        $this->assertSame('mitra', $createdUser->role);

        // 2. Proteksi IDOR: Mitra tidak bisa mengakses order milik mitra lain
        $otherMitra = \App\Models\User::create([
            'nama' => 'Mitra Korban',
            'email' => 'victim@afathar.test',
            'password' => Hash::make('secret123'),
            'level' => 'reseller',
            'is_active' => true,
        ]);
        $otherOrder = \App\Models\Order::create([
            'user_id' => $otherMitra->id,
            'order_number' => 'PO-TEST-VICTIM-01',
            'status' => 'Menunggu ACC Marketing',
            'subtotal' => 200000,
            'total_amount' => 200000,
        ]);

        // Mitra lain mencoba show order korban -> ditolak (404 / 403)
        $this->asToken($mitraToken)->getJson('/api/orders/' . $otherOrder->id)->assertStatus(404);
        $this->asToken($mitraToken)->getJson('/api/invoices/' . $otherOrder->id)->assertStatus(404);
        $this->asToken($mitraToken)->putJson('/api/orders/' . $otherOrder->id, ['notes' => 'Tampered'])->assertStatus(403);
    }

    public function test_forgot_password_and_customer_order_cancellation_and_reports(): void
    {
        $actors = $this->seedActors();
        $mitraToken = $actors['tokens']['mitra'];
        $ownerToken = $actors['tokens']['owner'];

        // 1. Forgot password & reset password flow
        $forgot = $this->postJson('/api/auth/forgot-password', [
            'email' => $actors['mitra']->email,
        ])->assertStatus(200);

        $resetToken = $forgot->json('reset_token');
        $this->assertNotEmpty($resetToken);

        $this->postJson('/api/auth/reset-password', [
            'email' => $actors['mitra']->email,
            'token' => $resetToken,
            'password' => 'NewPass#123',
            'password_confirmation' => 'NewPass#123',
        ])->assertStatus(200);

        // Verifikasi login dengan password baru
        $this->postJson('/api/auth/login', [
            'login' => $actors['mitra']->email,
            'password' => 'NewPass#123',
        ])->assertStatus(200);

        // 2. Pembatalan pesanan oleh pelanggan
        $order = \App\Models\Order::create([
            'user_id' => $actors['mitra']->id,
            'order_number' => 'PO-CANCEL-TEST-01',
            'status' => 'Menunggu ACC Marketing',
            'subtotal' => 100000,
            'total_amount' => 100000,
        ]);

        $cancelRes = $this->asToken($mitraToken)->postJson('/api/orders/' . $order->id . '/cancel', [
            'reason' => 'Ingin mengubah varian warna',
        ])->assertStatus(200);

        $this->assertSame('Dibatalkan', $order->fresh()->status);

        // 3. Reports & Production summary
        $this->asToken($ownerToken)->getJson('/api/management/reports/summary')->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->asToken($ownerToken)->getJson('/api/management/reports/production')->assertStatus(200)
            ->assertJsonPath('success', true);

        $export = $this->asToken($ownerToken)->get('/api/management/reports/export?type=orders');
        $export->assertStatus(200);
        $this->assertStringContainsString('text/csv', $export->headers->get('content-type'));
    }

    public function test_brand_api_lifecycle_and_nominal_discounts_across_all_sides(): void
    {
        $actors = $this->seedActors();
        $purchasingToken = $actors['tokens']['purchasing'];
        $ownerToken = $actors['tokens']['owner'];

        // 1. Publik: list brands
        $publicBrandsRes = $this->getJson('/api/brands')->assertStatus(200);
        $publicBrandsRes->assertJsonPath('success', true);

        // 2. Tambah brand baru dengan diskon nominal & fee nominal besar (> 999.99) oleh Purchasing (marketing)
        $createRes = $this->asToken($purchasingToken)->postJson('/api/management/brands', [
            'name'              => 'Brand Premium Hijab',
            'supplier'          => 'Pabrik Konveksi Solo',
            'address'           => 'Surakarta',
            'discount_type'     => 'nominal',
            'discount_value'    => 35000.00,
            'fee_type'          => 'nominal',
            'discount_db_all'   => 20000.00,
            'discount_sub_db'   => 15000.00,
            'discount_agen'     => 10000.00,
            'discount_reseller' => 5000.00,
        ])->assertStatus(201);

        $createRes->assertJsonPath('success', true);
        $createRes->assertJsonPath('data.name', 'Brand Premium Hijab');
        $createRes->assertJsonPath('data.supplier', 'Pabrik Konveksi Solo');
        $this->assertEquals(35000, $createRes->json('data.discount_value'));
        $this->assertEquals(20000, $createRes->json('data.discount_db_all'));

        $brandId = $createRes->json('data.id');
        $this->assertIsNumeric($brandId);

        // 3. Detail brand: publik dan management
        $this->getJson('/api/brands/' . $brandId)->assertStatus(200)
            ->assertJsonPath('data.name', 'Brand Premium Hijab');

        $this->asToken($purchasingToken)->getJson('/api/management/brands/' . $brandId)->assertStatus(200)
            ->assertJsonPath('data.name', 'Brand Premium Hijab');

        // 4. Update brand menggunakan slug ID (b-ID)
        $updateRes = $this->asToken($purchasingToken)->putJson('/api/management/brands/b-' . $brandId, [
            'name'              => 'Brand Premium Hijab Updated',
            'discount_value'    => 40000.00,
            'discount_db_all'   => 25000.00,
        ])->assertStatus(200);

        $updateRes->assertJsonPath('data.name', 'Brand Premium Hijab Updated');
        $this->assertEquals(40000, $updateRes->json('data.discount_value'));
        $this->assertEquals(25000, $updateRes->json('data.discount_db_all'));

        // 5. RBAC: Staff Purchasing (marketing) tidak boleh menghapus brand (403 Forbidden)
        $this->asToken($purchasingToken)->deleteJson('/api/management/brands/' . $brandId)
            ->assertStatus(403);

        // 6. Cek integritas relasi: Owner mencoba menghapus brand yang terhubung ke produk (409 Conflict)
        $product = Product::create([
            'brand_id'    => $brandId,
            'name'        => 'Gamis Syari Test Brand',
            'price'       => 150000,
            'status'      => 'draft',
            'is_active'   => true,
        ]);

        $conflictDelete = $this->asToken($ownerToken)->deleteJson('/api/management/brands/' . $brandId);
        $conflictDelete->assertStatus(409);

        // Hapus produk terlebih dahulu
        $product->delete();

        // 7. Hapus brand sukses dilakukan oleh Owner
        $deleteRes = $this->asToken($ownerToken)->deleteJson('/api/management/brands/' . $brandId);
        $deleteRes->assertStatus(200)->assertJsonPath('success', true);

        // Pastikan brand sudah tidak ada di publik
        $this->getJson('/api/brands/' . $brandId)->assertStatus(404);
    }
}
