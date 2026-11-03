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
        Schema::table('product_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variants', 'price')) {
                $table->decimal('price', 15, 2)->nullable()->after('stock');
            }
            if (!Schema::hasColumn('product_variants', 'addon')) {
                $table->decimal('addon', 15, 2)->default(0)->after('price');
            }
            if (!Schema::hasColumn('product_variants', 'hpp')) {
                $table->decimal('hpp', 15, 2)->nullable()->after('addon');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('product_variants', 'hpp')) $cols[] = 'hpp';
            if (Schema::hasColumn('product_variants', 'addon')) $cols[] = 'addon';
            if (Schema::hasColumn('product_variants', 'price')) $cols[] = 'price';
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
