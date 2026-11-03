<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel inti PO: level, brand, produk, pesanan, invoice, dan termin.
     * Dibuat sebelum migrasi `add_missing_columns` yang menambah kolom lanjutan.
     */
    public function up(): void
    {
        if (!Schema::hasTable('levels')) {
            Schema::create('levels', function (Blueprint $table) {
                $table->id();
                $table->string('name', 50)->unique();
                $table->string('description')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('brands')) {
            Schema::create('brands', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('db_all_partner_id')->nullable();
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('brand_id')->nullable();
                $table->string('name', 150);
                $table->string('article_code', 100)->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('product_variants')) {
            Schema::create('product_variants', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('product_id');
                $table->string('model', 100)->nullable();
                $table->string('size', 20)->nullable();
                $table->string('color', 50)->nullable();
                $table->string('sku', 100)->nullable()->unique();
                $table->integer('stock')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('product_prices')) {
            Schema::create('product_prices', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('product_id');
                $table->unsignedBigInteger('level_id');
                $table->decimal('price', 15, 2)->default(0);
                $table->decimal('fee', 15, 2)->default(0);
                $table->timestamps();
                $table->unique(['product_id', 'level_id']);
            });
        }

        if (!Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('address_id')->nullable();
                $table->string('order_number', 50)->unique();
                $table->string('status', 50)->default('Menunggu Pembayaran DP');
                $table->decimal('subtotal', 15, 2)->default(0);
                $table->decimal('shipping_cost', 15, 2)->default(0);
                $table->decimal('total_amount', 15, 2)->default(0);
                $table->dateTime('ordered_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('order_items')) {
            Schema::create('order_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('product_variant_id')->nullable();
                $table->integer('quantity')->default(1);
                $table->decimal('unit_price', 15, 2)->default(0);
                $table->decimal('fee', 15, 2)->default(0);
                $table->decimal('subtotal', 15, 2)->default(0);
                $table->dateTime('created_at')->nullable();
            });
        }

        if (!Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->string('invoice_number', 50)->unique();
                $table->decimal('total_amount', 15, 2)->default(0);
                $table->decimal('paid_amount', 15, 2)->default(0);
                $table->decimal('outstanding_amount', 15, 2)->default(0);
                $table->string('status', 30)->default('belum_lunas');
                $table->dateTime('due_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('installments')) {
            Schema::create('installments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('invoice_id');
                $table->string('type', 20);
                $table->integer('sequence_number')->default(1);
                $table->decimal('amount', 15, 2)->default(0);
                $table->decimal('paid_amount', 15, 2)->default(0);
                $table->string('status', 30)->default('belum_bayar');
                $table->dateTime('due_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('deposit_transactions')) {
            Schema::create('deposit_transactions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('type', 30)->default('deposit');
                $table->decimal('amount', 15, 2)->default(0);
                $table->decimal('balance_before', 15, 2)->default(0);
                $table->decimal('balance_after', 15, 2)->default(0);
                $table->string('reference_type', 50)->nullable();
                $table->unsignedBigInteger('reference_id')->nullable();
                $table->text('description')->nullable();
                $table->dateTime('created_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('deposit_transactions');
        Schema::dropIfExists('installments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('product_prices');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('levels');
    }
};
