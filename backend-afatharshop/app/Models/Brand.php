<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    protected $table = 'brands';

    protected $fillable = [
        'db_all_partner_id',
        'supplier_id',
        'name',
        'logo',
        'description',
        'discount_db_all',
        'discount_sub_db',
        'discount_agen',
        'discount_reseller',
        'is_active',
    ];

    protected $casts = [
        'is_active'         => 'boolean',
        'discount_db_all'   => 'float',
        'discount_sub_db'   => 'float',
        'discount_agen'     => 'float',
        'discount_reseller' => 'float',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'brand_id');
    }

    public function batches()
    {
        return $this->hasMany(PoBatch::class, 'brand_id');
    }
}
