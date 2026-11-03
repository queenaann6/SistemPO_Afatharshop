<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Level;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LevelController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Level::orderBy('id')->paginate(15),
        ]);
    }

    public function show(string $id)
    {
        $level = Level::find($id);

        if (!$level) {
            return response()->json([
                'success' => false,
                'message' => 'Level tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $level,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:50',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $level = Level::create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Level berhasil dibuat.',
            'data' => $level,
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $level = Level::find($id);

        if (!$level) {
            return response()->json([
                'success' => false,
                'message' => 'Level tidak ditemukan.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:50',
            'description' => 'sometimes|nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $level->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Level berhasil diperbarui.',
            'data' => $level->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $level = Level::find($id);

        if (!$level) {
            return response()->json([
                'success' => false,
                'message' => 'Level tidak ditemukan.',
            ], 404);
        }

        if ($level->users()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Level masih digunakan oleh pengguna.',
            ], 409);
        }

        $level->delete();

        return response()->json([
            'success' => true,
            'message' => 'Level berhasil dihapus.',
        ]);
    }
}
