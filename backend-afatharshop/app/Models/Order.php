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
        'marketing_status',
        'marketing_by',
        'marketing_at',
        'marketing_note',
        'production_status',
        'ready_at',
        'courier_name',
        'tracking_number',
        'notes',
        'is_split_address',
        'subtotal',
        'shipping_cost',
        'weight_kg',
        'shipping_note',
        'ongkir_at',
        'shipped_at',
        'received_at',
        'total_amount',
        'ordered_at',
        'deleted_at',
        'deleted_by',
        'delete_reason',
    ];

    protected $casts = [
        'subtotal'         => 'float',
        'shipping_cost'    => 'float',
        'weight_kg'        => 'float',
        'total_amount'     => 'float',
        'ordered_at'       => 'datetime',
        'marketing_at'     => 'datetime',
        'ready_at'         => 'datetime',
        'ongkir_at'        => 'datetime',
        'shipped_at'       => 'datetime',
        'received_at'      => 'datetime',
        'deleted_at'       => 'datetime',
        'is_split_address' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    public function scopeTrashedOnly($query)
    {
        return $query->whereNotNull('deleted_at');
    }

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
