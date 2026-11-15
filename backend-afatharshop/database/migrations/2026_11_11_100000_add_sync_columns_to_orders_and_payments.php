<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'marketing_status')) {
                    $table->string('marketing_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('orders', 'marketing_by')) {
                    $table->string('marketing_by', 100)->nullable()->after('marketing_status');
                }
                if (!Schema::hasColumn('orders', 'marketing_at')) {
                    $table->dateTime('marketing_at')->nullable()->after('marketing_by');
                }
                if (!Schema::hasColumn('orders', 'marketing_note')) {
                    $table->text('marketing_note')->nullable()->after('marketing_at');
                }
                if (!Schema::hasColumn('orders', 'ready_at')) {
                    $table->dateTime('ready_at')->nullable()->after('production_status');
                }
                if (!Schema::hasColumn('orders', 'weight_kg')) {
                    $table->decimal('weight_kg', 10, 2)->nullable()->after('shipping_cost');
                }
                if (!Schema::hasColumn('orders', 'shipping_note')) {
                    $table->text('shipping_note')->nullable()->after('weight_kg');
                }
                if (!Schema::hasColumn('orders', 'ongkir_at')) {
                    $table->dateTime('ongkir_at')->nullable()->after('shipping_note');
                }
                if (!Schema::hasColumn('orders', 'shipped_at')) {
                    $table->dateTime('shipped_at')->nullable()->after('tracking_number');
                }
                if (!Schema::hasColumn('orders', 'received_at')) {
                    $table->dateTime('received_at')->nullable()->after('shipped_at');
                }
                if (!Schema::hasColumn('orders', 'deleted_at')) {
                    $table->dateTime('deleted_at')->nullable();
                }
                if (!Schema::hasColumn('orders', 'deleted_by')) {
                    $table->string('deleted_by', 100)->nullable();
                }
                if (!Schema::hasColumn('orders', 'delete_reason')) {
                    $table->text('delete_reason')->nullable();
                }
            });
        }

        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if (!Schema::hasColumn('payments', 'method')) {
                    $table->string('method', 30)->nullable()->after('proof_url');
                }
                if (!Schema::hasColumn('payments', 'bank_name')) {
                    $table->string('bank_name', 100)->nullable()->after('method');
                }
                if (!Schema::hasColumn('payments', 'account_number')) {
                    $table->string('account_number', 100)->nullable()->after('bank_name');
                }
                if (!Schema::hasColumn('payments', 'note')) {
                    $table->text('note')->nullable()->after('rejection_reason');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            $cols = array_filter([
                'marketing_status',
                'marketing_by',
                'marketing_at',
                'marketing_note',
                'ready_at',
                'weight_kg',
                'shipping_note',
                'ongkir_at',
                'shipped_at',
                'received_at',
                'deleted_at',
                'deleted_by',
                'delete_reason',
            ], fn ($col) => Schema::hasColumn('orders', $col));

            if ($cols) {
                Schema::table('orders', function (Blueprint $table) use ($cols) {
                    $table->dropColumn(array_values($cols));
                });
            }
        }

        if (Schema::hasTable('payments')) {
            $cols = array_filter([
                'method',
                'bank_name',
                'account_number',
                'note',
            ], fn ($col) => Schema::hasColumn('payments', $col));

            if ($cols) {
                Schema::table('payments', function (Blueprint $table) use ($cols) {
                    $table->dropColumn(array_values($cols));
                });
            }
        }
    }
};
