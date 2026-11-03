<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Status invoice bertambah seiring integrasi termin (DP terbayar, lunas, dsb).
     */
    public function up(): void
    {
        if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'status')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->string('status', 30)->default('belum_lunas')->change();
            });
        }
    }

    public function down(): void
    {
        // Tidak dikembalikan ke ENUM agar data status yang lebih kaya tidak terpotong.
    }
};
