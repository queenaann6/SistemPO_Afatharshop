<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * Dapatkan daftar seluruh produk dalam wishlist user yang sedang login.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $wishlists = Wishlist::with(['product.brand', 'product.variants', 'product.category'])
            ->where('user_id', $user->id)
            ->latest()
            ->get();

        $items = $wishlists->map(function ($w) {
            $p = $w->product;
            if (!$p) return null;
            return [
                'wishlist_id' => $w->id,
                'product_id'  => $p->id,
                'id'          => $p->id,
                'title'       => $p->name,
                'brand'       => $p->brand?->name ?? 'AFATHARSHOP',
                'brand_id'    => $p->brand_id,
                'price'       => (float) ($p->variants->min('price') ?? $p->price ?? 0),
                'image'       => $p->image,
                'category'    => $p->category?->name ?? 'Katalog',
                'status'      => $p->status,
                'created_at'  => $w->created_at?->toIso8601String(),
            ];
        })->filter()->values();

        $productIds = $wishlists->pluck('product_id')->values()->all();

        return response()->json([
            'success'     => true,
            'data'        => $items,
            'product_ids' => $productIds,
        ], 200);
    }

    /**
     * Toggle status produk di wishlist user (tambah jika belum ada, hapus jika sudah ada).
     */
    public function toggle(Request $request): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $request->validate([
            'product_id' => 'required|integer|exists:products,id',
        ]);

        $productId = (int) $request->product_id;
        $existing = Wishlist::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();

        if ($existing) {
            $existing->delete();
            $isWishlist = false;
            $message = 'Produk berhasil dihapus dari Wishlist.';
        } else {
            Wishlist::create([
                'user_id'    => $user->id,
                'product_id' => $productId,
            ]);
            $isWishlist = true;
            $message = 'Produk berhasil disimpan ke Wishlist.';
        }

        $productIds = Wishlist::where('user_id', $user->id)->pluck('product_id')->values()->all();

        return response()->json([
            'success'     => true,
            'message'     => $message,
            'is_wishlist' => $isWishlist,
            'product_ids' => $productIds,
        ], 200);
    }

    /**
     * Hapus produk dari wishlist user.
     */
    public function destroy(Request $request, $productId): JsonResponse
    {
        $user = $request->user('api') ?? auth('api')->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        Wishlist::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->delete();

        $productIds = Wishlist::where('user_id', $user->id)->pluck('product_id')->values()->all();

        return response()->json([
            'success'     => true,
            'message'     => 'Produk berhasil dihapus dari Wishlist.',
            'product_ids' => $productIds,
        ], 200);
    }
}
