<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckLevel
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$levels
     */
    public function handle(Request $request, Closure $next, ...$levels): Response
    {
        $user = auth()->guard('api')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Silakan login terlebih dahulu.',
            ], 401);
        }

        $userRole = strtolower($user->role);
        $userLevel = strtolower($user->level);
        $allowedLevels = array_map('strtolower', $levels);

        // Akses diberikan jika:
        // 1. Role cocok langsung (misal: 'mitra', 'marketing', 'owner')
        // 2. Atau level spesifik cocok (misal: 'db all', 'sub db', 'agen', 'reseller')
        // 3. Atau route meminta 'mitra' dan user adalah salah satu tingkatan mitra
        $hasAccess = in_array($userRole, $allowedLevels)
                  || in_array($userLevel, $allowedLevels)
                  || (in_array('mitra', $allowedLevels) && $user->isMitra());

        if (!$hasAccess) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Anda tidak memiliki izin akses (Tingkat: ' . $user->level . ').',
            ], 403);
        }

        return $next($request);
    }
}
