<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PoBatch extends Model
{
    protected $table = 'po_batches';

    protected $fillable = [
        'brand_id',
        'name',
        'start_date',
        'close_date',
        'estimated_shipment',
        'status',
    ];

    protected $casts = [
        'start_date'         => 'date',
        'close_date'         => 'datetime',
        'estimated_shipment' => 'date',
    ];

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'po_batch_id');
    }

    /**
     * Cek apakah batch PO sudah ditutup (baik manual status 'closed' atau melewati close_date).
     */
    public function isClosed(): bool
    {
        if ($this->status === 'closed') {
            return true;
        }
        if ($this->close_date && now()->greaterThanOrEqualTo($this->close_date)) {
            return true;
        }
        return false;
    }

    /**
     * Status efektif: 'closed' jika melewati batas waktu close_date.
     */
    public function getEffectiveStatusAttribute(): string
    {
        return $this->isClosed() ? 'closed' : ($this->status ?: 'open');
    }

    /**
     * Tutup otomatis batch PO di database yang telah melewati close_date.
     */
    public static function autoCloseExpired(): void
    {
        try {
            static::where('status', '!=', 'closed')
                ->whereNotNull('close_date')
                ->where('close_date', '<=', now())
                ->update(['status' => 'closed']);
        } catch (\Throwable $e) {
            // Abaikan kesalahan DB sementara jika terjadi saat bootstrap
        }
    }
}
