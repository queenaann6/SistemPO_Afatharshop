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
                if (Schema::hasColumn('brands', 'discount_db_all')) {
                    $table->decimal('discount_db_all', 15, 2)->default(30.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_sub_db')) {
                    $table->decimal('discount_sub_db', 15, 2)->default(25.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_agen')) {
                    $table->decimal('discount_agen', 15, 2)->default(20.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_reseller')) {
                    $table->decimal('discount_reseller', 15, 2)->default(15.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_value')) {
                    $table->decimal('discount_value', 15, 2)->default(30.00)->change();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('brands')) {
            Schema::table('brands', function (Blueprint $table) {
                if (Schema::hasColumn('brands', 'discount_db_all')) {
                    $table->decimal('discount_db_all', 5, 2)->default(30.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_sub_db')) {
                    $table->decimal('discount_sub_db', 5, 2)->default(25.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_agen')) {
                    $table->decimal('discount_agen', 5, 2)->default(20.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_reseller')) {
                    $table->decimal('discount_reseller', 5, 2)->default(15.00)->change();
                }
                if (Schema::hasColumn('brands', 'discount_value')) {
                    $table->decimal('discount_value', 5, 2)->default(30.00)->change();
                }
            });
        }
    }
};
