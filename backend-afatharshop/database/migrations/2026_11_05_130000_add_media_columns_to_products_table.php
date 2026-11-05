<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'image2')) {
                $table->string('image2')->nullable()->after('image');
            }
            if (!Schema::hasColumn('products', 'image3')) {
                $table->string('image3')->nullable()->after('image2');
            }
            if (!Schema::hasColumn('products', 'image4')) {
                $table->string('image4')->nullable()->after('image3');
            }
            if (!Schema::hasColumn('products', 'reel_url')) {
                $table->string('reel_url')->nullable()->after('image4');
            }
            if (!Schema::hasColumn('products', 'thumbnails')) {
                $table->json('thumbnails')->nullable()->after('reel_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['image2', 'image3', 'image4', 'reel_url', 'thumbnails']);
        });
    }
};
