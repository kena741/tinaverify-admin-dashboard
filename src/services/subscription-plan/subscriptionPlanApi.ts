import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	SubscriptionPlanCreate,
	SubscriptionPlanOutput,
	SubscriptionPlanUpdate,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined &&
		accessToken !== null &&
		accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const subscriptionPlanApi = createApi({
	reducerPath: "subscriptionPlanApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["SubscriptionPlans"],
	endpoints: (builder) => ({
		/** `GET /api/v1/subscription-plan` */
		listSubscriptionPlans: builder.query<
			SubscriptionPlanOutput[],
			{ includeArchived?: boolean } | void
		>({
			query: (arg) => ({
				url: "/api/v1/subscription-plan",
				params: arg?.includeArchived ? { include_archived: true } : undefined,
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "SubscriptionPlans" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/subscription-plan/{subscription_plan_id}` */
		getSubscriptionPlan: builder.query<
			SubscriptionPlanOutput,
			{ subscriptionPlanId: string }
		>({
			query: ({ subscriptionPlanId }) => ({
				url: `/api/v1/subscription-plan/${subscriptionPlanId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { subscriptionPlanId }) => [
				{ type: "SubscriptionPlans" as const, id: subscriptionPlanId },
			],
		}),

		/** `POST /api/v1/subscription-plan` */
		createSubscriptionPlan: builder.mutation<
			SubscriptionPlanOutput,
			{ body: SubscriptionPlanCreate }
		>({
			query: ({ body }) => ({
				url: "/api/v1/subscription-plan",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "SubscriptionPlans" as const, id: "LIST" }],
		}),

		/** `PATCH /api/v1/subscription-plan/{subscription_plan_id}` */
		updateSubscriptionPlan: builder.mutation<
			SubscriptionPlanOutput,
			{ subscriptionPlanId: string; body: SubscriptionPlanUpdate }
		>({
			query: ({ subscriptionPlanId, body }) => ({
				url: `/api/v1/subscription-plan/${subscriptionPlanId}`,
				method: "PATCH",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, { subscriptionPlanId }) => [
				{ type: "SubscriptionPlans" as const, id: "LIST" },
				{ type: "SubscriptionPlans" as const, id: subscriptionPlanId },
			],
		}),

		/** `DELETE /api/v1/subscription-plan/{subscription_plan_id}` — archive plan */
		archiveSubscriptionPlan: builder.mutation<
			SubscriptionPlanOutput,
			{ subscriptionPlanId: string }
		>({
			query: ({ subscriptionPlanId }) => ({
				url: `/api/v1/subscription-plan/${subscriptionPlanId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { subscriptionPlanId }) => [
				{ type: "SubscriptionPlans" as const, id: "LIST" },
				{ type: "SubscriptionPlans" as const, id: subscriptionPlanId },
			],
		}),
	}),
});

export const {
	useListSubscriptionPlansQuery,
	useGetSubscriptionPlanQuery,
	useCreateSubscriptionPlanMutation,
	useUpdateSubscriptionPlanMutation,
	useArchiveSubscriptionPlanMutation,
} = subscriptionPlanApi;
