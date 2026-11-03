<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepositTransaction extends Model
{
    protected $table = 'deposit_transactions';

    public $timestamps = false; // kolom hanya created_at

    protected $fillable = [
        'user_id',
        'bank_account_id',
        'type',
        'amount',
        'proof_url',
        'status',
        'verified_by',
        'verified_at',
        'balance_before',
        'balance_after',
        'reference_type',
        'reference_id',
        'description',
        'created_at',
    ];

    protected $casts = [
        'amount'         => 'float',
        'balance_before' => 'float',
        'balance_after'  => 'float',
        'verified_at'    => 'datetime',
        'created_at'     => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
