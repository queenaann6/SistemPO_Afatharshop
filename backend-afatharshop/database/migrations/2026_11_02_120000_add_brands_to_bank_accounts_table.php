<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('bank_accounts')) {
            Schema::table('bank_accounts', function (Blueprint $table) {
                if (!Schema::hasColumn('bank_accounts', 'brands')) {
                    $table->json('brands')->nullable()->after('purpose');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('bank_accounts')) {
            Schema::table('bank_accounts', function (Blueprint $table) {
                if (Schema::hasColumn('bank_accounts', 'brands')) {
                    $table->dropColumn('brands');
                }
            });
        }
    }
};
