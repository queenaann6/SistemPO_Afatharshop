<?php

use App\Http\Middleware\CheckLevel;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role'  => RoleMiddleware::class,
            'level' => CheckLevel::class,
        ]);

        // Request unauthenticated pada API tidak boleh redirect ke route 'login', harus return null agar lempar AuthenticationException
        $middleware->redirectGuestsTo(function ($request) {
            return null;
        });
    })

    ->withExceptions(function (Exceptions $exceptions) {
        $isApi = fn ($request) => $request->is('api/*') || $request->expectsJson();

        // Semua request API wajib dibalas JSON, bukan redirect ke route 'login'.
        $exceptions->shouldRenderJsonWhen(fn ($request, $e) => $isApi($request));

        $exceptions->render(function (AuthenticationException $e, $request) use ($isApi) {
            if (!$isApi($request)) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'Sesi kamu berakhir. Silakan masuk kembali.',
            ], 401);
        });

        $exceptions->render(function (\Symfony\Component\Routing\Exception\RouteNotFoundException $e, $request) use ($isApi) {
            if ($isApi($request) && str_contains($e->getMessage(), 'login')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sesi kamu berakhir. Silakan masuk kembali.',
                ], 401);
            }
            return null;
        });

        $exceptions->render(function (ValidationException $e, $request) use ($isApi) {
            if (!$isApi($request)) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors'  => $e->errors(),
            ], 422);
        });

        $exceptions->render(function (ModelNotFoundException $e, $request) use ($isApi) {
            if (!$isApi($request)) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'Data tidak ditemukan.',
            ], 404);
        });

        $exceptions->render(function (HttpExceptionInterface $e, $request) use ($isApi) {
            if (!$isApi($request)) {
                return null;
            }

            $messages = [
                403 => 'Akses ditolak untuk role kamu.',
                404 => 'Endpoint tidak ditemukan.',
                405 => 'Metode permintaan tidak didukung endpoint ini.',
                429 => 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
            ];
            $status = $e->getStatusCode();

            return response()->json([
                'success' => false,
                'message' => $messages[$status] ?? ($e->getMessage() ?: 'Permintaan gagal.'),
            ], $status);
        });
    })->create();
