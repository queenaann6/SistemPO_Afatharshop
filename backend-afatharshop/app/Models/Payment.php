<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $table = 'payments';

    protected $fillable = [
        'invoice_id',
        'installment_id',
        'verified_by',
        'amount',
        'proof_url',
        'status',
        'rejection_reason',
        'uploaded_at',
        'verified_at',
    ];

    protected $casts = [
        'amount'      => 'float',
        'uploaded_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function installment()
    {
        return $this->belongsTo(Installment::class, 'installment_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
