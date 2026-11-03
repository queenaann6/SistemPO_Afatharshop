<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    protected $table = 'bank_accounts';

    protected $fillable = [
        'bank_name',
        'account_number',
        'account_holder',
        'type',
        'purpose',
        'brands',
        'logo',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'brands'    => 'array',
    ];

    public function deposits()
    {
        return $this->hasMany(DepositTransaction::class, 'bank_account_id');
    }
}
