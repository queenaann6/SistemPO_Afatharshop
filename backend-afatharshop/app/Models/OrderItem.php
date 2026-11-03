<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $table = 'order_items';

    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'address_id',
        'product_variant_id',
        'quantity',
        'unit_price',
        'fee',
        'subtotal',
        'created_at',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function address()
    {
        return $this->belongsTo(Address::class, 'address_id');
    }
}
