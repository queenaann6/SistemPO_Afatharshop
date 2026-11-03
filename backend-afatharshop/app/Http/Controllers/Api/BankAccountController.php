<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;

class BankAccountController extends Controller
{
    public function index()
    {
        $accounts = BankAccount::where('is_active', true)
            ->where(function ($q) {
                $q->where('type', 'public')
                  ->orWhereNull('type')
                  ->orWhere('type', '');
            })
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'total'   => $accounts->count(),
            'data'    => $accounts,
        ], 200);
    }
}
