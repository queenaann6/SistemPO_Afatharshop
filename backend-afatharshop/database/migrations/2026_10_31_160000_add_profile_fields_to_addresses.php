<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('addresses')) {
            return;
        }

        $columns = [
            'label'       => fn (Blueprint $table) => $table->string('label', 50)->nullable(),
            'email'       => fn (Blueprint $table) => $table->string('email', 100)->nullable(),
            'subdistrict' => fn (Blueprint $table) => $table->string('subdistrict', 100)->nullable(),
            'district'    => fn (Blueprint $table) => $table->string('district', 100)->nullable(),
        ];

        foreach ($columns as $name => $definition) {
            if (!Schema::hasColumn('addresses', $name)) {
                Schema::table('addresses', function (Blueprint $table) use ($definition) {
                    $definition($table);
                });
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('addresses')) {
            return;
        }

        foreach (['label', 'email', 'subdistrict', 'district'] as $column) {
            if (Schema::hasColumn('addresses', $column)) {
                Schema::table('addresses', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
