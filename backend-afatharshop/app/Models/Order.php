<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $table = 'orders';

    protected $fillable = [
        'user_id',
        'address_id',
        'order_number',
        'status',
        'production_status',
        'courier_name',
        'tracking_number',
        'notes',
        'is_split_address',
        'subtotal',
        'shipping_cost',
        'total_amount',
        'ordered_at',
    ];

    protected $casts = [
        'subtotal'         => 'float',
        'shipping_cost'    => 'float',
        'total_amount'     => 'float',
        'ordered_at'       => 'datetime',
        'is_split_address' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function address()
    {
        return $this->belongsTo(Address::class, 'address_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class, 'order_id');
    }

    public function payments()
    {
        return $this->hasManyThrough(Payment::class, Invoice::class, 'order_id', 'invoice_id');
    }

    public function statusHistories()
    {
        return $this->hasMany(OrderStatusHistory::class, 'order_id');
    }
}
