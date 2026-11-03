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
        // 1. Tabel Kategori Produk
        if (!Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->string('slug', 100)->unique();
                $table->string('icon', 100)->nullable();
                $table->timestamps();
            });
        }

        // 2. Tabel Supplier (Pabrik / Vendor Konveksi)
        if (!Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->string('name', 150);
                $table->string('city', 100)->nullable();
                $table->string('phone', 30)->nullable();
                $table->string('contact_person', 100)->nullable();
                $table->timestamps();
            });
        }

        // 3. Tabel Batch PO (Timeline Buka/Tutup PO)
        if (!Schema::hasTable('po_batches')) {
            Schema::create('po_batches', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('brand_id')->nullable();
                $table->string('name', 100); // e.g. Batch 1, Batch 2
                $table->date('start_date')->nullable();
                $table->dateTime('close_date')->nullable();
                $table->date('estimated_shipment')->nullable();
                $table->enum('status', ['open', 'closed'])->default('open');
                $table->timestamps();
            });
        }

        // 4. Tabel Rekening Bank Resmi (Admin)
        if (!Schema::hasTable('bank_accounts')) {
            Schema::create('bank_accounts', function (Blueprint $table) {
                $table->id();
                $table->string('bank_name', 50); // BCA, Mandiri, BSI, BRI
                $table->string('account_number', 50);
                $table->string('account_holder', 150);
                $table->string('logo', 50)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 5. Tabel Ekspedisi / Kurir Pengiriman
        if (!Schema::hasTable('couriers')) {
            Schema::create('couriers', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100); // JNE, J&T, SiCepat, Ambil di Gudang
                $table->string('code', 50)->nullable();
                $table->string('description', 255)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 6. Tabel Keranjang Belanja Pre-Order (Carts & Cart Items)
        if (!Schema::hasTable('carts')) {
            Schema::create('carts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('cart_items')) {
            Schema::create('cart_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('cart_id');
                $table->unsignedBigInteger('product_variant_id');
                $table->integer('quantity')->default(1);
                $table->timestamps();
            });
        }

        // 7. Tabel Log Aktivitas Admin (Audit Logs)
        if (!Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('action', 100);
                $table->string('module', 50); // Keuangan, Katalog, PO, Pengguna
                $table->text('description');
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('couriers');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('po_batches');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('categories');
    }
};
