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
        // Ubah status pada order_status_histories menjadi VARCHAR(100) agar
        // dapat menampung seluruh alur status pesanan (Siap Kirim, Selesai, dsb).
        DB::statement("ALTER TABLE `order_status_histories` MODIFY `status` VARCHAR(100) NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `order_status_histories` MODIFY `status` ENUM('Open', 'Produksi', 'Pengisian Alamat', 'Menunggu Pengiriman', 'Update Resi', 'Terkirim') NOT NULL");
    }
};
