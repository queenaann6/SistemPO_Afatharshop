<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentRequest extends Model
{
    protected $table = 'payment_requests';

    protected $fillable = [
        'code',
        'created_by',
        'bank_account_id',
        'amount',
        'purpose',
        'reference',
        'note',
        'status',
        'marketing_by',
        'marketing_at',
        'marketing_note',
        'marketing_decision',
        'owner_by',
        'owner_at',
        'owner_note',
        'owner_decision',
        'transfer_by',
        'transfer_at',
        'transfer_note',
        'transfer_proof',
    ];

    protected $casts = [
        'amount'       => 'float',
        'marketing_at' => 'datetime',
        'owner_at'     => 'datetime',
        'transfer_at'  => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }
}
