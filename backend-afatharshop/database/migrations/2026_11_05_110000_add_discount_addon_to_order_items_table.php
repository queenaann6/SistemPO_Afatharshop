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
        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'discount_nominal')) {
                $table->decimal('discount_nominal', 15, 2)->default(0)->after('fee');
            }
            if (!Schema::hasColumn('order_items', 'addon_nominal')) {
                $table->decimal('addon_nominal', 15, 2)->default(0)->after('discount_nominal');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $drop = array_filter(
                ['discount_nominal', 'addon_nominal'],
                fn ($column) => Schema::hasColumn('order_items', $column)
            );
            if ($drop) {
                $table->dropColumn($drop);
            }
        });
    }
};
