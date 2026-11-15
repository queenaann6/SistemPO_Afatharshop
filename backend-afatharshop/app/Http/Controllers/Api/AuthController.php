<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                'message' => 'Akun Anda belum aktif atau sedang menunggu ACC Admin. Silakan hubungi admin.',
            ], 403);
        }

        $token = auth('api')->login($user);

        return $this->tokenResponse($token, $user);
    }

    public function register(Request $request)
    {
        $name = trim((string) ($request->input('name') ?? $request->input('nama')));
        $email = Str::lower(trim((string) $request->input('email')));
        $phone = trim((string) ($request->input('phone') ?? $request->input('whatsapp') ?? ''));
        $city = trim((string) ($request->input('city') ?? $request->input('kota') ?? ''));

        $request->merge([
            'name'  => $name,
            'nama'  => $name,
            'email' => $email,
            'phone' => $phone,
            'city'  => $city,
        ]);

        $passwordRule = $request->has('password_confirmation')
            ? 'required|string|min:6|confirmed'
            : 'required|string|min:6';

        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|max:100|unique:users,email',
            'password' => $passwordRule,
            'phone'    => 'required|string|max:20',
            'city'     => 'required|string|max:100',
            'level'    => 'nullable|string|max:50',
        ], [
            'name.required'      => 'Nama lengkap / nama toko wajib diisi.',
            'email.required'     => 'Email wajib diisi.',
            'email.email'        => 'Format email tidak valid.',
            'email.unique'       => 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.',
            'password.required'  => 'Kata sandi wajib diisi.',
            'password.min'       => 'Kata sandi minimal 6 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'phone.required'     => 'Nomor WhatsApp wajib diisi.',
            'city.required'      => 'Kota / wilayah wajib diisi.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi pendaftaran gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $rawLevel = Str::lower(trim((string) $request->input('level', 'Reseller')));
        $clean = str_replace(['-', '_'], ' ', $rawLevel);
        if (str_contains($clean, 'sub')) {
            $level = 'Sub DB';
        } elseif (str_contains($clean, 'agen')) {
            $level = 'Agen';
        } elseif (str_contains($clean, 'db')) {
            $level = 'DB All';
        } else {
            $level = 'Reseller';
        }

        $user = User::create([
            'nama'            => $name,
            'email'           => $email,
            'password'        => Hash::make((string) $request->password),
            'level'           => $level, // Hanya level mitra yang diizinkan (Reseller, Agen, Sub DB, DB All)
            'phone'           => $phone,
            'city'            => $city,
            'deposit_balance' => 0,      // Saldo awal selalu 0
            'is_active'       => true,
        ]);

        ActivityLog::create([
            'user_id'     => $user->id,
            'action'      => 'auth.register',
            'module'      => 'Pengguna',
            'description' => "Pendaftaran mitra baru {$user->nama} ({$user->email})",
            'ip_address'  => $request->ip(),
        ]);

        $token = auth('api')->login($user);

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran berhasil.',
            'token'   => $token,
            'user'    => $this->userPayload($user),
        ], 200);
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

    public function forgotPassword(Request $request)
    {
        $identifier = trim((string) ($request->input('email') ?? $request->input('login') ?? $request->input('phone')));

        $validator = Validator::make(['identifier' => $identifier], [
            'identifier' => 'required|string',
        ], [
            'identifier.required' => 'Email atau nomor HP wajib diisi.',
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

        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Jika akun terdaftar, instruksi reset kata sandi telah dikirim ke email atau nomor WhatsApp Anda.',
            ], 200);
        }

        $token = sprintf('%06d', random_int(100000, 999999));

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token'      => Hash::make($token),
                'created_at' => now(),
            ]
        );

        ActivityLog::create([
            'user_id'     => $user->id,
            'action'      => 'auth.forgot_password',
            'module'      => 'Autentikasi',
            'description' => "Pengajuan reset password untuk akun {$user->email}",
            'ip_address'  => $request->ip(),
        ]);

        $response = [
            'success' => true,
            'message' => 'Kode verifikasi reset kata sandi telah dibuat.',
        ];

        if (app()->environment('local', 'testing')) {
            $response['reset_token'] = $token;
        }

        return response()->json($response, 200);
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'                 => 'required|email',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:6|confirmed',
            'password_confirmation' => 'required|string',
        ], [
            'email.required'                 => 'Email wajib diisi.',
            'token.required'                 => 'Kode reset kata sandi wajib diisi.',
            'password.required'              => 'Kata sandi baru wajib diisi.',
            'password.min'                   => 'Kata sandi minimal 6 karakter.',
            'password.confirmed'             => 'Konfirmasi kata sandi tidak cocok.',
            'password_confirmation.required' => 'Konfirmasi kata sandi wajib diisi.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi reset password gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $email = Str::lower(trim((string) $request->input('email')));
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Permintaan reset kata sandi tidak ditemukan atau sudah kedaluwarsa.',
            ], 422);
        }

        if ($record->created_at && \Carbon\Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Kode reset kata sandi telah kedaluwarsa. Silakan ajukan ulang.',
            ], 422);
        }

        $inputToken = trim((string) $request->input('token'));
        $isValidToken = Hash::check($inputToken, $record->token) || $inputToken === $record->token;

        if (!$isValidToken) {
            return response()->json([
                'success' => false,
                'message' => 'Kode reset kata sandi tidak valid.',
            ], 422);
        }

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Pengguna tidak ditemukan.',
            ], 404);
        }

        $user->password = (string) $request->password;
        $user->save();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        ActivityLog::create([
            'user_id'     => $user->id,
            'action'      => 'auth.reset_password',
            'module'      => 'Autentikasi',
            'description' => "Password akun {$user->email} berhasil direset.",
            'ip_address'  => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kata sandi berhasil diatur ulang. Silakan masuk dengan kata sandi baru Anda.',
        ], 200);
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
