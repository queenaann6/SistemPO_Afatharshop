<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tambah kolom pada tabel `users`
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'deposit_balance')) {
                $table->decimal('deposit_balance', 15, 2)->default(0)->after('avatar');
            }
            if (!Schema::hasColumn('users', 'city')) {
                $table->string('city', 100)->nullable()->after('deposit_balance');
            }
        });

        // 2. Tambah kolom pada tabel `brands`
        Schema::table('brands', function (Blueprint $table) {
            if (!Schema::hasColumn('brands', 'supplier_id')) {
                $table->unsignedBigInteger('supplier_id')->nullable()->after('db_all_partner_id');
            }
            if (!Schema::hasColumn('brands', 'logo')) {
                $table->string('logo')->nullable()->after('name');
            }
            if (!Schema::hasColumn('brands', 'discount_db_all')) {
                $table->decimal('discount_db_all', 5, 2)->default(30.00)->after('description');
            }
            if (!Schema::hasColumn('brands', 'discount_sub_db')) {
                $table->decimal('discount_sub_db', 5, 2)->default(25.00)->after('discount_db_all');
            }
            if (!Schema::hasColumn('brands', 'discount_agen')) {
                $table->decimal('discount_agen', 5, 2)->default(20.00)->after('discount_sub_db');
            }
            if (!Schema::hasColumn('brands', 'discount_reseller')) {
                $table->decimal('discount_reseller', 5, 2)->default(15.00)->after('discount_agen');
            }
        });

        // 3. Tambah kolom pada tabel `products`
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'category_id')) {
                $table->unsignedBigInteger('category_id')->nullable()->after('brand_id');
            }
            if (!Schema::hasColumn('products', 'po_batch_id')) {
                $table->unsignedBigInteger('po_batch_id')->nullable()->after('category_id');
            }
            if (!Schema::hasColumn('products', 'image')) {
                $table->string('image')->nullable()->after('name');
            }
            if (!Schema::hasColumn('products', 'series')) {
                $table->string('series', 150)->nullable()->after('image');
            }
            if (!Schema::hasColumn('products', 'status')) {
                $table->enum('status', ['pre_order', 'closed_po', 'ready_stock'])->default('pre_order')->after('series');
            }
            if (!Schema::hasColumn('products', 'tutup_po')) {
                $table->dateTime('tutup_po')->nullable()->after('status');
            }
            if (!Schema::hasColumn('products', 'estimated_shipment')) {
                $table->date('estimated_shipment')->nullable()->after('tutup_po');
            }
            if (!Schema::hasColumn('products', 'min_dp_percent')) {
                $table->integer('min_dp_percent')->default(25)->after('estimated_shipment');
            }
            if (!Schema::hasColumn('products', 'stock_quota')) {
                $table->integer('stock_quota')->default(50)->after('min_dp_percent');
            }
            if (!Schema::hasColumn('products', 'material_detail')) {
                $table->text('material_detail')->nullable()->after('description');
            }
        });

        // 4. Tambah kolom pada tabel `orders`
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'courier_name')) {
                $table->string('courier_name', 100)->nullable()->after('status');
            }
            if (!Schema::hasColumn('orders', 'tracking_number')) {
                $table->string('tracking_number', 100)->nullable()->after('courier_name');
            }
            if (!Schema::hasColumn('orders', 'notes')) {
                $table->text('notes')->nullable()->after('tracking_number');
            }
            if (!Schema::hasColumn('orders', 'is_split_address')) {
                $table->boolean('is_split_address')->default(false)->after('notes');
            }
        });

        // 5. Tambah kolom pada tabel `order_items`
        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'address_id')) {
                $table->unsignedBigInteger('address_id')->nullable()->after('order_id');
            }
        });

        // 6. Tambah kolom pada tabel `deposit_transactions`
        Schema::table('deposit_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('deposit_transactions', 'bank_account_id')) {
                $table->unsignedBigInteger('bank_account_id')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('deposit_transactions', 'proof_url')) {
                $table->string('proof_url')->nullable()->after('amount');
            }
            if (!Schema::hasColumn('deposit_transactions', 'status')) {
                $table->enum('status', ['menunggu_verifikasi', 'disetujui', 'ditolak'])->default('menunggu_verifikasi')->after('proof_url');
            }
            if (!Schema::hasColumn('deposit_transactions', 'verified_by')) {
                $table->unsignedBigInteger('verified_by')->nullable()->after('status');
            }
            if (!Schema::hasColumn('deposit_transactions', 'verified_at')) {
                $table->dateTime('verified_at')->nullable()->after('verified_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deposit_transactions', function (Blueprint $table) {
            $table->dropColumn(['bank_account_id', 'proof_url', 'status', 'verified_by', 'verified_at']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['address_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['courier_name', 'tracking_number', 'notes', 'is_split_address']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['category_id', 'po_batch_id', 'image', 'series', 'status', 'tutup_po', 'estimated_shipment', 'min_dp_percent', 'stock_quota', 'material_detail']);
        });

        Schema::table('brands', function (Blueprint $table) {
            $table->dropColumn(['supplier_id', 'logo', 'discount_db_all', 'discount_sub_db', 'discount_agen', 'discount_reseller']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar', 'deposit_balance', 'city']);
        });
    }
};
