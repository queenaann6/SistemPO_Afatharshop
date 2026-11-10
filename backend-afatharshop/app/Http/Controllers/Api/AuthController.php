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

    public function register(Request $request)
    {
        $name = trim((string) ($request->input('name') ?? $request->input('nama')));
        $request->merge(['name' => $name, 'nama' => $name]);

        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|max:100|unique:users,email',
            'password' => 'required|string|min:6',
            'phone'    => 'nullable|string|max:20',
            'city'     => 'nullable|string|max:100',
            'level'    => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi pendaftaran gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'nama'            => $name,
            'email'           => Str::lower(trim((string) $request->email)),
            'password'        => Hash::make($request->password),
            'role'            => 'mitra',
            'level'           => $request->input('level', 'Reseller'),
            'phone'           => $request->input('phone'),
            'city'            => $request->input('city'),
            'deposit_balance' => 0,
            'is_active'       => true,
        ]);

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

    public function updateProfile(Request $request)
    {
        $user = auth('api')->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'name'     => 'nullable|string|max:100',
            'nama'     => 'nullable|string|max:100',
            'email'    => 'nullable|email|max:100|unique:users,email,' . $user->id,
            'phone'    => 'nullable|string|max:20',
            'avatar'   => 'nullable|string',
            'city'     => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $nama = trim((string) ($request->input('nama') ?? $request->input('name') ?? ''));
        if ($nama !== '') {
            $user->nama = $nama;
        }

        if ($request->filled('email')) {
            $user->email = Str::lower($request->email);
        }

        if ($request->has('phone')) {
            $user->phone = $request->phone;
        }

        if ($request->has('avatar')) {
            $user->avatar = $request->avatar;
        }

        if ($request->has('city')) {
            $user->city = $request->city;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'data'    => $this->userPayload($user->fresh()),
            'user'    => $this->userPayload($user->fresh()),
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = auth('api')->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $oldPassword = $request->input('current_password') ?? $request->input('old_password');
        $newPassword = $request->input('new_password') ?? $request->input('password');
        $confirmPassword = $request->input('new_password_confirmation')
            ?? $request->input('password_confirmation')
            ?? $request->input('confirm_password');

        $validator = Validator::make([
            'current_password'          => $oldPassword,
            'new_password'              => $newPassword,
            'new_password_confirmation' => $confirmPassword,
        ], [
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!Hash::check($oldPassword, $user->password ?? '')) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini salah.',
                'errors'  => ['current_password' => ['Password saat ini salah.']],
            ], 422);
        }

        if ($confirmPassword && $newPassword !== $confirmPassword) {
            return response()->json([
                'success' => false,
                'message' => 'Konfirmasi password baru tidak cocok.',
                'errors'  => ['new_password_confirmation' => ['Konfirmasi password baru tidak cocok.']],
            ], 422);
        }

        $user->password = Hash::make($newPassword);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diperbarui.',
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
            'mitra_id'        => $user->mitra_id,
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
