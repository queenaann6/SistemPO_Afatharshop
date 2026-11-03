<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $table = 'product_variants';

    protected $fillable = [
        'product_id',
        'model',
        'size',
        'color',
        'sku',
        'stock',
        'price',
        'addon',
        'hpp',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'stock'     => 'integer',
        'price'     => 'float',
        'addon'     => 'float',
        'hpp'       => 'float',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
