<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'image5')) {
                $table->string('image5', 500)->nullable()->after('image4');
            }
            if (!Schema::hasColumn('products', 'image6')) {
                $table->string('image6', 500)->nullable()->after('image5');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['image5', 'image6']);
        });
    }
};
