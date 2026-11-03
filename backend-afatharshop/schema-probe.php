<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$tables = [
    'orders', 'order_status_history', 'invoices', 'installments', 'payments',
    'deposit_transactions', 'payment_requests', 'products', 'product_prices',
    'product_variants', 'brands', 'categories', 'suppliers', 'po_batches',
    'users', 'addresses', 'activity_logs', 'notifications', 'levels', 'bank_accounts',
    'order_items',
];

$want = ['status', 'type', 'level', 'is_active', 'is_sale', 'decision', 'note'];

foreach ($tables as $t) {
    $rows = DB::select(
        "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
         FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION",
        [$t]
    );
    if (!$rows) {
        echo "-- {$t}: TIDAK ADA --\n";
        continue;
    }
    $interesting = array_filter($rows, fn ($r) => $r->DATA_TYPE === 'enum'
        || in_array(rtrim($r->COLUMN_NAME, 's'), $want, true)
        || in_array($r->COLUMN_NAME, $want, true));
    echo "== {$t} ==\n";
    foreach ($interesting as $r) {
        printf("  %-22s %-52s null=%s default=%s\n", $r->COLUMN_NAME, $r->COLUMN_TYPE, $r->IS_NULLABLE, (string) $r->COLUMN_DEFAULT);
    }
}
