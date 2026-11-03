<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductPrice extends Model
{
    protected $table = 'product_prices';

    protected $fillable = [
        'product_id',
        'level_id',
        'price',
        'fee',
    ];

    protected $casts = [
        'price' => 'float',
        'fee'   => 'float',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function level()
    {
        return $this->belongsTo(Level::class, 'level_id');
    }
}
