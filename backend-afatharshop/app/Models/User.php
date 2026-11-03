<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    protected $table = 'users';

    public const MITRA_LEVELS = [
        'db all',
        'sub db',
        'agen',
        'reseller',
        'mitra',
        'db_all',
        'sub_db',
    ];

    protected $fillable = [
        'nama',
        'email',
        'password',
        'level',
        'phone',
        'avatar',
        'deposit_balance',
        'city',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
            'deposit_balance'   => 'float',
        ];
    }

    public function getNameAttribute()
    {
        return $this->attributes['nama'] ?? $this->attributes['name'] ?? null;
    }

    public function getRoleAttribute()
    {
        $rawLevel = strtolower(trim($this->attributes['level'] ?? ''));
        if (in_array($rawLevel, self::MITRA_LEVELS)) {
            return 'mitra';
        }
        return $rawLevel;
    }

    public function isMitra(): bool
    {
        $rawLevel = strtolower(trim($this->attributes['level'] ?? ''));
        return in_array($rawLevel, self::MITRA_LEVELS);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'user_id');
    }

    public function addresses()
    {
        return $this->hasMany(Address::class, 'user_id');
    }

    public function deposits()
    {
        return $this->hasMany(DepositTransaction::class, 'user_id');
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'role'            => $this->role,
            'level'           => $this->level,
            'nama'            => $this->nama ?? $this->name,
            'email'           => $this->email,
            'phone'           => $this->phone,
            'avatar'          => $this->avatar,
            'deposit_balance' => $this->deposit_balance,
            'city'            => $this->city,
            'is_active'       => $this->is_active,
        ];
    }
}
