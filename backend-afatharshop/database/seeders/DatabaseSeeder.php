<?php

namespace Database\Seeders;

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
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    private const LEVEL_IDS = [
        'DB All'   => 1,
        'Sub DB'   => 2,
        'Agen'     => 3,
        'Reseller' => 4,
    ];

    public function run(): void
    {
        $this->seedReferenceData();
        $this->seedPeople();
        $this->seedCatalog();
        $this->seedAddresses();
        $this->seedOrders();
        $this->seedDeposits();
        $this->seedPaymentRequests();
        $this->seedNotifications();
        $this->seedActivityLog();
        $this->seedSettings();
    }

    private function seedReferenceData(): void
    {
        $levels = [
            ['id' => 1, 'name' => 'DB All', 'description' => 'Distributor'],
            ['id' => 2, 'name' => 'Sub DB', 'description' => 'Sub Distributor'],
            ['id' => 3, 'name' => 'Agen', 'description' => 'Agen'],
            ['id' => 4, 'name' => 'Reseller', 'description' => 'Reseller'],
            ['id' => 5, 'name' => 'Marketing', 'description' => 'Admin Marketing'],
            ['id' => 6, 'name' => 'Finance', 'description' => 'Admin Finance'],
            ['id' => 7, 'name' => 'Owner', 'description' => 'Owner'],
        ];
        foreach ($levels as $level) {
            Level::updateOrCreate(['id' => $level['id']], $level);
        }

        $categories = [
            ['id' => 1, 'name' => 'Sarimbit Keluarga', 'slug' => 'sarimbit-keluarga', 'icon' => 'SparklesIcon'],
            ['id' => 2, 'name' => 'Gamis & Abaya', 'slug' => 'gamis-abaya', 'icon' => 'TagIcon'],
            ['id' => 3, 'name' => 'Khimar & Bergo Syar\'i', 'slug' => 'khimar-bergo', 'icon' => 'HeartIcon'],
            ['id' => 4, 'name' => 'Scarf & Voal Premium', 'slug' => 'scarf-voal', 'icon' => 'StarIcon'],
            ['id' => 5, 'name' => 'Oneset & Kids', 'slug' => 'oneset-kids', 'icon' => 'UserIcon'],
            ['id' => 6, 'name' => 'Prayer Set & Mukena', 'slug' => 'prayer-set', 'icon' => 'CheckIcon'],
            ['id' => 7, 'name' => 'Tas Kulit & Aksesoris', 'slug' => 'tas-aksesoris', 'icon' => 'ShoppingBagIcon'],
        ];
        foreach ($categories as $category) {
            Category::updateOrCreate(['id' => $category['id']], $category);
        }

        $suppliers = [
            ['id' => 1, 'name' => 'Hana Textile', 'city' => 'Bandung', 'phone' => '08122334455', 'contact_person' => 'Bpk. Ahmad'],
            ['id' => 2, 'name' => 'Bandung Garment', 'city' => 'Bandung', 'phone' => '08129988776', 'contact_person' => 'Ibu Rina'],
            ['id' => 3, 'name' => 'Gaya Hijab Factory', 'city' => 'Solo', 'phone' => '08137788990', 'contact_person' => 'Bpk. Tri'],
            ['id' => 4, 'name' => 'Sentra Konveksi Pekalongan', 'city' => 'Pekalongan', 'phone' => '08125566778', 'contact_person' => 'Bpk. Wahyu'],
            ['id' => 5, 'name' => 'Garmen Nusantara Bogor', 'city' => 'Bogor', 'phone' => '08139900112', 'contact_person' => 'Ibu Maya'],
        ];
        foreach ($suppliers as $supplier) {
            Supplier::updateOrCreate(['id' => $supplier['id']], $supplier);
        }

        $banks = [
            ['id' => 1, 'bank_name' => 'BCA', 'account_number' => '739-082-9988', 'account_holder' => 'CV AFATHAR SHOP DISTRIBUTOR', 'logo' => 'BCA', 'is_active' => true],
            ['id' => 2, 'bank_name' => 'Bank Mandiri', 'account_number' => '133-00-2998801', 'account_holder' => 'CV AFATHAR SHOP DISTRIBUTOR', 'logo' => 'MANDIRI', 'is_active' => true],
            ['id' => 3, 'bank_name' => 'BSI Syariah', 'account_number' => '718-002-9988', 'account_holder' => 'CV AFATHAR SHOP DISTRIBUTOR', 'logo' => 'BSI', 'is_active' => true],
            ['id' => 4, 'bank_name' => 'Bank BRI', 'account_number' => '0120-01-002998-50-2', 'account_holder' => 'CV AFATHAR SHOP DISTRIBUTOR', 'logo' => 'BRI', 'is_active' => true],
        ];
        foreach ($banks as $bank) {
            BankAccount::updateOrCreate(['id' => $bank['id']], $bank);
        }

        $couriers = [
            ['id' => 1, 'name' => 'JNE Reguler / Trucking JTR', 'code' => 'jne', 'description' => 'Estimasi 2-3 hari kerja untuk pulau Jawa & Sumatra', 'is_active' => true],
            ['id' => 2, 'name' => 'J&T Express & Kargo', 'code' => 'jnt', 'description' => 'Pengiriman cepat seluruh wilayah Indonesia', 'is_active' => true],
            ['id' => 3, 'name' => 'SiCepat Cargo (GOKIL)', 'code' => 'sicepat', 'description' => 'Ongkir kargo hemat untuk pesanan serian sarimbit masal', 'is_active' => true],
            ['id' => 4, 'name' => 'Ambil Sendiri di Gudang Pusat', 'code' => 'pickup', 'description' => 'Ambil langsung di Gudang Afatharshop Bogor (Gratis Ongkir)', 'is_active' => true],
        ];
        foreach ($couriers as $courier) {
            Courier::updateOrCreate(['id' => $courier['id']], $courier);
        }

        $brands = [
            ['id' => 1, 'supplier_id' => 1, 'name' => 'Coverme Hijab', 'logo' => 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=120', 'description' => 'Brand busana muslimah syar\'i premium', 'discount_db_all' => 35.00, 'discount_sub_db' => 30.00, 'discount_agen' => 20.00, 'discount_reseller' => 15.00, 'is_active' => true],
            ['id' => 2, 'supplier_id' => 2, 'name' => 'Isa Luxury', 'logo' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120', 'description' => 'Koleksi sarimbit keluarga mewah', 'discount_db_all' => 30.00, 'discount_sub_db' => 25.00, 'discount_agen' => 20.00, 'discount_reseller' => 15.00, 'is_active' => true],
            ['id' => 3, 'supplier_id' => 3, 'name' => 'Kaen Boutique', 'logo' => 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120', 'description' => 'Khimar dan voal eksklusif butik', 'discount_db_all' => 35.00, 'discount_sub_db' => 30.00, 'discount_agen' => 25.00, 'discount_reseller' => 15.00, 'is_active' => true],
            ['id' => 4, 'supplier_id' => 4, 'name' => 'Dalanova', 'logo' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=120', 'description' => 'Botanical series dress & mukena', 'discount_db_all' => 30.00, 'discount_sub_db' => 25.00, 'discount_agen' => 20.00, 'discount_reseller' => 10.00, 'is_active' => true],
            ['id' => 5, 'supplier_id' => 5, 'name' => 'Babyjab Hijab', 'logo' => 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=120', 'description' => 'Koleksi busana anak nyaman', 'discount_db_all' => 30.00, 'discount_sub_db' => 25.00, 'discount_agen' => 20.00, 'discount_reseller' => 15.00, 'is_active' => true],
        ];
        foreach ($brands as $brand) {
            Brand::updateOrCreate(['id' => $brand['id']], $brand);
        }

        $batches = [
            ['id' => 1, 'brand_id' => 1, 'name' => 'BATCH 1 - SERI SARIMBIT 2027', 'start_date' => '2026-10-01', 'close_date' => '2026-11-15 10:30:00', 'estimated_shipment' => '2027-01-09', 'status' => 'open'],
            ['id' => 2, 'brand_id' => 2, 'name' => 'BATCH 2 - ISA HERITAGE LUXURY', 'start_date' => '2026-10-05', 'close_date' => '2026-11-30 18:00:00', 'estimated_shipment' => '2027-01-20', 'status' => 'open'],
            ['id' => 3, 'brand_id' => 3, 'name' => 'BATCH 3 - KAEN & DALANOVA SERIES', 'start_date' => '2026-10-10', 'close_date' => '2026-12-05 23:59:00', 'estimated_shipment' => '2027-02-01', 'status' => 'open'],
        ];
        foreach ($batches as $batch) {
            PoBatch::updateOrCreate(['id' => $batch['id']], $batch);
        }
    }

    private function seedPeople(): void
    {
        $users = [
            ['id' => 1, 'nama' => 'HENI', 'email' => 'afatharshop@afatharshop.com', 'level' => 'DB All', 'phone' => '0812-1999-1888', 'city' => 'KOTA BEKASI', 'deposit_balance' => 1500000, 'is_active' => true, 'avatar' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'],
            ['id' => 2, 'nama' => 'RINA MARKETING', 'email' => 'marketing@afatharshop.com', 'level' => 'Marketing', 'phone' => '0812-2222-3333', 'city' => 'KOTA BOGOR', 'deposit_balance' => 0, 'is_active' => true, 'avatar' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'],
            ['id' => 3, 'nama' => 'DEWI FINANCE', 'email' => 'finance@afatharshop.com', 'level' => 'Finance', 'phone' => '0812-4444-5555', 'city' => 'KOTA BOGOR', 'deposit_balance' => 0, 'is_active' => true, 'avatar' => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80'],
            ['id' => 4, 'nama' => 'FATURAHMAN OWNER', 'email' => 'owner@afatharshop.com', 'level' => 'Owner', 'phone' => '0812-6666-7777', 'city' => 'KOTA BOGOR', 'deposit_balance' => 0, 'is_active' => true, 'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80'],
            ['id' => 7, 'nama' => 'Dewi Lestari', 'email' => 'dewi.lestari@gmail.com', 'level' => 'Reseller', 'phone' => '081234567803', 'city' => 'Medan', 'deposit_balance' => 250000, 'is_active' => true, 'avatar' => 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80'],
            ['id' => 8, 'nama' => 'Rina Kartika', 'email' => 'rina.kartika@gmail.com', 'level' => 'Sub DB', 'phone' => '081377889900', 'city' => 'Semarang', 'deposit_balance' => 0, 'is_active' => true, 'avatar' => 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=256&q=80'],
            ['id' => 9, 'nama' => 'Ayu Puspita', 'email' => 'ayu.puspita@gmail.com', 'level' => 'Agen', 'phone' => '081255667788', 'city' => 'Yogyakarta', 'deposit_balance' => 0, 'is_active' => false, 'avatar' => 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=256&q=80'],
            ['id' => 10, 'nama' => 'Lia Marketing', 'email' => 'lia@afatharshop.com', 'level' => 'Marketing', 'phone' => '081200000004', 'city' => 'KOTA BOGOR', 'deposit_balance' => 0, 'is_active' => true, 'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'],
            ['id' => 11, 'nama' => 'Dito Finance', 'email' => 'dito@afatharshop.com', 'level' => 'Finance', 'phone' => '081200000005', 'city' => 'KOTA BOGOR', 'deposit_balance' => 0, 'is_active' => false, 'avatar' => 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80'],
        ];

        foreach ($users as $user) {
            $attributes = $user;
            $attributes['password'] = Hash::make('password123');
            User::updateOrCreate(['id' => $user['id']], $attributes);
        }
    }

    private function seedCatalog(): void
    {
        $products = [
            [
                'id' => 1, 'brand_id' => 1, 'category_id' => 2, 'po_batch_id' => 1,
                'name' => 'Safiyya Premium Abaya Set', 'article_code' => 'SFY-2027-01',
                'image' => 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85',
                'series' => 'OFFICIAL EXCLUSIVE COLLECTION • 2027 SERIES', 'status' => 'pre_order',
                'tutup_po' => '2026-11-15 10:30:00', 'estimated_shipment' => '2027-01-09',
                'min_dp_percent' => 25, 'stock_quota' => 48,
                'description' => 'Koleksi sarimbit sarat keanggunan keluarga dengan perpaduan Jacquard Silk & Katun Toyobo premium.',
                'material_detail' => 'Jacquard Silk Exclusive x Ceruty Babydoll Armani. Busui friendly, wudhu friendly manset kancing.',
                'prices' => [1 => 159000, 2 => 172000, 3 => 198000, 4 => 225000],
                'variants' => [
                    ['sku' => 'SFY-MOM-L-NOIR', 'model' => 'MOM DRESS ONLY STYLE 1', 'size' => 'L', 'color' => 'NOIR MATTE', 'stock' => 48],
                    ['sku' => 'SFY-DAD-XL-NOIR', 'model' => 'DAD PANJANG', 'size' => 'XL', 'color' => 'NOIR MATTE', 'stock' => 36],
                ],
            ],
            [
                'id' => 2, 'brand_id' => 1, 'category_id' => 1, 'po_batch_id' => 1,
                'name' => 'Arunika Family Series - Espresso', 'article_code' => 'ARN-2027-02',
                'image' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=85',
                'series' => 'OFFICIAL EXCLUSIVE COLLECTION • 2027 SERIES', 'status' => 'pre_order',
                'is_sale' => true, 'discount_percent' => 15, 'original_price' => 245000,
                'tutup_po' => '2026-11-15 10:30:00', 'estimated_shipment' => '2027-01-15',
                'min_dp_percent' => 25, 'stock_quota' => 36,
                'description' => 'Sarimbit keluarga nuansa espresso hangat dengan siluet kontemporer berpadu aksen bordir etnik.',
                'material_detail' => 'Royal Silk Jacquard mix Ceruty Baby Doll. Hidden zipper depan, layer bertingkat.',
                'prices' => [1 => 209000, 2 => 226000, 3 => 261000, 4 => 296000],
                'variants' => [
                    ['sku' => 'ARN-MOM-L-NOIR', 'model' => 'MOM DRESS', 'size' => 'L', 'color' => 'ESPRESSO', 'stock' => 36],
                    ['sku' => 'ARN-DAD-XL-NOIR', 'model' => 'DAD PANJANG', 'size' => 'XL', 'color' => 'ESPRESSO', 'stock' => 24],
                ],
            ],
            [
                'id' => 3, 'brand_id' => 1, 'category_id' => 1, 'po_batch_id' => 1,
                'name' => 'Greenism Senada', 'article_code' => 'GRN-2027-03',
                'image' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85',
                'series' => 'OFFICIAL EXCLUSIVE COLLECTION • 2027 SERIES', 'status' => 'pre_order',
                'is_sale' => true, 'discount_percent' => 10, 'original_price' => 200000,
                'tutup_po' => '2026-11-15 10:30:00', 'estimated_shipment' => '2027-01-20',
                'min_dp_percent' => 25, 'stock_quota' => 30,
                'description' => 'Dress senada keluarga, bahan adem dan tidak menerawang.',
                'material_detail' => 'Crinkle airflow premium, busui friendly.',
                'prices' => [1 => 180000, 2 => 198000, 3 => 225000, 4 => 250000],
                'variants' => [
                    ['sku' => 'GRN-ARM-M', 'model' => 'ARM', 'size' => 'M', 'color' => 'ARMY', 'stock' => 30],
                    ['sku' => 'GRN-DAD-XL', 'model' => 'DAD PANJANG', 'size' => 'XL', 'color' => 'ARMY', 'stock' => 20],
                ],
            ],
            [
                'id' => 4, 'brand_id' => 2, 'category_id' => 1, 'po_batch_id' => 2,
                'name' => 'Nararya Sarimbit Kartika Raya', 'article_code' => 'NAR-2027-04',
                'image' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85',
                'series' => 'ISA HERITAGE LUXURY • 2027 SERIES', 'status' => 'pre_order',
                'is_sale' => true, 'discount_percent' => 12, 'original_price' => 280000,
                'tutup_po' => '2026-11-30 18:00:00', 'estimated_shipment' => '2027-01-20',
                'min_dp_percent' => 25, 'stock_quota' => 40,
                'description' => 'Sarimbit premium dengan bordir kartika raya, cocok untuk acara keluarga besar.',
                'material_detail' => 'Satin silk premium dengan lining nyaman.',
                'prices' => [1 => 245000, 2 => 268000, 3 => 295000, 4 => 330000],
                'variants' => [
                    ['sku' => 'NAR-MOM-L', 'model' => 'MOM DRESS', 'size' => 'L', 'color' => 'KARTIKA', 'stock' => 30],
                    ['sku' => 'NAR-DAD-XL', 'model' => 'DAD PANJANG', 'size' => 'XL', 'color' => 'KARTIKA', 'stock' => 20],
                ],
            ],
            [
                'id' => 5, 'brand_id' => 3, 'category_id' => 3, 'po_batch_id' => 3,
                'name' => 'Khimar Aisyah Premium', 'article_code' => 'KHM-2027-05',
                'image' => 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85',
                'series' => 'KAEN BOUTIQUE • 2027 SERIES', 'status' => 'pre_order',
                'tutup_po' => '2026-12-05 23:59:00', 'estimated_shipment' => '2027-02-01',
                'min_dp_percent' => 25, 'stock_quota' => 50,
                'description' => 'Khimar syar\'i premium dengan bahan flowy dan jahitan rapi.',
                'material_detail' => 'Ceruty premium, pet anti-panas.',
                'prices' => [1 => 129000, 2 => 139000, 3 => 155000, 4 => 169000],
                'variants' => [
                    ['sku' => 'KHM-A-BLK', 'model' => 'AISYAH', 'size' => 'ALL SIZE', 'color' => 'BLACK', 'stock' => 50],
                    ['sku' => 'KHM-A-MOC', 'model' => 'AISYAH', 'size' => 'ALL SIZE', 'color' => 'MOCA', 'stock' => 40],
                ],
            ],
            [
                'id' => 6, 'brand_id' => 4, 'category_id' => 6, 'po_batch_id' => 3,
                'name' => 'Mukena Dalanova Travel', 'article_code' => 'MKN-2027-06',
                'image' => 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=1000&q=85',
                'series' => 'DALANOVA BOTANICAL • 2027 SERIES', 'status' => 'pre_order',
                'tutup_po' => '2026-12-05 23:59:00', 'estimated_shipment' => '2027-02-01',
                'min_dp_percent' => 25, 'stock_quota' => 36,
                'description' => 'Mukena travel ringan dengan tas praktis, cocok dibawa bepergian.',
                'material_detail' => 'Katun micro anti-gerah.',
                'prices' => [1 => 149000, 2 => 159000, 3 => 175000, 4 => 189000],
                'variants' => [
                    ['sku' => 'MKN-TRV-GRN', 'model' => 'TRAVEL', 'size' => 'ALL SIZE', 'color' => 'SAGE', 'stock' => 25],
                    ['sku' => 'MKN-TRV-BGE', 'model' => 'TRAVEL', 'size' => 'ALL SIZE', 'color' => 'BEIGE', 'stock' => 25],
                ],
            ],
            [
                'id' => 7, 'brand_id' => 5, 'category_id' => 5, 'po_batch_id' => 3,
                'name' => 'Oneset Kids Hasan', 'article_code' => 'KID-2027-07',
                'image' => 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=1000&q=85',
                'series' => 'BABYJAB KIDS • 2027 SERIES', 'status' => 'pre_order',
                'tutup_po' => '2026-12-05 23:59:00', 'estimated_shipment' => '2027-02-01',
                'min_dp_percent' => 25, 'stock_quota' => 60,
                'description' => 'Oneset anak laki-laki bahan adem, jahitan kuat untuk bermain seharian.',
                'material_detail' => 'Cotton combed 24s.',
                'prices' => [1 => 99000, 2 => 109000, 3 => 119000, 4 => 129000],
                'variants' => [
                    ['sku' => 'KID-HSN-2T', 'model' => 'ONESET', 'size' => '2T', 'color' => 'NAVY', 'stock' => 30],
                    ['sku' => 'KID-HSN-4T', 'model' => 'ONESET', 'size' => '4T', 'color' => 'NAVY', 'stock' => 30],
                ],
            ],
            [
                'id' => 8, 'brand_id' => 1, 'category_id' => 4, 'po_batch_id' => 1,
                'name' => 'Safiyya Voal Scarf', 'article_code' => 'SCF-2027-08',
                'image' => 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1000&q=85',
                'series' => 'OFFICIAL EXCLUSIVE COLLECTION • 2027 SERIES', 'status' => 'pre_order',
                'tutup_po' => '2026-11-15 10:30:00', 'estimated_shipment' => '2027-01-09',
                'min_dp_percent' => 25, 'stock_quota' => 80,
                'description' => 'Voal premium motif eksklusif, mudah dibentuk dan tidak licin.',
                'material_detail' => 'Voal ultrafine.',
                'prices' => [1 => 79000, 2 => 85000, 3 => 95000, 4 => 105000],
                'variants' => [
                    ['sku' => 'SCF-VOAL-CRM', 'model' => 'VOAL', 'size' => '110x110', 'color' => 'CREAM', 'stock' => 40],
                    ['sku' => 'SCF-VOAL-NVY', 'model' => 'VOAL', 'size' => '110x110', 'color' => 'NAVY', 'stock' => 40],
                ],
            ],
            [
                'id' => 9, 'brand_id' => 2, 'category_id' => 2, 'po_batch_id' => 2,
                'name' => 'Tunik Alma', 'article_code' => 'TNK-2026-09',
                'image' => 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=1000&q=85',
                'series' => 'ISA EVERYDAY COLLECTION', 'status' => 'closed_po',
                'tutup_po' => '2026-10-20 18:00:00', 'estimated_shipment' => '2026-12-20',
                'min_dp_percent' => 25, 'stock_quota' => 25,
                'description' => 'Tunik katun premium dengan potongan casual.',
                'material_detail' => 'Katun premium.',
                'prices' => [1 => 135000, 2 => 145000, 3 => 160000, 4 => 175000],
                'variants' => [
                    ['sku' => 'TNK-ALM-SGE', 'model' => 'CASUAL', 'size' => 'M', 'color' => 'SAGE GREEN', 'stock' => 0],
                    ['sku' => 'TNK-ALM-CHO', 'model' => 'CASUAL', 'size' => 'M', 'color' => 'COKELAT', 'stock' => 0],
                ],
            ],
            [
                'id' => 10, 'brand_id' => 3, 'category_id' => 7, 'po_batch_id' => 3,
                'name' => 'Tas Kulit Syar\'i', 'article_code' => 'TAS-2026-10',
                'image' => 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85',
                'series' => 'KAEN ACCESSORIES', 'status' => 'ready_stock',
                'tutup_po' => null, 'estimated_shipment' => null,
                'min_dp_percent' => 0, 'stock_quota' => 20,
                'description' => 'Tas kulit sintetis premium dengan desain minimalis.',
                'material_detail' => 'Kulit sintetis premium.',
                'prices' => [1 => 189000, 2 => 199000, 3 => 215000, 4 => 235000],
                'variants' => [
                    ['sku' => 'TAS-KLT-BLK', 'model' => 'TOTE', 'size' => 'ONE SIZE', 'color' => 'BLACK', 'stock' => 10],
                    ['sku' => 'TAS-KLT-TAN', 'model' => 'TOTE', 'size' => 'ONE SIZE', 'color' => 'TAN', 'stock' => 10],
                ],
            ],
        ];

        foreach ($products as $data) {
            $prices = $data['prices'];
            $variants = $data['variants'];
            unset($data['prices'], $data['variants']);
            $data['is_active'] = true;

            $product = Product::updateOrCreate(['id' => $data['id']], $data);

            foreach ($variants as $variant) {
                ProductVariant::updateOrCreate(
                    ['sku' => $variant['sku']],
                    array_merge($variant, ['product_id' => $product->id, 'is_active' => true])
                );
            }

            foreach ($prices as $levelId => $price) {
                ProductPrice::updateOrCreate(
                    ['product_id' => $product->id, 'level_id' => $levelId],
                    ['price' => $price, 'fee' => 0]
                );
            }
        }
    }

    private function seedAddresses(): void
    {
        $addresses = [
            ['email' => 'afatharshop@maknahijab.com', 'recipient_name' => 'HENI', 'recipient_phone' => '081219991888', 'address_line' => 'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86, Kelurahan Jakasampurna, Kecamatan Bekasi Barat', 'city' => 'Kota Bekasi', 'province' => 'Jawa Barat', 'postal_code' => '17145'],
            ['email' => 'budi.santoso@gmail.com', 'recipient_name' => 'Budi Santoso', 'recipient_phone' => '081234567801', 'address_line' => 'Jl. Cihampelas No. 88, Ruko Blok B, Coblong', 'city' => 'Bandung', 'province' => 'Jawa Barat', 'postal_code' => '40131'],
            ['email' => 'siti.rahma@gmail.com', 'recipient_name' => 'Siti Rahma', 'recipient_phone' => '081234567802', 'address_line' => 'Jl. Darmo Permai No. 21, Dukuh Pakis', 'city' => 'Surabaya', 'province' => 'Jawa Timur', 'postal_code' => '60226'],
            ['email' => 'dewi.lestari@gmail.com', 'recipient_name' => 'Dewi Lestari', 'recipient_phone' => '081234567803', 'address_line' => 'Jl. Gatot Subroto No. 45, Medan Sunggal', 'city' => 'Medan', 'province' => 'Sumatera Utara', 'postal_code' => '20122'],
            ['email' => 'rina.kartika@gmail.com', 'recipient_name' => 'Rina Kartika', 'recipient_phone' => '081377889900', 'address_line' => 'Jl. Pandanaran No. 7, Ruko 2, Semarang Selatan', 'city' => 'Semarang', 'province' => 'Jawa Tengah', 'postal_code' => '50242'],
            ['email' => 'ayu.puspita@gmail.com', 'recipient_name' => 'Ayu Puspita', 'recipient_phone' => '081255667788', 'address_line' => 'Jl. Kaliurang KM 5, Sleman', 'city' => 'Yogyakarta', 'province' => 'DI Yogyakarta', 'postal_code' => '55581'],
        ];

        foreach ($addresses as $address) {
            $user = User::where('email', $address['email'])->first();
            if (!$user) {
                continue;
            }
            unset($address['email']);
            Address::updateOrCreate(
                ['user_id' => $user->id, 'recipient_name' => $address['recipient_name']],
                array_merge($address, ['is_default' => true])
            );
        }
    }

    private function seedOrders(): void
    {
        $seedOrderIds = Order::where('order_number', 'like', 'PO-SEED-%')->pluck('id');
        if ($seedOrderIds->isNotEmpty()) {
            $invoiceIds = Invoice::whereIn('order_id', $seedOrderIds)->pluck('id');
            Payment::whereIn('invoice_id', $invoiceIds)->delete();
            Installment::whereIn('invoice_id', $invoiceIds)->delete();
            OrderStatusHistory::whereIn('order_id', $seedOrderIds)->delete();
            Invoice::whereIn('order_id', $seedOrderIds)->delete();
            OrderItem::whereIn('order_id', $seedOrderIds)->delete();
            Order::whereIn('id', $seedOrderIds)->delete();
        }

        $financeId = User::where('email', 'finance@afatharshop.com')->value('id');
        $marketingId = User::where('email', 'marketing@afatharshop.com')->value('id');
        $now = Carbon::now();

        $orders = [
            [
                'number' => 'PO-SEED-1001', 'email' => 'budi.santoso@gmail.com', 'status' => 'DP Terbayar (Validasi Selesai)',
                'payment_state' => 'dp_paid', 'days_ago' => 18, 'shipping' => 45000, 'courier' => 'JNE Reguler / Trucking JTR',
                'items' => [['sku' => 'SFY-MOM-L-NOIR', 'qty' => 2]],
                'notes' => 'Kirim setelah konfirmasi ukuran.',
            ],
            [
                'number' => 'PO-SEED-1002', 'email' => 'siti.rahma@gmail.com', 'status' => 'Menunggu Pembayaran DP',
                'payment_state' => 'dp_pending', 'days_ago' => 2, 'shipping' => 60000, 'courier' => 'J&T Express & Kargo',
                'items' => [['sku' => 'GRN-ARM-M', 'qty' => 4]],
                'notes' => 'Mohon dikirim setelah tanggal 5.',
            ],
            [
                'number' => 'PO-SEED-1003', 'email' => 'dewi.lestari@gmail.com', 'status' => 'DP Terbayar (Validasi Selesai)',
                'payment_state' => 'dp_paid', 'days_ago' => 10, 'shipping' => 85000, 'courier' => 'J&T Express & Kargo',
                'items' => [['sku' => 'NAR-MOM-L', 'qty' => 3]],
                'notes' => '',
            ],
            [
                'number' => 'PO-SEED-1004', 'email' => 'afatharshop@maknahijab.com', 'status' => 'Lunas (Siap Kirim)',
                'payment_state' => 'full_paid', 'days_ago' => 15, 'shipping' => 185000, 'courier' => 'JNE Reguler / Trucking JTR',
                'items' => [['sku' => 'SFY-DAD-XL-NOIR', 'qty' => 5]],
                'notes' => 'Koli besar, ambil di gudang.',
            ],
            [
                'number' => 'PO-SEED-1005', 'email' => 'budi.santoso@gmail.com', 'status' => 'Dikirim',
                'payment_state' => 'full_paid', 'days_ago' => 24, 'shipping' => 60000, 'courier' => 'JNE Reguler / Trucking JTR',
                'items' => [['sku' => 'KHM-A-BLK', 'qty' => 6]],
                'notes' => '', 'tracking' => 'JTR-8891234',
            ],
            [
                'number' => 'PO-SEED-1006', 'email' => 'siti.rahma@gmail.com', 'status' => 'Selesai',
                'payment_state' => 'full_paid', 'days_ago' => 35, 'shipping' => 45000, 'courier' => 'SiCepat Cargo (GOKIL)',
                'items' => [['sku' => 'MKN-TRV-GRN', 'qty' => 4]],
                'notes' => '', 'tracking' => 'DKT-77120',
            ],
            [
                'number' => 'PO-SEED-1007', 'email' => 'rina.kartika@gmail.com', 'status' => 'Menunggu Pembayaran DP',
                'payment_state' => 'unpaid', 'days_ago' => 1, 'shipping' => 50000, 'courier' => 'SiCepat Cargo (GOKIL)',
                'items' => [['sku' => 'ARN-MOM-L-NOIR', 'qty' => 2]],
                'notes' => 'Menunggu konfirmasi DP.',
            ],
            [
                'number' => 'PO-SEED-1008', 'email' => 'afatharshop@maknahijab.com', 'status' => 'DP Terbayar (Validasi Selesai)',
                'payment_state' => 'dp_paid', 'days_ago' => 6, 'shipping' => 0, 'courier' => 'Ambil Sendiri di Gudang Pusat',
                'items' => [['sku' => 'GRN-DAD-XL', 'qty' => 1]],
                'notes' => 'Ambil sendiri di gudang Bogor.',
            ],
            [
                'number' => 'PO-SEED-1009', 'email' => 'budi.santoso@gmail.com', 'status' => 'Batal',
                'payment_state' => 'rejected', 'days_ago' => 3, 'shipping' => 45000, 'courier' => 'J&T Express & Kargo',
                'items' => [['sku' => 'TNK-ALM-CHO', 'qty' => 2]],
                'notes' => 'Dibatalkan karena kuota varian habis.',
            ],
            [
                'number' => 'PO-SEED-1010', 'email' => 'dewi.lestari@gmail.com', 'status' => 'Dikirim',
                'payment_state' => 'full_paid', 'days_ago' => 12, 'shipping' => 120000, 'courier' => 'J&T Express & Kargo',
                'items' => [['sku' => 'KID-HSN-2T', 'qty' => 10]],
                'notes' => '', 'tracking' => 'JTC-55201',
            ],
        ];

        $proof = 'https://placehold.co/600x800/png?text=Bukti+Transfer+Afathar';

        foreach ($orders as $index => $config) {
            $user = User::where('email', $config['email'])->first();
            if (!$user) {
                continue;
            }

            $orderedAt = $now->copy()->subDays($config['days_ago'])->setTime(10, 15);
            $address = Address::where('user_id', $user->id)->where('is_default', true)->first();
            $levelId = self::LEVEL_IDS[$user->level] ?? 4;

            $subtotal = 0;
            $lines = [];
            foreach ($config['items'] as $item) {
                $variant = ProductVariant::where('sku', $item['sku'])->first();
                if (!$variant) {
                    continue;
                }
                $price = ProductPrice::where('product_id', $variant->product_id)
                    ->where('level_id', $levelId)
                    ->first();
                $unitPrice = (float) ($price->price ?? 150000);
                $fee = (float) ($price->fee ?? 0);
                $lineSubtotal = $unitPrice * $item['qty'];
                $subtotal += $lineSubtotal;
                $lines[] = [
                    'variant' => $variant,
                    'quantity' => $item['qty'],
                    'unit_price' => $unitPrice,
                    'fee' => $fee,
                    'subtotal' => $lineSubtotal,
                ];
            }

            if (!$lines) {
                continue;
            }

            $total = $subtotal + $config['shipping'];

            $order = Order::create([
                'user_id' => $user->id,
                'address_id' => $address?->id,
                'order_number' => $config['number'],
                'status' => $config['status'],
                'courier_name' => $config['courier'],
                'tracking_number' => $config['tracking'] ?? null,
                'notes' => $config['notes'],
                'is_split_address' => false,
                'subtotal' => $subtotal,
                'shipping_cost' => $config['shipping'],
                'total_amount' => $total,
                'ordered_at' => $orderedAt,
            ]);

            foreach ($lines as $line) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'address_id' => $address?->id,
                    'product_variant_id' => $line['variant']->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'fee' => $line['fee'],
                    'subtotal' => $line['subtotal'],
                    'created_at' => $orderedAt,
                ]);
            }

            $invoice = Invoice::create([
                'order_id' => $order->id,
                'invoice_number' => 'INV/2026/SEED/' . str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'total_amount' => $total,
                'paid_amount' => 0,
                'outstanding_amount' => $total,
                'status' => 'belum_lunas',
                'due_at' => $orderedAt->copy()->addDays(3),
            ]);

            $dpAmount = (int) round($total * 0.25);
            $midAmount = (int) round($total * 0.50);
            $finalAmount = $total - $dpAmount - $midAmount;

            $installments = [];
            $plan = [
                ['type' => 'dp', 'sequence_number' => 1, 'amount' => $dpAmount, 'due_at' => $orderedAt->copy()->addDays(3)],
                ['type' => 'cicilan', 'sequence_number' => 2, 'amount' => $midAmount, 'due_at' => $orderedAt->copy()->addDays(30)],
                ['type' => 'pelunasan', 'sequence_number' => 3, 'amount' => $finalAmount, 'due_at' => $orderedAt->copy()->addDays(60)],
            ];

            foreach ($plan as $step) {
                $installments[$step['type']] = Installment::create([
                    'invoice_id' => $invoice->id,
                    'type' => $step['type'],
                    'sequence_number' => $step['sequence_number'],
                    'amount' => $step['amount'],
                    'paid_amount' => 0,
                    'status' => 'belum_bayar',
                    'due_at' => $step['due_at'],
                ]);
            }

            $paidTotal = 0;

            if ($config['payment_state'] === 'dp_paid') {
                $dp = $installments['dp'];
                $dp->update(['paid_amount' => $dp->amount, 'status' => 'lunas']);
                Payment::create([
                    'invoice_id' => $invoice->id,
                    'installment_id' => $dp->id,
                    'verified_by' => $financeId,
                    'amount' => $dp->amount,
                    'proof_url' => $proof,
                    'status' => 'disetujui',
                    'uploaded_at' => $orderedAt->copy()->addDay(),
                    'verified_at' => $orderedAt->copy()->addDays(2),
                ]);
                $paidTotal = (float) $dp->amount;
            }

            if ($config['payment_state'] === 'full_paid') {
                foreach ($installments as $installment) {
                    $installment->update(['paid_amount' => $installment->amount, 'status' => 'lunas']);
                    Payment::create([
                        'invoice_id' => $invoice->id,
                        'installment_id' => $installment->id,
                        'verified_by' => $financeId,
                        'amount' => $installment->amount,
                        'proof_url' => $proof,
                        'status' => 'disetujui',
                        'uploaded_at' => $orderedAt->copy()->addDays(2),
                        'verified_at' => $orderedAt->copy()->addDays(3),
                    ]);
                    $paidTotal += (float) $installment->amount;
                }
            }

            if ($config['payment_state'] === 'dp_pending') {
                $dp = $installments['dp'];
                $dp->update(['status' => 'menunggu_verifikasi']);
                Payment::create([
                    'invoice_id' => $invoice->id,
                    'installment_id' => $dp->id,
                    'verified_by' => null,
                    'amount' => $dp->amount,
                    'proof_url' => $proof,
                    'status' => 'menunggu_verifikasi',
                    'uploaded_at' => $orderedAt->copy()->addHours(6),
                    'verified_at' => null,
                ]);
            }

            if ($config['payment_state'] === 'rejected') {
                $dp = $installments['dp'];
                Payment::create([
                    'invoice_id' => $invoice->id,
                    'installment_id' => $dp->id,
                    'verified_by' => $financeId,
                    'amount' => $dp->amount,
                    'proof_url' => $proof,
                    'status' => 'ditolak',
                    'rejection_reason' => 'Nominal transfer tidak sesuai tagihan DP.',
                    'uploaded_at' => $orderedAt->copy()->addHours(8),
                    'verified_at' => $orderedAt->copy()->addDay(),
                ]);
            }

            $invoice->update([
                'paid_amount' => $paidTotal,
                'outstanding_amount' => max(0, $total - $paidTotal),
                'status' => $paidTotal >= $total ? 'lunas' : ($paidTotal > 0 ? 'dp_terbayar' : 'belum_lunas'),
            ]);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'Open',
                'note' => 'Pesanan dibuat oleh mitra.',
                'changed_by' => $user->id,
                'created_at' => $orderedAt,
            ]);

            if (in_array($config['payment_state'], ['dp_paid', 'full_paid'], true)) {
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => 'Produksi',
                    'note' => 'DP terverifikasi, pesanan masuk antrean produksi.',
                    'changed_by' => $financeId,
                    'created_at' => $orderedAt->copy()->addDays(2),
                ]);
            }

            if ($config['payment_state'] === 'full_paid') {
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => 'Pengisian Alamat',
                    'note' => 'Pembayaran lunas, menunggu pengisian alamat kirim.',
                    'changed_by' => $marketingId,
                    'created_at' => $orderedAt->copy()->addDays(4),
                ]);
            }

            if (in_array($config['status'], ['Dikirim', 'Selesai'], true)) {
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => 'Update Resi',
                    'note' => 'Resi ' . ($config['tracking'] ?? '-') . ' diinput.',
                    'changed_by' => $marketingId,
                    'created_at' => $orderedAt->copy()->addDays(6),
                ]);
            }

            if ($config['status'] === 'Selesai') {
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => 'Terkirim',
                    'note' => 'Paket diterima mitra.',
                    'changed_by' => $marketingId,
                    'created_at' => $orderedAt->copy()->addDays(9),
                ]);
            }
        }
    }

    private function seedDeposits(): void
    {
        DepositTransaction::where('reference_type', 'seed')->delete();

        $financeId = User::where('email', 'finance@afatharshop.com')->value('id');
        $now = Carbon::now();

        $deposits = [
            ['email' => 'afatharshop@maknahijab.com', 'bank_account_id' => 1, 'amount' => 1500000, 'balance_before' => 0, 'balance_after' => 1500000, 'status' => 'disetujui', 'proof_url' => 'https://placehold.co/600x800/png?text=Deposit+HENI', 'description' => 'Top up saldo deposit HENI', 'days_ago' => 12],
            ['email' => 'siti.rahma@gmail.com', 'bank_account_id' => 2, 'amount' => 500000, 'balance_before' => 0, 'balance_after' => 500000, 'status' => 'disetujui', 'proof_url' => 'https://placehold.co/600x800/png?text=Deposit+Siti', 'description' => 'Top up saldo deposit Siti Rahma', 'days_ago' => 4],
            ['email' => 'dewi.lestari@gmail.com', 'bank_account_id' => 4, 'amount' => 250000, 'balance_before' => 0, 'balance_after' => 250000, 'status' => 'disetujui', 'proof_url' => 'https://placehold.co/600x800/png?text=Deposit+Dewi', 'description' => 'Top up saldo deposit Dewi Lestari', 'days_ago' => 6],
            ['email' => 'budi.santoso@gmail.com', 'bank_account_id' => 1, 'amount' => 1000000, 'balance_before' => 0, 'balance_after' => 0, 'status' => 'menunggu_verifikasi', 'proof_url' => 'https://placehold.co/600x800/png?text=Deposit+Budi', 'description' => 'Deposit untuk PO berikutnya', 'days_ago' => 1],
        ];

        foreach ($deposits as $deposit) {
            $user = User::where('email', $deposit['email'])->first();
            if (!$user) {
                continue;
            }

            $createdAt = $now->copy()->subDays($deposit['days_ago']);
            DepositTransaction::create([
                'user_id' => $user->id,
                'bank_account_id' => $deposit['bank_account_id'],
                'type' => 'topup',
                'amount' => $deposit['amount'],
                'proof_url' => $deposit['proof_url'],
                'status' => $deposit['status'],
                'verified_by' => $deposit['status'] === 'disetujui' ? $financeId : null,
                'verified_at' => $deposit['status'] === 'disetujui' ? $createdAt->copy()->addHours(3) : null,
                'balance_before' => $deposit['balance_before'],
                'balance_after' => $deposit['balance_after'],
                'reference_type' => 'seed',
                'reference_id' => $user->id,
                'description' => $deposit['description'],
                'created_at' => $createdAt,
            ]);
        }
    }

    private function seedPaymentRequests(): void
    {
        PaymentRequest::where('code', 'like', 'PR-SEED-%')->delete();

        $financeId = User::where('email', 'finance@afatharshop.com')->value('id');
        $now = Carbon::now();

        $requests = [
            [
                'code' => 'PR-SEED-0001', 'bank_account_id' => 1, 'amount' => 1250000,
                'purpose' => 'DP produksi supplier Hana Textile', 'reference' => 'PO-Safiyya Premium Abaya Set',
                'note' => 'Pembayaran DP 40% produksi 120 pcs Safiyya Premium Abaya Set.',
                'status' => 'Menunggu Review Purchasing', 'days_ago' => 1,
            ],
            [
                'code' => 'PR-SEED-0002', 'bank_account_id' => 1, 'amount' => 3500000,
                'purpose' => 'Pelunasan produksi supplier Bandung Garment', 'reference' => 'PO-Nararya Sarimbit Kartika Raya',
                'note' => 'Pelunasan setelah QC lolos.', 'status' => 'Menunggu Approval Owner', 'days_ago' => 2,
                'marketing' => ['by' => 'RINA MARKETING', 'note' => 'Dokumen dan nota supplier sesuai.', 'decision' => 'ACC'],
            ],
            [
                'code' => 'PR-SEED-0003', 'bank_account_id' => 2, 'amount' => 2100000,
                'purpose' => 'Ongkos kirim massal & packing', 'reference' => 'Batch November 2026',
                'note' => 'Ongkir 42 koli + perlengkapan packing.', 'status' => 'Disetujui Owner', 'days_ago' => 4,
                'marketing' => ['by' => 'Lia Marketing', 'note' => 'Sudah dicek dengan rekap ekspedisi.', 'decision' => 'ACC'],
                'owner' => ['by' => 'FATURAHMAN OWNER', 'note' => 'Disetujui, mohon segera ditransfer.', 'decision' => 'ACC'],
            ],
            [
                'code' => 'PR-SEED-0004', 'bank_account_id' => 3, 'amount' => 4250000,
                'purpose' => 'Pembayaran hijab premium Coverme', 'reference' => 'PO-Greenism Senada',
                'note' => 'Termin 2 dari 3.', 'status' => 'Ditransfer', 'days_ago' => 8,
                'marketing' => ['by' => 'RINA MARKETING', 'note' => 'OK.', 'decision' => 'ACC'],
                'owner' => ['by' => 'FATURAHMAN OWNER', 'note' => 'Setuju.', 'decision' => 'ACC'],
                'transfer' => ['by' => 'FATURAHMAN OWNER', 'note' => 'Transfer via BSI mobile.', 'proof' => 'https://placehold.co/600x800/png?text=Bukti+Transfer+PR-0004'],
            ],
            [
                'code' => 'PR-SEED-0005', 'bank_account_id' => 1, 'amount' => 980000,
                'purpose' => 'Pembelian bahan tambahan', 'reference' => '-',
                'note' => 'Supplier baru.', 'status' => 'Ditolak', 'days_ago' => 3,
                'marketing' => ['by' => 'Lia Marketing', 'note' => 'Rekening tujuan belum terdaftar sebagai vendor resmi.', 'decision' => 'TOLAK'],
            ],
        ];

        foreach ($requests as $request) {
            $createdAt = $now->copy()->subDays($request['days_ago']);
            PaymentRequest::create([
                'code' => $request['code'],
                'created_by' => $financeId,
                'bank_account_id' => $request['bank_account_id'],
                'amount' => $request['amount'],
                'purpose' => $request['purpose'],
                'reference' => $request['reference'],
                'note' => $request['note'],
                'status' => $request['status'],
                'marketing_by' => $request['marketing']['by'] ?? null,
                'marketing_at' => isset($request['marketing']) ? $createdAt->copy()->addHours(4) : null,
                'marketing_note' => $request['marketing']['note'] ?? null,
                'marketing_decision' => $request['marketing']['decision'] ?? null,
                'owner_by' => $request['owner']['by'] ?? null,
                'owner_at' => isset($request['owner']) ? $createdAt->copy()->addDay() : null,
                'owner_note' => $request['owner']['note'] ?? null,
                'owner_decision' => $request['owner']['decision'] ?? null,
                'transfer_by' => $request['transfer']['by'] ?? null,
                'transfer_at' => isset($request['transfer']) ? $createdAt->copy()->addDays(2) : null,
                'transfer_note' => $request['transfer']['note'] ?? null,
                'transfer_proof' => $request['transfer']['proof'] ?? null,
                'created_at' => $createdAt,
            ]);
        }
    }

    private function seedNotifications(): void
    {
        Notification::where('type', 'like', 'seed_%')->delete();

        $now = Carbon::now();
        $heni = User::where('email', 'afatharshop@maknahijab.com')->first();
        $budi = User::where('email', 'budi.santoso@gmail.com')->first();
        $finance = User::where('email', 'finance@afatharshop.com')->first();
        $marketing = User::where('email', 'marketing@afatharshop.com')->first();

        $rows = [
            ['user' => $heni, 'title' => 'DP Pesanan Terverifikasi', 'message' => 'DP pesanan PO-SEED-1004 telah diverifikasi Admin Finance. Pesanan masuk antrean produksi.', 'type' => 'seed_payment', 'is_read' => false, 'hours_ago' => 2],
            ['user' => $heni, 'title' => 'Katalog Pre-Order Dibuka', 'message' => 'Batch 1 Sarimbit 2027 telah dibuka. Cek koleksi terbaru di katalog.', 'type' => 'seed_catalog', 'is_read' => false, 'hours_ago' => 5],
            ['user' => $heni, 'title' => 'Pesanan Sedang Dikirim', 'message' => 'Pesanan PO-SEED-1008 siap diambil di gudang Bogor.', 'type' => 'seed_shipment', 'is_read' => true, 'hours_ago' => 26],
            ['user' => $budi, 'title' => 'Pesanan Berhasil Dibuat', 'message' => 'Pesanan PO-SEED-1001 tersimpan. Silakan unggah bukti pembayaran DP.', 'type' => 'seed_order', 'is_read' => true, 'hours_ago' => 30],
            ['user' => $finance, 'title' => 'Bukti DP Menunggu Verifikasi', 'message' => 'Pesanan PO-SEED-1002 mengunggah bukti pembayaran DP.', 'type' => 'seed_finance', 'is_read' => false, 'hours_ago' => 4],
            ['user' => $marketing, 'title' => 'Pesanan Baru Masuk', 'message' => 'Pesanan PO-SEED-1007 dari Rina Kartika menunggu validasi marketing.', 'type' => 'seed_marketing', 'is_read' => false, 'hours_ago' => 6],
        ];

        foreach ($rows as $row) {
            if (!$row['user']) {
                continue;
            }
            Notification::create([
                'user_id' => $row['user']->id,
                'title' => $row['title'],
                'message' => $row['message'],
                'type' => $row['type'],
                'is_read' => $row['is_read'],
                'read_at' => $row['is_read'] ? $now->copy()->subHours($row['hours_ago'] - 1) : null,
                'created_at' => $now->copy()->subHours($row['hours_ago']),
            ]);
        }
    }

    private function seedActivityLog(): void
    {
        // Bersihkan log lama dari seeder sebelumnya yang mereferensikan invoice fiktif.
        ActivityLog::where('description', 'like', '%INV/2026/X/089%')
            ->orWhere('description', 'like', '%Mengatur perpanjangan jadwal tutup PO Coverme%')
            ->delete();

        $finance = User::where('email', 'finance@afatharshop.com')->first();
        $marketing = User::where('email', 'marketing@afatharshop.com')->first();
        $owner = User::where('email', 'owner@afatharshop.com')->first();

        $logs = [
            ['user' => $finance, 'action' => 'Verifikasi Pembayaran DP', 'module' => 'Keuangan', 'description' => 'Menyetujui pembayaran DP Invoice INV/2026/SEED/0001 untuk pesanan PO-SEED-1001.'],
            ['user' => $marketing, 'action' => 'Update Jadwal Batch PO', 'module' => 'PO & Katalog', 'description' => 'Memperpanjang jadwal tutup PO Batch 1 - Seri Sarimbit 2027 hingga 15 November 2026.'],
            ['user' => $finance, 'action' => 'Membuat Pengajuan Pembayaran', 'module' => 'Keuangan', 'description' => 'Membuat pengajuan PR-SEED-0001 untuk DP produksi Hana Textile.'],
            ['user' => $marketing, 'action' => 'Review Pengajuan Pembayaran', 'module' => 'Keuangan', 'description' => 'Mereview pengajuan PR-SEED-0002 dan meneruskan ke Owner.'],
            ['user' => $owner, 'action' => 'Approval Pengajuan Pembayaran', 'module' => 'Keuangan', 'description' => 'Menyetujui pengajuan PR-SEED-0003 untuk ongkos kirim massal.'],
            ['user' => $marketing, 'action' => 'Validasi Pesanan Mitra', 'module' => 'Pesanan', 'description' => 'Memvalidasi pesanan PO-SEED-1003 milik Dewi Lestari.'],
        ];

        foreach ($logs as $log) {
            if (!$log['user']) {
                continue;
            }
            ActivityLog::updateOrCreate(
                ['user_id' => $log['user']->id, 'description' => $log['description']],
                ['action' => $log['action'], 'module' => $log['module'], 'ip_address' => '127.0.0.1']
            );
        }
    }

    private function seedSettings(): void
    {
        $settings = [
            'shopName' => 'Afathar Shop',
            'senderName' => 'Owner Afathar Shop',
            'dpPct' => '25',
            'pelunasanDueDays' => '30',
            'ongkirDueDays' => '3',
            'waFooter' => 'Transfer hanya ke rekening resmi Afathar Shop.',
            'instagram' => '@afatharshop',
        ];

        foreach ($settings as $key => $value) {
            AppSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
