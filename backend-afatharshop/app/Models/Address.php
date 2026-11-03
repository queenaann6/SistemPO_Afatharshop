<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    protected $table = 'addresses';

    protected $fillable = [
        'user_id',
        'recipient_name',
        'recipient_phone',
        'address_line',
        'city',
        'province',
        'postal_code',
        'label',
        'email',
        'subdistrict',
        'district',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
