<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $table = 'suppliers';

    protected $fillable = [
        'name',
        'city',
        'phone',
        'contact_person',
    ];

    public function brands()
    {
        return $this->hasMany(Brand::class, 'supplier_id');
    }
}
