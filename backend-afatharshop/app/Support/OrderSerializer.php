<?php

namespace App\Support;

use App\Models\Order;
use App\Models\Payment;

/**
 * Serializer tunggal untuk payload Order + Items + Invoice + Payments
 * agar response Mitra (/orders) dan Manajemen (/management/orders) identik.
 */
class OrderSerializer
{
    public static function payload(Order $order): array
    {
        $order->loadMissing([
            'user',
            'address',
            'items.variant.product.brand',
            'items.variant.product.batch',
            'items.address',
            'invoice.installments',
            'invoice.payments',
        ]);

        $invoice = $order->invoice;
        $items = $order->items;

        $itemsSubtotalSum = round((float) $items->sum('subtotal'), 2);
        $orderSubtotal = round((float) $order->subtotal, 2);
        $itemsAlreadyStoreNet = $items->count() > 0 && abs($itemsSubtotalSum - $orderSubtotal) <= 1.5;

        return [
            'id'                => $order->id,
            'user_id'           => $order->user_id,
            'address_id'        => $order->address_id,
            'order_number'      => $order->order_number,
            'status'            => $order->status,
            'marketing_status'  => $order->marketing_status,
            'marketing_by'      => $order->marketing_by,
            'marketing_at'      => optional($order->marketing_at)->toIso8601String(),
            'marketing_note'    => $order->marketing_note,
            'production_status' => $order->production_status,
            'ready_at'          => optional($order->ready_at)->toIso8601String(),
            'courier_name'      => $order->courier_name,
            'tracking_number'   => $order->tracking_number,
            'notes'             => $order->notes,
            'is_split_address'  => (bool) $order->is_split_address,
            'subtotal'          => (float) $order->subtotal,
            'shipping_cost'     => (float) $order->shipping_cost,
            'weight_kg'         => $order->weight_kg !== null ? (float) $order->weight_kg : null,
            'shipping_note'     => $order->shipping_note,
            'ongkir_at'         => optional($order->ongkir_at)->toIso8601String(),
            'shipped_at'        => optional($order->shipped_at)->toIso8601String(),
            'received_at'       => optional($order->received_at)->toIso8601String(),
            'total_amount'      => (float) $order->total_amount,
            'fee_mitra_total'   => (float) $items->sum('discount_nominal'),
            'addon_total'       => (float) $items->sum('addon_nominal'),
            'ordered_at'        => optional($order->ordered_at)->toIso8601String(),
            'created_at'        => optional($order->created_at)->toIso8601String(),
            'updated_at'        => optional($order->updated_at)->toIso8601String(),
            'deleted_at'        => optional($order->deleted_at)->toIso8601String(),
            'deleted_by'        => $order->deleted_by,
            'delete_reason'     => $order->delete_reason,
            'user'              => $order->user ? [
                'id'     => $order->user->id,
                'name'   => $order->user->nama,
                'nama'   => $order->user->nama,
                'email'  => $order->user->email,
                'level'  => $order->user->level,
                'role'   => $order->user->role,
                'phone'  => $order->user->phone,
                'city'   => $order->user->city,
                'avatar' => $order->user->avatar,
            ] : null,
            'address'           => $order->address,
            'items'             => $items->map(function ($item) use ($itemsAlreadyStoreNet) {
                $qty = max(1, (int) $item->quantity);
                $unitPrice = (float) $item->unit_price;
                $fee = (float) $item->fee;
                $discount = (float) $item->discount_nominal > 0 ? (float) $item->discount_nominal : max(0, -$fee);
                $addon = (float) $item->addon_nominal > 0 ? (float) $item->addon_nominal : max(0, $fee);
                $storedSub = round((float) $item->subtotal, 2);

                $netSubtotal = $itemsAlreadyStoreNet
                    ? $storedSub
                    : max(0, round(($unitPrice * $qty) - $discount + $addon, 2));

                return [
                    'id'                 => $item->id,
                    'address_id'         => $item->address_id,
                    'address'            => $item->address,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity'           => $item->quantity,
                    'unit_price'         => $unitPrice,
                    'fee'                => $fee,
                    'discount_nominal'   => $discount,
                    'addon_nominal'      => $addon,
                    'subtotal'           => $storedSub,
                    'net_subtotal'       => $netSubtotal,
                    'splits'             => $item->splits,
                    'variant'            => $item->variant ? [
                        'id'      => $item->variant->id,
                        'model'   => $item->variant->model,
                        'size'    => $item->variant->size,
                        'color'   => $item->variant->color,
                        'sku'     => $item->variant->sku,
                        'stock'   => $item->variant->stock,
                        'price'   => (float) $item->variant->price,
                        'product' => $item->variant->product ? [
                            'id'                 => $item->variant->product->id,
                            'brand_id'           => $item->variant->product->brand_id,
                            'batch_id'           => $item->variant->product->batch_id,
                            'name'               => $item->variant->product->name,
                            'price'              => (float) $item->variant->product->price,
                            'image'              => $item->variant->product->image,
                            'status'             => $item->variant->product->status,
                            'min_dp_percent'     => $item->variant->product->min_dp_percent,
                            'tutup_po'           => optional($item->variant->product->tutup_po)->toIso8601String(),
                            'estimated_shipment' => optional($item->variant->product->estimated_shipment)->toDateString(),
                            'brand'              => $item->variant->product->brand ? [
                                'id'   => $item->variant->product->brand->id,
                                'name' => $item->variant->product->brand->name,
                                'logo' => $item->variant->product->brand->logo,
                            ] : null,
                            'batch'              => $item->variant->product->batch ? [
                                'id'                 => $item->variant->product->batch->id,
                                'name'               => $item->variant->product->batch->name,
                                'status'             => $item->variant->product->batch->status,
                                'close_date'         => optional($item->variant->product->batch->close_date)->toIso8601String(),
                                'estimated_shipment' => optional($item->variant->product->batch->estimated_shipment)->toDateString(),
                            ] : null,
                        ] : null,
                    ] : null,
                ];
            })->values(),
            'invoice'           => $invoice ? [
                'id'                 => $invoice->id,
                'invoice_number'     => $invoice->invoice_number,
                'total_amount'       => (float) $invoice->total_amount,
                'paid_amount'        => (float) $invoice->paid_amount,
                'outstanding_amount' => (float) $invoice->outstanding_amount,
                'status'             => $invoice->status,
                'due_at'             => optional($invoice->due_at)->toIso8601String(),
                'installments'       => $invoice->installments->map(fn ($installment) => [
                    'id'              => $installment->id,
                    'type'            => $installment->type,
                    'sequence_number' => $installment->sequence_number,
                    'amount'          => (float) $installment->amount,
                    'paid_amount'     => (float) $installment->paid_amount,
                    'status'          => $installment->status,
                    'due_at'          => optional($installment->due_at)->toIso8601String(),
                ])->values(),
                'payments'           => $invoice->payments->map(fn (Payment $payment) => [
                    'id'               => $payment->id,
                    'installment_id'   => $payment->installment_id,
                    'amount'           => (float) $payment->amount,
                    'status'           => $payment->status,
                    'proof_url'        => $payment->proof_url,
                    'method'           => $payment->method,
                    'bank_name'        => $payment->bank_name,
                    'account_number'   => $payment->account_number,
                    'note'             => $payment->note,
                    'rejection_reason' => $payment->rejection_reason,
                    'uploaded_at'      => optional($payment->uploaded_at)->toIso8601String(),
                    'verified_at'      => optional($payment->verified_at)->toIso8601String(),
                ])->values(),
            ] : null,
        ];
    }

