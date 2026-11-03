<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LoginController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request)
    {
        // 1. Validasi input request
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required',
            'level'    => 'nullable|string',
            'role'     => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 400);
        }

        // 2. Coba autentikasi kredensial email & password
        $credentials = $request->only('email', 'password');

        if (!$token = auth()->guard('api')->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau Password salah!',
            ], 401);
        }

        // 3. Ambil data user yang berhasil login
        $user = auth()->guard('api')->user();

        // 4. Verifikasi status keaktifan akun (is_active)
        if (isset($user->is_active) && !$user->is_active) {
            auth()->guard('api')->logout();
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda sedang dinonaktifkan. Silakan hubungi admin.',
            ], 403);
        }

        // 5. Verifikasi kesesuaian role / level jika dikirim dari frontend tab
        $requestedRole = strtolower(trim($request->input('role') ?? $request->input('level') ?? ''));
        if ($requestedRole) {
            $userRole = strtolower($user->role);
            $userLevel = strtolower($user->level);

            // Validasi: Jika tab yang dipilih adalah 'mitra' dan user bertingkat DB All / Sub DB / Agen / Reseller -> Valid!
            $isMitraValid = ($requestedRole === 'mitra' && $user->isMitra());
            $isDirectMatch = ($requestedRole === $userRole || $requestedRole === $userLevel);

            if (!$isMitraValid && !$isDirectMatch) {
                auth()->guard('api')->logout();
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak! Akun Anda terdaftar sebagai tingkatan ' . strtoupper($user->level) . ' (Grup: ' . strtoupper($user->role) . '), bukan ' . strtoupper($requestedRole) . '.',
                ], 403);
            }
        }

        // 6. Respon sukses dengan payload user & token JWT
        return response()->json([
            'success' => true,
            'message' => 'Login Berhasil!',
            'user'    => [
                'id'        => $user->id,
                'nama'      => $user->nama ?? $user->name,
                'email'     => $user->email,
                'role'      => $user->role,   // 'mitra', 'marketing', 'finance', 'owner'
                'level'     => $user->level,  // 'DB All', 'Sub DB', 'Agen', 'Reseller', dll
                'phone'     => $user->phone,
                'is_active' => (bool) $user->is_active,
            ],
            'token'   => $token,
        ], 200);
    }
}
