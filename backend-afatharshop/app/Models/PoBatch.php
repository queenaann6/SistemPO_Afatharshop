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
}
