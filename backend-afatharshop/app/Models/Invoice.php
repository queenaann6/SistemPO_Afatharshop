<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $table = 'invoices';

    protected $fillable = [
        'order_id',
        'invoice_number',
        'total_amount',
        'paid_amount',
        'outstanding_amount',
        'status',
        'due_at',
    ];

    protected $casts = [
        'total_amount'       => 'float',
        'paid_amount'        => 'float',
        'outstanding_amount' => 'float',
        'due_at'             => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function installments()
    {
        return $this->hasMany(Installment::class, 'invoice_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'invoice_id');
    }
}
