<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

Artisan::command('data:check-counts', function () {
    $this->info('Ringkasan Jumlah Data Saat Ini:');
    $tables = [
        'users',
        'products',
        'po_batches',
        'orders',
        'order_items',
        'invoices',
        'payments',
        'deposit_transactions',
        'categories',
        'brands',
        'bank_accounts',
        'couriers'
    ];
    foreach ($tables as $t) {
        if (Schema::hasTable($t)) {
            $count = DB::table($t)->count();
            $this->line("  - {$t}: {$count} baris");
        }
    }
    $this->info('Daftar Akun Pengguna:');
    foreach (App\Models\User::all() as $u) {
        $this->line("    [#{$u->id}] {$u->nama} <{$u->email}> (Role: {$u->role}, Level: {$u->level})");
    }
})->purpose('Check row counts for main tables');

Artisan::command('data:seed-default-roles', function () {
    $this->info('Memastikan 4 akun peran utama (Marketing, Finance, Owner, Mitra) aktif di database...');

    $defaults = [
        [
            'nama'            => 'Heni (Mitra DB)',
            'email'           => 'afatharshop@afatharshop.com',
            'password'        => Hash::make('password123'),
            'level'           => 'DB All',
            'phone'           => '081219991888',
            'city'            => 'KOTA BEKASI',
            'deposit_balance' => 0,
            'is_active'       => true,
            'avatar'          => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
        ],
        [
            'nama'            => 'Rina Marketing',
            'email'           => 'marketing@afatharshop.com',
            'password'        => Hash::make('password123'),
            'level'           => 'marketing',
            'phone'           => '081222223333',
            'city'            => 'KOTA BOGOR',
            'deposit_balance' => 0,
            'is_active'       => true,
            'avatar'          => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        ],
        [
            'nama'            => 'Dewi Finance',
            'email'           => 'finance@afatharshop.com',
            'password'        => Hash::make('password123'),
            'level'           => 'finance',
            'phone'           => '081244445555',
            'city'            => 'KOTA BOGOR',
            'deposit_balance' => 0,
            'is_active'       => true,
            'avatar'          => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
        ],
        [
            'nama'            => 'Heny Owner',
            'email'           => 'owner@afatharshop.com',
            'password'        => Hash::make('password123'),
            'level'           => 'owner',
            'phone'           => '081266667777',
            'city'            => 'KOTA BOGOR',
            'deposit_balance' => 0,
            'is_active'       => true,
            'avatar'          => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        ],
    ];

    foreach ($defaults as $u) {
        App\Models\User::updateOrCreate(
            ['email' => $u['email']],
            $u
        );
        $this->line("  ✓ Akun {$u['nama']} ({$u['email']} | {$u['level']}) aktif.");
    }

    $this->info('Selesai! Seluruh akun peran siap digunakan login.');
})->purpose('Ensure 4 primary accounts exist in users table');

Artisan::command('data:reset-for-testing', function () {
    $this->info('Memulai pembersihan data transaksi, pesanan, deposit, dan produk untuk pengujian real...');

    Schema::disableForeignKeyConstraints();

    $tablesToTruncate = [
        'order_items',
        'order_status_histories',
        'payments',
        'installments',
        'invoices',
        'orders',
        'deposit_transactions',
        'payment_requests',
        'notifications',
        'activity_logs',
        'cart_items',
        'carts',
        'po_batches',
        'product_prices',
        'product_variants',
        'products',
    ];

    foreach ($tablesToTruncate as $table) {
        if (Schema::hasTable($table)) {
            DB::table($table)->truncate();
            $this->line("  ✓ Tabel {$table} dikosongkan.");
        }
    }

    // Reset saldo deposit semua pengguna ke 0
    if (Schema::hasTable('users')) {
        DB::table('users')->update(['deposit_balance' => 0]);
        $this->line('  ✓ Saldo deposit pengguna di-reset ke 0.');
    }

    Schema::enableForeignKeyConstraints();

    $this->info('Pembersihan selesai! Semua data transaksi, pesanan, dan katalog telah kosong dan siap diisi data real.');
})->purpose('Reset all transactional data, orders, deposits, and catalog products for real data testing');

