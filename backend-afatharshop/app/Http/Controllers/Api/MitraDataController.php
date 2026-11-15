<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\DepositTransaction;
use App\Models\Notification;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Data pendukung dashboard mitra yang terikat pada akun JWT aktif.
 */
class MitraDataController extends Controller
{
    public function deposits(): JsonResponse
    {
        $user = auth('api')->user();

        $deposits = DepositTransaction::query()
            ->with(['bankAccount', 'verifier'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        $data = $deposits->map(fn (DepositTransaction $deposit) => [
            'id'             => $deposit->id,
            'type'           => $deposit->type,
            'mitra_id'       => $user->id,
            'mitra_name'     => $user->nama ?? $user->name,
            'amount'         => (float) $deposit->amount,
            'bank'           => $deposit->bankAccount?->bank_name,
            'bank_account'   => $deposit->bankAccount?->account_number,
            'proof_url'      => $deposit->proof_url,
            'status'         => $deposit->status,
            'verified_by'    => $deposit->verifier?->nama,
            'verified_at'    => optional($deposit->verified_at)->toIso8601String(),
            'balance_before' => (float) $deposit->balance_before,
            'balance_after'  => (float) $deposit->balance_after,
            'description'    => $deposit->description,
            'created_at'     => optional($deposit->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Riwayat deposit mitra.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function payments(): JsonResponse
    {
        $user = auth('api')->user();

        $payments = Payment::query()
            ->with(['installment', 'verifier', 'invoice.order'])
            ->whereHas('invoice.order', fn ($query) => $query->where('user_id', $user->id)->whereNull('deleted_at'))
            ->orderByDesc('uploaded_at')
            ->get();

        $data = $payments->map(function (Payment $payment) {
            $invoice = $payment->invoice;
            $order = $invoice?->order;

            return [
                'id'               => $payment->id,
                'invoice_number'   => $invoice?->invoice_number,
                'order_id'         => $order?->id,
                'order_number'     => $order?->order_number,
                'amount'           => (float) $payment->amount,
                'stage'            => $payment->installment?->type ?: ($payment->invoice_id ? 'ongkir' : null),
                'installment_id'   => $payment->installment_id,
                'status'           => $payment->status,
                'proof_url'        => $payment->proof_url,
                'method'           => $payment->method,
                'bank_name'        => $payment->bank_name,
                'account_number'   => $payment->account_number,
                'note'             => $payment->note,
                'rejection_reason' => $payment->rejection_reason,
                'uploaded_at'      => optional($payment->uploaded_at)->toIso8601String(),
                'verified_by'      => $payment->verifier?->nama,
                'verified_at'      => optional($payment->verified_at)->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Riwayat pembayaran mitra.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function notifications(): JsonResponse
    {
        $user = auth('api')->user();

        $notifications = Notification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $data = $notifications->map(fn (Notification $notification) => [
            'id'         => $notification->id,
            'title'      => $notification->title,
            'message'    => $notification->message,
            'type'       => $notification->type,
            'is_read'    => (bool) $notification->is_read,
            'created_at' => optional($notification->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi mitra.',
            'total'   => $data->count(),
            'data'    => $data,
        ]);
    }

    public function markNotificationsAsRead(Request $request): JsonResponse
    {
        $userId = auth('api')->id();
        $query = Notification::query()->where('user_id', $userId)->where('is_read', false);

        if ($request->filled('id')) {
            $query->where('id', $request->id);
        }

        $query->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi berhasil ditandai sudah dibaca.',
        ]);
    }

    public function addresses(): JsonResponse
    {
        $user = auth('api')->user();

        $addresses = Address::query()
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Buku alamat mitra.',
            'total'   => $addresses->count(),
            'data'    => $addresses,
        ]);
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $data = $request->validate([
            'recipient_name'  => 'required|string|max:100',
            'recipient_phone' => 'nullable|string|max:20',
            'address_line'    => 'required|string',
            'city'            => 'nullable|string|max:100',
            'province'        => 'nullable|string|max:100',
            'postal_code'     => 'nullable|string|max:10',
            'label'           => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:100',
            'subdistrict'     => 'nullable|string|max:100',
            'district'        => 'nullable|string|max:100',
            'is_default'      => 'nullable|boolean',
        ]);

        $isDefault = (bool) ($data['is_default'] ?? false)
            || !Address::where('user_id', $user->id)->exists();

        $address = Address::create([
            'user_id'         => $user->id,
            'recipient_name'  => $data['recipient_name'],
            'recipient_phone' => $data['recipient_phone'] ?? '',
            'address_line'    => $data['address_line'],
            'city'            => $data['city'] ?? '',
            'province'        => $data['province'] ?? '',
            'postal_code'     => $data['postal_code'] ?? '',
            'label'           => $data['label'] ?? null,
            'email'           => $data['email'] ?? null,
            'subdistrict'     => $data['subdistrict'] ?? null,
            'district'        => $data['district'] ?? null,
            'is_default'      => $isDefault,
        ]);

        $this->applyDefaultAddress($user->id, $address, $isDefault);

        return response()->json([
            'success' => true,
            'message' => 'Alamat berhasil disimpan.',
            'data'    => $address->fresh(),
        ], 201);
    }

    public function updateAddress(Request $request, string $id): JsonResponse
    {
        $user = auth('api')->user();

        $address = Address::where('user_id', $user->id)->find($id);
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Alamat tidak ditemukan.',
            ], 404);
        }

        $data = $request->validate([
            'recipient_name'  => 'sometimes|required|string|max:100',
            'recipient_phone' => 'nullable|string|max:20',
            'address_line'    => 'sometimes|required|string',
            'city'            => 'nullable|string|max:100',
            'province'        => 'nullable|string|max:100',
            'postal_code'     => 'nullable|string|max:10',
            'label'           => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:100',
            'subdistrict'     => 'nullable|string|max:100',
            'district'        => 'nullable|string|max:100',
            'is_default'      => 'nullable|boolean',
        ]);

        $isDefault = array_key_exists('is_default', $data)
            ? (bool) $data['is_default']
            : (bool) $address->is_default;

        $address->update($data);
        $this->applyDefaultAddress($user->id, $address, $isDefault);

        return response()->json([
            'success' => true,
            'message' => 'Alamat berhasil diperbarui.',
            'data'    => $address->fresh(),
        ]);
    }

    public function destroyAddress(string $id): JsonResponse
    {
        $user = auth('api')->user();

        $address = Address::where('user_id', $user->id)->find($id);
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Alamat tidak ditemukan.',
            ], 404);
        }

        $wasDefault = (bool) $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $next = Address::where('user_id', $user->id)->orderBy('id')->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Alamat dihapus.',
        ]);
    }

    private function applyDefaultAddress(int $userId, Address $address, bool $isDefault): void
    {
        if ($isDefault) {
            Address::where('user_id', $userId)
                ->where('id', '!=', $address->id)
                ->update(['is_default' => false]);
        }

        if ((bool) $address->is_default !== $isDefault) {
            $address->update(['is_default' => $isDefault]);
        }
    }
}
