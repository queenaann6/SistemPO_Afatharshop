<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Bersihkan orphan data yang ada sebelum memasang foreign key constraints
        DB::statement("DELETE FROM product_prices WHERE product_id NOT IN (SELECT id FROM products)");
        DB::statement("UPDATE activity_logs SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)");
        DB::statement("UPDATE orders SET address_id = NULL WHERE address_id IS NOT NULL AND address_id NOT IN (SELECT id FROM addresses)");
        DB::statement("UPDATE order_items SET product_variant_id = NULL WHERE product_variant_id IS NOT NULL AND product_variant_id NOT IN (SELECT id FROM product_variants)");
        DB::statement("UPDATE order_items SET address_id = NULL WHERE address_id IS NOT NULL AND address_id NOT IN (SELECT id FROM addresses)");
        DB::statement("UPDATE products SET brand_id = NULL WHERE brand_id IS NOT NULL AND brand_id NOT IN (SELECT id FROM brands)");
        DB::statement("UPDATE products SET category_id = NULL WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories)");
        DB::statement("UPDATE products SET po_batch_id = NULL WHERE po_batch_id IS NOT NULL AND po_batch_id NOT IN (SELECT id FROM po_batches)");
        DB::statement("UPDATE brands SET supplier_id = NULL WHERE supplier_id IS NOT NULL AND supplier_id NOT IN (SELECT id FROM suppliers)");
        DB::statement("UPDATE po_batches SET brand_id = NULL WHERE brand_id IS NOT NULL AND brand_id NOT IN (SELECT id FROM brands)");
        DB::statement("UPDATE deposit_transactions SET bank_account_id = NULL WHERE bank_account_id IS NOT NULL AND bank_account_id NOT IN (SELECT id FROM bank_accounts)");
        DB::statement("UPDATE deposit_transactions SET verified_by = NULL WHERE verified_by IS NOT NULL AND verified_by NOT IN (SELECT id FROM users)");

        // 2. Pasang Foreign Key Constraints pada relasi inti

        // Relasi Transaksi: orders, order_items, invoices, installments
        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('address_id')->references('id')->on('addresses')->nullOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->nullOnDelete();
            $table->foreign('address_id')->references('id')->on('addresses')->nullOnDelete();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::table('installments', function (Blueprint $table) {
            $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
        });

        // Relasi Katalog & Produk: brands, po_batches, products, product_variants, product_prices
        Schema::table('brands', function (Blueprint $table) {
            $table->foreign('supplier_id')->references('id')->on('suppliers')->nullOnDelete();
        });

        Schema::table('po_batches', function (Blueprint $table) {
            $table->foreign('brand_id')->references('id')->on('brands')->nullOnDelete();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreign('brand_id')->references('id')->on('brands')->nullOnDelete();
            $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
            $table->foreign('po_batch_id')->references('id')->on('po_batches')->nullOnDelete();
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::table('product_prices', function (Blueprint $table) {
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('level_id')->references('id')->on('levels')->cascadeOnDelete();
        });

        // Relasi Saldo & Deposit: deposit_transactions
        Schema::table('deposit_transactions', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->nullOnDelete();
            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
        });

        // Relasi Keranjang Belanja: carts, cart_items
        Schema::table('carts', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('cart_items', function (Blueprint $table) {
            $table->foreign('cart_id')->references('id')->on('carts')->cascadeOnDelete();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->cascadeOnDelete();
        });

        // Relasi Audit Log: activity_logs
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropForeign(['cart_id']);
            $table->dropForeign(['product_variant_id']);
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('deposit_transactions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['bank_account_id']);
            $table->dropForeign(['verified_by']);
        });

        Schema::table('product_prices', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropForeign(['level_id']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);
            $table->dropForeign(['category_id']);
            $table->dropForeign(['po_batch_id']);
        });

        Schema::table('po_batches', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);
        });

        Schema::table('brands', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });

        Schema::table('installments', function (Blueprint $table) {
            $table->dropForeign(['invoice_id']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropForeign(['product_variant_id']);
            $table->dropForeign(['address_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['address_id']);
        });
    }
};
