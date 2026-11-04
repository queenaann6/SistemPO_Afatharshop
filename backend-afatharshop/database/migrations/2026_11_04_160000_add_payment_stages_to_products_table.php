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
            if (!Schema::hasColumn('products', 'payment_stages')) {
                $table->text('payment_stages')->nullable()->after('min_dp_percent');
            }
            if (!Schema::hasColumn('products', 'termin_count')) {
                $table->integer('termin_count')->default(2)->after('payment_stages');
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
            if (Schema::hasColumn('products', 'payment_stages')) {
                $drop[] = 'payment_stages';
            }
            if (Schema::hasColumn('products', 'termin_count')) {
                $drop[] = 'termin_count';
            }
            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
