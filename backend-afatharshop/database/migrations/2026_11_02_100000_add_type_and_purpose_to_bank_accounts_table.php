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
                if (!Schema::hasColumn('bank_accounts', 'type')) {
                    $table->string('type', 30)->default('public')->after('account_holder');
                }
                if (!Schema::hasColumn('bank_accounts', 'purpose')) {
                    $table->string('purpose', 150)->nullable()->after('type');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('bank_accounts')) {
            Schema::table('bank_accounts', function (Blueprint $table) {
                if (Schema::hasColumn('bank_accounts', 'purpose')) {
                    $table->dropColumn('purpose');
                }
                if (Schema::hasColumn('bank_accounts', 'type')) {
                    $table->dropColumn('type');
                }
            });
        }
    }
};
