<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'     => 'nullable|string|max:100',
            'nama'     => 'nullable|string|max:100',
            'email'    => 'required|email|max:100|unique:users,email',
            'phone'    => 'required|string|max:20',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $nama = trim((string) ($request->input('nama') ?? $request->input('name')));

        if ($nama === '') {
            return response()->json([
                'success' => false,
                'message' => 'Nama wajib diisi.',
                'errors'  => ['nama' => ['Nama wajib diisi.']],
            ], 422);
        }

        $user = User::create([
            'nama'     => $nama,
            'email'    => Str::lower($request->email),
            'phone'    => $request->phone,
            'password' => $request->password,
            'level'    => 'Reseller',
            'is_active' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil. Menunggu aktivasi admin.',
            'data'    => $this->userPayload($user),
        ], 201);
    }

    public function login(Request $request)
    {
        $identifier = trim((string) ($request->input('login')
            ?? $request->input('email')
            ?? $request->input('phone')));

        $validator = Validator::make([
            'login'    => $identifier,
            'password' => $request->input('password'),
        ], [
            'login'    => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [Str::lower($identifier)])
            ->orWhere('phone', $identifier)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password ?? '')) {
            return response()->json([
                'success' => false,
                'message' => 'Email/No. HP atau password salah.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum aktif. Silakan hubungi admin.',
            ], 403);
        }

        $token = auth('api')->login($user);

        return $this->tokenResponse($token, $user);
    }

    public function me()
    {
        return response()->json([
            'success' => true,
            'data'    => $this->userPayload(auth('api')->user()),
        ]);
    }

    public function logout()
    {
        auth('api')->logout();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

    public function refresh()
    {
        $token = auth('api')->refresh();
        $user  = auth('api')->setToken($token)->user();

        return $this->tokenResponse($token, $user);
    }

    private function tokenResponse(string $token, ?User $user = null)
    {
        $user ??= auth('api')->user();

        return response()->json([
            'success'      => true,
            'message'      => 'Autentikasi berhasil.',
            'access_token' => $token,
            'token'        => $token,
            'token_type'   => 'Bearer',
            'expires_in'   => auth('api')->factory()->getTTL() * 60,
            'user'         => $this->userPayload($user),
        ]);
    }

    private function userPayload(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        return [
            'id'              => $user->id,
            'name'            => $user->nama ?? $user->name,
            'nama'            => $user->nama ?? $user->name,
            'email'           => $user->email,
            'role'            => $user->role,
            'level'           => $user->level,
            'phone'           => $user->phone,
            'avatar'          => $user->avatar,
            'deposit_balance' => (float) $user->deposit_balance,
            'city'            => $user->city,
            'is_active'       => (bool) $user->is_active,
        ];
    }
}
