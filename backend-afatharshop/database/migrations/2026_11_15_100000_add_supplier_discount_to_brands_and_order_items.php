<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('brands')) {
            Schema::table('brands', function (Blueprint $table) {
                if (!Schema::hasColumn('brands', 'discount_value')) {
                    $table->decimal('discount_value', 5, 2)->default(30.00)->after('discount_reseller');
                }
                if (!Schema::hasColumn('brands', 'discount_type')) {
                    $table->string('discount_type', 10)->default('pct')->after('discount_value');
                }
                if (!Schema::hasColumn('brands', 'fee_type')) {
                    $table->string('fee_type', 10)->default('pct')->after('discount_type');
                }
            });
        }

        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                if (!Schema::hasColumn('order_items', 'brand_discount_nominal')) {
                    $table->decimal('brand_discount_nominal', 15, 2)->default(0)->after('discount_nominal');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('brands')) {
            Schema::table('brands', function (Blueprint $table) {
                $drop = array_filter(
                    ['discount_value', 'discount_type', 'fee_type'],
                    fn ($column) => Schema::hasColumn('brands', $column)
                );
                if ($drop) {
                    $table->dropColumn($drop);
                }
            });
        }

        if (Schema::hasTable('order_items') && Schema::hasColumn('order_items', 'brand_discount_nominal')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('brand_discount_nominal');
            });
        }
    }
};
