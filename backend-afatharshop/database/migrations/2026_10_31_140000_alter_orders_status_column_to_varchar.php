<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ubah kolom status pada tabel orders dari ENUM menjadi VARCHAR(100)
        // agar mendukung semua status PO seperti 'Menunggu Pembayaran DP', 'Pesanan Dibuat', dsb.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `orders` MODIFY `status` VARCHAR(100) NOT NULL DEFAULT 'Menunggu Pembayaran DP'");
        } elseif (Schema::hasTable('orders') && Schema::hasColumn('orders', 'status')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('status', 100)->default('Menunggu Pembayaran DP')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `orders` MODIFY `status` ENUM('Open','Produksi','Pengisian Alamat','Menunggu Pengiriman','Update Resi','Terkirim') NOT NULL DEFAULT 'Open'");
        }
    }
};
