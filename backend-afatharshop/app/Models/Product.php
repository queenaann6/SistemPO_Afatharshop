<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'brand_id',
        'category_id',
        'po_batch_id',
        'name',
        'article_code',
        'image',
        'image2',
        'image3',
        'image4',
        'image5',
        'image6',
        'reel_url',
        'thumbnails',
        'series',
        'status',
        'tutup_po',
        'estimated_shipment',
        'min_dp_percent',
        'payment_stages',
        'termin_count',
        'stock_quota',
        'description',
        'material_detail',
        'is_sale',
        'discount_percent',
        'original_price',
        'is_active',
    ];

    protected $casts = [
        'is_active'          => 'boolean',
        'is_sale'            => 'boolean',
        'discount_percent'   => 'integer',
        'original_price'     => 'float',
        'tutup_po'           => 'datetime',
        'estimated_shipment' => 'date',
        'min_dp_percent'     => 'integer',
        'payment_stages'     => 'array',
        'thumbnails'         => 'array',
        'termin_count'       => 'integer',
        'stock_quota'        => 'integer',
    ];

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function batch()
    {
        return $this->belongsTo(PoBatch::class, 'po_batch_id');
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class, 'product_id');
    }

    public function prices()
    {
        return $this->hasMany(ProductPrice::class, 'product_id');
    }

    /**
     * Waktu tutup PO efektif (mengambil dari tabel produk jika ada, fallback ke close_date batch).
     */
    public function getEffectiveTutupPoAttribute()
    {
        return $this->tutup_po ?? $this->batch?->close_date;
    }

    /**
     * Menentukan apakah PO untuk produk ini sudah ditutup.
     * Mengembalikan true jika:
     * 1. Status produk sudah 'closed_po' atau 'closed'
     * 2. Batch terkait sudah 'closed' atau melewati close_date
     * 3. Waktu tutup PO (tutup_po / close_date batch) sudah melewati waktu saat ini (now())
     */
    public function isClosedPo(): bool
    {
        if (in_array($this->status, ['closed_po', 'closed'], true)) {
            return true;
        }
        if ($this->status === 'ready_stock') {
            return false;
        }
        if ($this->batch?->isClosed()) {
            return true;
        }
        $effectiveClose = $this->effective_tutup_po;
        if ($effectiveClose && now()->greaterThanOrEqualTo($effectiveClose)) {
            return true;
        }
        return false;
    }

    /**
     * Status efektif produk yang memperhitungkan jam tutup PO secara dinamis.
     */
    public function getEffectiveStatusAttribute(): string
    {
        if ($this->status === 'ready_stock') {
            return 'ready_stock';
        }
        return $this->isClosedPo() ? 'closed_po' : ($this->status ?: 'pre_order');
    }

    /**
     * Sinkronisasi otomatis batch dan produk PO expired di database ke status 'closed_po'/'closed'.
     */
    public static function autoSyncExpired(): void
    {
        try {
            $now = now();

            // 1. Sinkronisasi batch PO yang melewati batas waktu close_date
            PoBatch::autoCloseExpired();

            // 2. Tutup produk yang punya batas tutup_po sendiri dan sudah lewat
            static::where('status', 'pre_order')
                ->whereNotNull('tutup_po')
                ->where('tutup_po', '<=', $now)
                ->update(['status' => 'closed_po']);

            // 3. Tutup produk pre_order yang batch-nya sudah berstatus closed
            static::where('status', 'pre_order')
                ->whereHas('batch', function ($bq) use ($now) {
                    $bq->where('status', 'closed')
                       ->orWhere(function ($sq) use ($now) {
                           $sq->whereNotNull('close_date')->where('close_date', '<=', $now);
                       });
                })
                ->update(['status' => 'closed_po']);
        } catch (\Throwable $e) {
            // Log / lewati jika database sedang transisi
        }
    }
}