    /**
     * Hitung line item secara seragam untuk pembuatan order.
     */
    public static function resolveLineAmounts(array $item): array
    {
        $qty = max(1, (int) ($item['quantity'] ?? $item['qty'] ?? 1));
        $unitPrice = round((float) ($item['unit_price'] ?? $item['price'] ?? 0), 2);
        $hasDiscount = array_key_exists('discount_nominal', $item) || array_key_exists('discountNominal', $item);
        $rawFee = (float) ($item['fee'] ?? $item['feeNominal'] ?? 0);
        $discount = max(0, round((float) ($item['discount_nominal'] ?? $item['discountNominal'] ?? ($rawFee < 0 ? abs($rawFee) : 0)), 2));
        $addon = max(0, round((float) ($item['addon_nominal'] ?? $item['addonNominal'] ?? $item['addon'] ?? 0), 2));
        $fee = round($addon - $discount, 2);

        if (isset($item['subtotal']) && is_numeric($item['subtotal']) && (float) $item['subtotal'] >= 0) {
            $subtotal = round((float) $item['subtotal'], 2);
        } elseif ($hasDiscount || $rawFee < 0) {
            $subtotal = max(0, round(($unitPrice * $qty) - $discount + $addon, 2));
        } else {
            $subtotal = round(($unitPrice * $qty) + $addon, 2);
        }

        return [
            'quantity'         => $qty,
            'unit_price'       => $unitPrice,
            'fee'              => $fee,
            'discount_nominal' => $discount,
            'addon_nominal'    => $addon,
            'subtotal'         => $subtotal,
        ];
    }
}
