<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatusHistory extends Model
{
    protected $table = 'order_status_histories';

    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'status',
        'note',
        'changed_by',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function changer()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
