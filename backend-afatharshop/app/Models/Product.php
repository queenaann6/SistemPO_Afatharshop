<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'brand_id',
        'category_id',
        'po_batch_id',
        'name',
        'article_code',
        'image',
        'image2',
        'image3',
        'image4',
        'reel_url',
        'thumbnails',
        'series',
        'status',
        'tutup_po',
        'estimated_shipment',
        'min_dp_percent',
        'payment_stages',
        'termin_count',
        'stock_quota',
        'description',
        'material_detail',
        'is_sale',
        'discount_percent',
        'original_price',
        'is_active',
    ];

    protected $casts = [
        'is_active'          => 'boolean',
        'is_sale'            => 'boolean',
        'discount_percent'   => 'integer',
        'original_price'     => 'float',
        'tutup_po'           => 'datetime',
        'estimated_shipment' => 'date',
        'min_dp_percent'     => 'integer',
        'payment_stages'     => 'array',
        'thumbnails'         => 'array',
        'termin_count'       => 'integer',
        'stock_quota'        => 'integer',
    ];

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function batch()
    {
        return $this->belongsTo(PoBatch::class, 'po_batch_id');
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class, 'product_id');
    }

    public function prices()
    {
        return $this->hasMany(ProductPrice::class, 'product_id');
    }
}
