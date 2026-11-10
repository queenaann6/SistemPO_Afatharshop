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

    protected $appends = [
        'method',
        'bank_name',
        'account_number',
    ];

    public function getMethodAttribute(): string
    {
        $proof = strtoupper((string) ($this->proof_url ?? ''));
        if ($proof === 'DEPOSIT' || empty($this->proof_url)) {
            return 'deposit';
        }
        return 'transfer';
    }

    public function getBankNameAttribute(): string
    {
        return $this->getMethodAttribute() === 'deposit' ? 'Deposit' : 'Transfer Bank';
    }

    public function getAccountNumberAttribute(): string
    {
        return $this->getMethodAttribute() === 'deposit' ? 'Saldo Deposit' : '';
    }

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
