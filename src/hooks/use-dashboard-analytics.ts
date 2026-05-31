"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppDispatch } from "@/store/hooks";
import { useAuth } from "@/store/useAuth";
import { useListMyBusinessesQuery } from "@/services/auth/authApi";
import { useListAllBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import { transactionsApi } from "@/services/transactions/transactionsApi";
import type { BusinessOutput, VerifiedTransactionOutput } from "@/services/types";
import {
	type BuiltInAnalyticsPreset,
	computeDashboardAnalytics,
	isoRangeForAnalyticsPreset,
} from "@/lib/analytics";

const MAX_BUSINESSES_TO_FETCH = 25;

export function useDashboardAnalytics(preset: BuiltInAnalyticsPreset) {
	const dispatch = useAppDispatch();
	const { isSystemAdmin } = useAuth();
	const systemAdmin = isSystemAdmin();

	const { data: allBusinesses, isLoading: allBusinessesLoading } =
		useListAllBusinessesQuery(undefined, { skip: !systemAdmin });

	const { data: myBusinesses, isLoading: myBusinessesLoading } =
		useListMyBusinessesQuery(undefined, { skip: systemAdmin });

	const businesses = useMemo(
		() => (systemAdmin ? allBusinesses : myBusinesses) ?? [],
		[systemAdmin, allBusinesses, myBusinesses],
	);

	const activeBusinesses = useMemo(
		() => businesses.filter((b) => b.is_active && !b.is_archived),
		[businesses],
	);

	const { startDate, endDate } = useMemo(
		() => isoRangeForAnalyticsPreset(preset),
		[preset],
	);

	const [transactions, setTransactions] = useState<VerifiedTransactionOutput[]>(
		[],
	);
	const [txLoading, setTxLoading] = useState(false);
	const [txError, setTxError] = useState<string | null>(null);

	useEffect(() => {
		if (businesses.length === 0) {
			setTransactions([]);
			setTxError(null);
			setTxLoading(false);
			return;
		}

		let cancelled = false;

		async function load() {
			setTxLoading(true);
			setTxError(null);

			try {
				const targets = businesses.slice(0, MAX_BUSINESSES_TO_FETCH);
				const results = await Promise.all(
					targets.map((b: BusinessOutput) =>
						dispatch(
							transactionsApi.endpoints.listTransactionsByBusiness.initiate(
								{
									businessId: b.id,
									startDate,
									endDate,
								},
								{ forceRefetch: true },
							),
						).unwrap(),
					),
				);

				if (!cancelled) {
					setTransactions(results.flat());
				}
			} catch {
				if (!cancelled) {
					setTxError("Failed to load transaction analytics.");
					setTransactions([]);
				}
			} finally {
				if (!cancelled) setTxLoading(false);
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [businesses, dispatch, startDate, endDate]);

	const analytics = useMemo(
		() => computeDashboardAnalytics(transactions, businesses),
		[transactions, businesses],
	);

	const businessesLoading = systemAdmin
		? allBusinessesLoading
		: myBusinessesLoading;

	return {
		analytics,
		activeBusinessCount: activeBusinesses.length,
		totalBusinessCount: businesses.length,
		isLoading: businessesLoading || txLoading,
		error: txError,
		truncatedBusinessFetch: businesses.length > MAX_BUSINESSES_TO_FETCH,
	};
}
