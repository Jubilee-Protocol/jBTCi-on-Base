'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * usePaymasterDeposit Hook
 * 
 * This hook enables gas-free deposits using Coinbase Paymaster for Smart Wallet users.
 * Falls back to regular deposits for non-Smart Wallet users (MetaMask, Rainbow, etc.)
 * 
 * NOTE: This file uses experimental wagmi hooks. Type assertions are used to avoid
 * TypeScript errors with incomplete type definitions.
 */

import { useMemo, useState, useCallback } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useCapabilities, useWriteContracts, useCallsStatus } from 'wagmi/experimental';
import { parseUnits } from 'viem';
import { base } from 'wagmi/chains';

// Coinbase Paymaster URL for Base Mainnet
const PAYMASTER_URL = 'https://api.developer.coinbase.com/rpc/v1/base/He4qXOZocLjfeXoi7qgRSdbeEZ7mqXHs';

// Contract addresses
const STRATEGY_ADDRESS = '0x27143095013184e718f92330C32A3D2eE9974053' as const;
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as const;

// Simplified ABIs for the calls we need
const DEPOSIT_ABI = [
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'assets', type: 'uint256' },
            { name: 'receiver', type: 'address' }
        ],
        outputs: [{ name: 'shares', type: 'uint256' }]
    }
] as const;

const APPROVE_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    }
] as const;

interface UsePaymasterDepositResult {
    isPaymasterSupported: boolean;
    isGasFree: boolean;
    executeDeposit: (amount: string, needsApproval: boolean) => void;
    executeApproval: () => void;
    isLoading: boolean;
    isSuccess: boolean;
    error: Error | null;
    txHash: string | null;
    reset: () => void;
}

/**
 * Hook for gas-free deposits using Coinbase Paymaster
 * Falls back to regular deposits for non-Smart Wallet users
 */
export function usePaymasterDeposit(): UsePaymasterDepositResult {
    const { address } = useAccount();
    const chainId = useChainId();
    const [callsId, setCallsId] = useState<string | null>(null);

    // Check if wallet supports paymaster (Coinbase Smart Wallet)
    const { data: capabilities } = useCapabilities({
        account: address,
    } as any);

    // Check if paymaster is supported for current chain
    const isPaymasterSupported = useMemo(() => {
        if (!capabilities || !chainId) return false;
        const chainCapabilities = (capabilities as any)[chainId];
        return chainCapabilities?.paymasterService?.supported === true;
    }, [capabilities, chainId]);

    // Only gas-free on Base mainnet with supported wallet
    const isGasFree = isPaymasterSupported && chainId === base.id;

    // Paymaster capabilities for sponsored transactions
    const paymasterCapabilities = useMemo(() => {
        if (!isGasFree) return {};
        return {
            paymasterService: {
                url: PAYMASTER_URL,
            },
        };
    }, [isGasFree]);

    // Sponsored transaction hook (for Smart Wallets)
    const {
        writeContracts,
        isPending: isSponsoredPending,
        error: sponsoredError,
        reset: resetSponsored,
    } = useWriteContracts({
        mutation: {
            onSuccess: (id: string) => {
                setCallsId(id);
            },
        },
    } as any);

    // Regular transaction hooks (fallback for non-Smart Wallets)
    const {
        writeContract: regularWrite,
        data: regularHash,
        isPending: isRegularPending,
        error: regularError,
        reset: resetRegular,
    } = useWriteContract();

    // Status for sponsored transactions
    const { data: callsStatus } = useCallsStatus({
        id: callsId || undefined,
        query: {
            enabled: !!callsId,
            refetchInterval: 1000,
        },
    } as any);

    // Wait for regular transaction
    const {
        isLoading: isRegularConfirming,
        isSuccess: isRegularSuccess,
    } = useWaitForTransactionReceipt({
        hash: regularHash,
    });

    // Execute deposit (with optional approval batching for Smart Wallets)
    const executeDeposit = useCallback((amount: string, needsApproval: boolean) => {
        if (!address) return;

        const amountWei = parseUnits(amount, 8);
        const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

        if (isGasFree) {
            // Sponsored transaction - can batch approve + deposit
            const contracts = needsApproval
                ? [
                    {
                        address: CBBTC_ADDRESS,
                        abi: APPROVE_ABI,
                        functionName: 'approve',
                        args: [STRATEGY_ADDRESS, MAX_UINT256],
                    },
                    {
                        address: STRATEGY_ADDRESS,
                        abi: DEPOSIT_ABI,
                        functionName: 'deposit',
                        args: [amountWei, address],
                    },
                ]
                : [
                    {
                        address: STRATEGY_ADDRESS,
                        abi: DEPOSIT_ABI,
                        functionName: 'deposit',
                        args: [amountWei, address],
                    },
                ];

            (writeContracts as any)({
                contracts,
                capabilities: paymasterCapabilities,
            });
        } else {
            // Regular transaction - deposit only (approval handled separately)
            regularWrite({
                address: STRATEGY_ADDRESS,
                abi: DEPOSIT_ABI,
                functionName: 'deposit',
                args: [amountWei, address],
            } as any);
        }
    }, [address, isGasFree, paymasterCapabilities, writeContracts, regularWrite]);

    // Execute approval (for non-Smart Wallet users)
    const executeApproval = useCallback(() => {
        const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

        regularWrite({
            address: CBBTC_ADDRESS,
            abi: APPROVE_ABI,
            functionName: 'approve',
            args: [STRATEGY_ADDRESS, MAX_UINT256],
        } as any);
    }, [regularWrite]);

    // Combined loading state
    const isLoading = isSponsoredPending || isRegularPending || isRegularConfirming ||
        ((callsStatus as any)?.status === 'PENDING');

    // Combined success state
    const isSuccess = isRegularSuccess || (callsStatus as any)?.status === 'CONFIRMED';

    // Combined error
    const error = sponsoredError || regularError || null;

    // Get transaction hash
    const txHash = useMemo(() => {
        if (regularHash) return regularHash;
        if ((callsStatus as any)?.receipts?.[0]?.transactionHash) {
            return (callsStatus as any).receipts[0].transactionHash;
        }
        return null;
    }, [regularHash, callsStatus]);

    // Reset function
    const reset = useCallback(() => {
        resetSponsored();
        resetRegular();
        setCallsId(null);
    }, [resetSponsored, resetRegular]);

    return {
        isPaymasterSupported,
        isGasFree,
        executeDeposit,
        executeApproval,
        isLoading,
        isSuccess,
        error,
        txHash,
        reset,
    };
}
