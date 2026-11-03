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
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_sale')) {
                $table->boolean('is_sale')->default(false)->after('status');
            }
            if (!Schema::hasColumn('products', 'discount_percent')) {
                $table->integer('discount_percent')->default(0)->after('is_sale');
            }
            if (!Schema::hasColumn('products', 'original_price')) {
                $table->decimal('original_price', 15, 2)->nullable()->after('discount_percent');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $drop = [];
            if (Schema::hasColumn('products', 'is_sale')) {
                $drop[] = 'is_sale';
            }
            if (Schema::hasColumn('products', 'discount_percent')) {
                $drop[] = 'discount_percent';
            }
            if (Schema::hasColumn('products', 'original_price')) {
                $drop[] = 'original_price';
            }
            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
