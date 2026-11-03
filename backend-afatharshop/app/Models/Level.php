<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Level extends Model
{
    protected $table = 'levels';

    protected $fillable = [
        'name',
        'description',
    ];

    public function users()
    {
        // users.level menyimpan nama level (string), bukan foreign key level_id
        return $this->hasMany(User::class, 'level', 'name');
    }
}
