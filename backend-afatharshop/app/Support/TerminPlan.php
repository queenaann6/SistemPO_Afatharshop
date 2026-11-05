<?php

namespace App\Support;

use App\Models\Product;
use Carbon\Carbon;

/**
 * Satu sumber kebenaran untuk jadwal termin.
 *
 * Persen diambil dari products.payment_stages; bila katalog tidak punya
 * susunan yang sah, fallback ke satu DP + pelunasan. Basis pembagian adalah
 * subtotal produk, bukan total invoice, karena ongkir ditagih terpisah lewat
 * baris payment tanpa installment_id.
 */
class TerminPlan
{
    /**
     * DP dan termin terakhir yang dipakai bila katalog belum punya payment_stages.
     * Angka ini adalah satu-satunya default di sistem: sisi frontend memakai nilai
     * yang sama lewat src/utils/terminScheme.js.
     */
    public const DEFAULT_DP_PERCENT = 25.0;

    public const DEFAULT_LAST_STAGE_PERCENT = 25.0;
    /**
     * @return list<array{type: string, sequence: int, percent: float, due_at: Carbon}>|null
     *         null bila payment_stages katalog tidak layak pakai.
     */
    public static function catalogOnly(?Product $product, ?Carbon $anchor = null): ?array
    {
        $raw = self::decodeStages($product?->payment_stages);
        if ($raw === null) {
            return null;
        }

        $total = count($raw);
        $anchor = $anchor ? $anchor->copy() : now();

        return array_map(
            fn ($stg, $idx) => [
                'type'     => self::typeFor($idx, $total),
                'sequence' => $idx + 1,
                'percent'  => (float) ($stg['pct'] ?? $stg['percent'] ?? 0) / 100,
                'due_at'   => self::dueAt($stg['date'] ?? null, $anchor, $idx, $total),
            ],
            $raw,
            array_keys($raw)
        );
    }

    /**
     * @return list<array{type: string, sequence: int, percent: float, due_at: Carbon}>
     */
    public static function forProduct(?Product $product, ?float $dpPct = null, ?Carbon $anchor = null): array
    {
        $fromCatalog = self::catalogOnly($product, $anchor);
        if ($fromCatalog !== null) {
            return $fromCatalog;
        }

        $anchor = $anchor ? $anchor->copy() : now();
        $percent = $dpPct ?? (float) ($product?->min_dp_percent ?? 0);
        if ($percent <= 0) {
            $percent = self::DEFAULT_DP_PERCENT;
        }
        $percent = max(10, min(90, $percent));
        $cicilan = max(0, 100 - $percent - self::DEFAULT_LAST_STAGE_PERCENT);

        if ($cicilan > 0) {
            return [
                ['type' => 'dp', 'sequence' => 1, 'percent' => $percent / 100, 'due_at' => $anchor->copy()->addDays(3)],
                ['type' => 'cicilan', 'sequence' => 2, 'percent' => $cicilan / 100, 'due_at' => $anchor->copy()->addDays(30)],
                ['type' => 'pelunasan', 'sequence' => 3, 'percent' => (100 - $percent - $cicilan) / 100, 'due_at' => $anchor->copy()->addDays(60)],
            ];
        }

        return [
            ['type' => 'dp', 'sequence' => 1, 'percent' => $percent / 100, 'due_at' => $anchor->copy()->addDays(3)],
            ['type' => 'pelunasan', 'sequence' => 2, 'percent' => (100 - $percent) / 100, 'due_at' => $anchor->copy()->addDays(30)],
        ];
    }

    /**
     * Bagikan $base ke tiap termin. Termin terakhir menyerap selisih
     * pembulatan sehingga jumlah nominal selalu sama persis dengan $base.
     *
     * @param  list<array<string, mixed>>  $stages
     * @return list<array<string, mixed>>
     */
    public static function split(float $base, array $stages): array
    {
        $lastIndex = count($stages) - 1;
        $allocated = 0.0;

        foreach ($stages as $index => $stage) {
            $amount = $index === $lastIndex
                ? round($base - $allocated, 2)
                : round($base * (float) $stage['percent'], 2);
            $allocated += $amount;
            $stages[$index]['amount'] = max(0, $amount);
        }

        return $stages;
    }

    /**
     * Normalisasi persen sekumpulan termin menjadi basis pembagian baru,
     * dipakai saat sebagian termin sudah terkunci oleh pembayaran.
     *
     * @param  list<array<string, mixed>>  $stages
     * @return list<array<string, mixed>>
     */
    public static function rescale(array $stages): array
    {
        $sum = array_sum(array_map(fn ($s) => (float) $s['percent'], $stages));
        if ($sum <= 0) {
            return $stages;
        }

        return array_map(
            fn ($s) => array_merge($s, ['percent' => (float) $s['percent'] / $sum]),
            $stages
        );
    }

    public static function typeFor(int $index, int $total): string
    {
        if ($index === 0) {
            return 'dp';
        }

        return $index === $total - 1 ? 'pelunasan' : ('cicilan_' . $index);
    }

    /**
     * @return list<array{pct: float, date?: string}>|null
     */
    private static function decodeStages($stages): ?array
    {
        if (is_string($stages)) {
            $stages = json_decode($stages, true);
        }
        if (!is_array($stages)) {
            return null;
        }

        $rows = array_values(array_filter(
            $stages,
            fn ($stg) => is_array($stg) && (float) ($stg['pct'] ?? $stg['percent'] ?? 0) > 0
        ));
        if (count($rows) < 2) {
            return null;
        }

        $sum = array_sum(array_map(fn ($stg) => (float) ($stg['pct'] ?? $stg['percent'] ?? 0), $rows));

        return abs($sum - 100) <= 0.01 ? $rows : null;
    }

    private static function dueAt($date, Carbon $anchor, int $index, int $total): Carbon
    {
        if (!empty($date)) {
            try {
                return Carbon::parse((string) $date);
            } catch (\Throwable $e) {
                // Tanggal tidak terbaca: pakai jarak baku dari tanggal pesanan.
            }
        }

        $days = $index === 0 ? 3 : ($index === $total - 1 ? 60 : 30 * $index);

        return $anchor->copy()->addDays($days);
    }
}
