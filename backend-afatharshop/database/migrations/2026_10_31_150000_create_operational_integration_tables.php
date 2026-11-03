<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Melengkapi tabel operasional yang sebelumnya hanya ada di dump MySQL
     * (addresses, payments, notifications, order_status_histories) serta
     * tabel modul keuangan (payment_requests, app_settings).
     */
    public function up(): void
    {
        if (!Schema::hasTable('addresses')) {
            Schema::create('addresses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('recipient_name', 100);
                $table->string('recipient_phone', 20);
                $table->text('address_line');
                $table->string('city', 100);
                $table->string('province', 100);
                $table->string('postal_code', 10);
                $table->boolean('is_default')->default(false);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
                $table->foreignId('installment_id')->nullable()->constrained('installments')->nullOnDelete();
                $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->decimal('amount', 15, 2);
                $table->string('proof_url');
                $table->enum('status', ['menunggu_verifikasi', 'disetujui', 'ditolak'])
                    ->default('menunggu_verifikasi');
                $table->text('rejection_reason')->nullable();
                $table->dateTime('uploaded_at');
                $table->dateTime('verified_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('title', 150);
                $table->text('message');
                $table->string('type', 50);
                $table->boolean('is_read')->default(false);
                $table->dateTime('read_at')->nullable();
                $table->timestamps();
            });
        } elseif (!Schema::hasColumn('notifications', 'created_at')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();
            });
        }

        if (!Schema::hasTable('order_status_histories')) {
            Schema::create('order_status_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->enum('status', ['Open', 'Produksi', 'Pengisian Alamat', 'Menunggu Pengiriman', 'Update Resi', 'Terkirim']);
                $table->text('note')->nullable();
                $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('created_at');
            });
        }

        if (!Schema::hasTable('payment_requests')) {
            Schema::create('payment_requests', function (Blueprint $table) {
                $table->id();
                $table->string('code', 30)->unique();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts')->nullOnDelete();
                $table->decimal('amount', 15, 2);
                $table->string('purpose', 150);
                $table->string('reference', 100)->nullable();
                $table->text('note')->nullable();
                $table->string('status', 50)->default('Menunggu Review Purchasing');
                $table->string('marketing_by', 100)->nullable();
                $table->dateTime('marketing_at')->nullable();
                $table->text('marketing_note')->nullable();
                $table->string('marketing_decision', 20)->nullable();
                $table->string('owner_by', 100)->nullable();
                $table->dateTime('owner_at')->nullable();
                $table->text('owner_note')->nullable();
                $table->string('owner_decision', 20)->nullable();
                $table->string('transfer_by', 100)->nullable();
                $table->dateTime('transfer_at')->nullable();
                $table->text('transfer_note')->nullable();
                $table->string('transfer_proof', 255)->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('app_settings')) {
            Schema::create('app_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key', 100)->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('payment_requests');
        Schema::dropIfExists('order_status_histories');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('addresses');
    }
};
