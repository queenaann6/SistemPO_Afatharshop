<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $table = 'app_settings';

    protected $fillable = [
        'key',
        'value',
    ];

    public static function asMap(): array
    {
        return static::query()->pluck('value', 'key')->toArray();
    }
}
