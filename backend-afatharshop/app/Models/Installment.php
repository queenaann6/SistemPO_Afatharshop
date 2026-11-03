<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Installment extends Model
{
    protected $table = 'installments';

    protected $fillable = [
        'invoice_id',
        'type',
        'sequence_number',
        'amount',
        'paid_amount',
        'status',
        'due_at',
    ];

    protected $casts = [
        'amount'      => 'float',
        'paid_amount' => 'float',
        'due_at'      => 'datetime',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
