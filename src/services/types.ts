export type RegisterUserRequest = {
  phone_number: string;
  password: string;
  user_information: {
    first_name: string;
    last_name: string;
  };
  email?: string | null;
  username?: string | null;
};

export type UserOutput = {
  id: string;
  phone_number: string;
  username: string | null;
  email: string | null;
  is_superuser: boolean;
  is_active: boolean;
	role: string | null;
  user_information?: {
    first_name: string;
    last_name: string;
  } | null;
};

/** OpenAPI `UserInformationUpdateSchema` (partial update) */
export type UserInformationUpdateRequest = {
	first_name?: string | null;
	last_name?: string | null;
};

/** OpenAPI `UserUpdateSchema` — `PATCH /api/v1/users/{user_id}` */
export type UserUpdateRequest = {
	phone_number?: string | null;
	username?: string | null;
	email?: string | null;
	user_information?: UserInformationUpdateRequest | null;
};

/** OpenAPI `UserPasswordUpdateSchema` — `PATCH /api/v1/users/me/password` */
export type UserPasswordUpdateRequest = {
	old_password: string;
	new_password: string;
};

/** OpenAPI `UserAuthResponse` — `token_type` defaults to `"bearer"` on the server */
export type UserAuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  user: UserOutput;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type BusinessCreateRequest = {
  name: string;
  tin_number: string;
};

export type BusinessOutput = {
  id: string;
  name: string;
  tin_number: string;
  owner_id: string;
  is_active: boolean;
  is_archived: boolean;
};

export type BranchCreateRequest = {
  business_id: string;
  name: string;
  address?: string | null;
  is_head_quarter?: boolean;
};

/** OpenAPI `BranchUpdateSchema` — body for `PUT /api/v1/branches/{branch_id}` */
export type BranchUpdateRequest = {
  name?: string | null;
  address?: string | null;
  is_head_quarter?: boolean | null;
  is_archived?: boolean | null;
};

/** OpenAPI `BranchResponseSchema` */
export type BranchOutput = {
  id: string;
  name: string;
  business_id: string;
  is_head_quarter: boolean;
  address: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

/** OpenAPI `RoleOutputSchema` */
export type RoleOutput = {
  id: string;
  name: string;
};

/** OpenAPI `RoleCreateSchema` — `POST /api/v1/roles` */
export type RoleCreateRequest = {
	name: string;
};

/** OpenAPI `PermissionResponseSchema` */
export type PermissionOutput = {
	id: string;
	action: string;
};

/** OpenAPI `AssignPermissionSchema` — `POST /api/v1/roles/{role_id}/permissions` */
export type AssignPermissionRequest = {
	permission_ids: string[];
};

/** OpenAPI `EmployeeOutputSchema` */
export type EmployeeOutput = {
  id: string;
  user_id: string;
	employee_id: string;
  branch_id: string;
  role_id: string;
  is_active: boolean;
  user?: UserOutput | null;
  branch?: BranchOutput | null;
};

/** OpenAPI `CreateEmployeeUserRequest` */
export type CreateEmployeeUserRequest = {
  phone_number: string;
  role_id: string;
  branch_id: string;
  username?: string | null;
  email?: string | null;
};

/** OpenAPI `CreateEmployeeUserResponse` */
export type CreateEmployeeUserResponse = {
  phone_number: string;
  temporary_password: string;
  role_id: string;
  branch_id: string;
};


/** UI branch model; `restaurant_id` matches OpenAPI `business_id` for tenant scoping. */
export interface Branch {
	id: string;
	restaurant_id: string;
	name: string;
	address?: string | null;
	is_head_quarter: boolean;
	active: boolean;
	telebirr_merchant_id?: string;
	telebirr_app_key?: string;
	telebirr_public_key?: string;
	telebirr_shortcode?: string;
	created_at: string;
	updated_at: string;
}

export type MyBusinessRef = { id: string; name: string };

export function branchFromOutput(b: BranchOutput): Branch {
	return {
		id: b.id,
		restaurant_id: b.business_id,
		name: b.name,
		address: b.address,
		is_head_quarter: b.is_head_quarter,
		active: !b.is_archived,
		created_at: b.created_at,
		updated_at: b.updated_at,
	};
}

/** OpenAPI `MenuCategory` enum */
export type MenuCategoryEnum = "Food" | "Drink";

/** OpenAPI `MenuInputSchema` — `POST /api/v1/menus` */
export type MenuInputRequest = {
	branch_id: string;
	name: string;
	description?: string | null;
	price: number;
	currency: string;
	category: MenuCategoryEnum;
};

/** OpenAPI `MenuResponseSchema` */
export type MenuResponse = {
	id: string;
	name: string;
	description: string | null;
	price: number;
	currency: string;
	category: MenuCategoryEnum;
	branch_id: string;
	is_archived: boolean;
	created_at: string;
	updated_at: string;
};

/** OpenAPI `MenuUpdateSchema` — `PUT /api/v1/menus/{menu_id}` */
export type MenuUpdateRequest = {
	name?: string | null;
	description?: string | null;
	price?: number | null;
	currency?: string | null;
	category?: MenuCategoryEnum | null;
	is_archived?: boolean | null;
};

/** OpenAPI `BankNameEnum` */
export type BankNameEnum =
	| "CBE"
	| "DASHEN"
	| "AWASH"
	| "ABYSINIA"
	| "TELEBIRR"
	| "CBEBIRR";

/** OpenAPI `BankAccountCreateSchema` */
export type BankAccountCreateRequest = {
	business_id: string;
	bank_name: BankNameEnum;
	account_name: string;
	account_number: string;
};

/** OpenAPI `BankAccountResponseSchema` */
export type BankAccountResponse = {
	id: string;
	business_id: string;
	bank_name: BankNameEnum;
	account_name: string;
	account_number: string;
	is_archived: boolean;
};

/** OpenAPI `VerifiedTransactionOutputSchema` */
export type VerifiedTransactionOutput = {
	id: string;
	reference_number: string;
	business_id: string;
	amount: string;
	currency: string;
	bank_account_id?: string | null;
	sender_name?: string | null;
	sender_account?: string | null;
	receiver_name?: string | null;
	receiver_account?: string | null;
	status: string;
	error_message?: string | null;
	receipt_url?: string | null;
};

/** OpenAPI body for `PATCH /api/v1/transactions/{transaction_id}/status` */
export type UpdateTransactionStatusRequest = {
	status: "verified" | "failed";
};

/** OpenAPI `TableInputSchema` — `POST /api/v1/tables` */
export type TableInputRequest = {
	branch_id: string;
	name: string;
};

/** OpenAPI `TableResponseSchema` */
export type TableResponse = {
	id: string;
	name: string;
	branch_id: string;
	is_archived: boolean;
	created_at: string;
	updated_at: string;
};

/** OpenAPI `TableUpdateSchema` — `PUT /api/v1/tables/{table_id}` */
export type TableUpdateRequest = {
	name?: string | null;
	is_archived?: boolean | null;
};

/** OpenAPI `OrderStatus` enum */
export type OrderStatus = "pending" | "in_progress" | "completed" | "cancelled";

/** OpenAPI `OrderItemResponseSchema` */
export type OrderItemResponse = {
	id: string;
	order_id: string;
	menu_id: string;
	quantity: number;
	unit_price: number;
};

/** OpenAPI `OrderResponseSchema` */
export type OrderResponse = {
	id: string;
	table_id: string | null;
	transaction_id: string | null;
	created_by: string | null;
	status: OrderStatus;
	is_archived: boolean;
	items: OrderItemResponse[];
	created_at: string;
	updated_at: string;
};

/** OpenAPI `OrderTransactionSummaryResponse` */
export type OrderTransactionSummaryResponse = {
	order_id: string;
	transaction_id: string;
	amount: number;
};

/** OpenAPI `SubscriptionPlanOutputSchema` */
export type SubscriptionPlanOutput = {
	id: string;
	name: string;
	monthly_transaction_limit: number;
	price: string;
	duration_days: number;
	is_archived: boolean;
};

/** OpenAPI `SubscriptionPlanCreateSchema` — `POST /api/v1/subscription-plan` */
export type SubscriptionPlanCreate = {
	name: string;
	monthly_transaction_limit: number;
	price: number | string;
	duration_days?: number;
};

/** OpenAPI `SubscriptionPlanUpdateSchema` — `PATCH /api/v1/subscription-plan/{subscription_plan_id}` */
export type SubscriptionPlanUpdate = {
	name?: string | null;
	monthly_transaction_limit?: number | null;
	price?: number | string | null;
	duration_days?: number | null;
};

/** OpenAPI `SubscriptionOutputSchema` */
export type SubscriptionOutput = {
	id: string;
	business_id: string;
	plan_id: string;
	status: string;
	started_at?: string | null;
	ended_at?: string | null;
	chapa_transaction_reference?: string | null;
};

/** OpenAPI `SubscriptionCheckoutSchema` — `POST /api/v1/subscriptions/checkout` */
export type SubscriptionCheckoutRequest = {
	plan_id: string;
};

/** OpenAPI `SubscriptionCheckoutOutputSchema` */
export type SubscriptionCheckoutResponse = {
	checkout_url: string;
	tx_ref: string;
};

/** OpenAPI `SubscriptionCheckoutCustomSchema` — `POST /api/v1/subscriptions/checkout/custom` */
export type SubscriptionCheckoutCustomRequest = {
	credits: number | string;
	amount: number | string;
};

/** OpenAPI `SubscriptionGrantCreditsSchema` — `POST /api/v1/subscriptions/grant-credits` */
export type SubscriptionGrantCreditsRequest = {
	credits: number;
};

/** OpenAPI `UsageOutputSchema` — `GET /api/v1/subscriptions/usage` */
export type UsageOutput = {
	subscription_id: string;
	credits_limit: number;
	credits_used: number;
	remaining_credits: number;
};

/** OpenAPI `CampaignCreateSchema` — `POST /api/v1/admin/referrals/campaigns` */
export type CampaignCreateRequest = {
	code: string;
	description: string;
};

/** OpenAPI `CampaignOutputSchema` */
export type CampaignOutput = {
	code: string;
	description: string;
	is_active: boolean;
};

/** OpenAPI `ReferralPerformanceSchema` — `GET /api/v1/admin/referrals/performance` */
export type ReferralPerformance = {
	code: string;
	description: string;
	is_active: boolean;
	total_signups: number;
	active_subscriptions: number;
};

/** OpenAPI `DeactivateBusinessRequest` — `POST /api/v1/business/{business_id}/deactivate` */
export type DeactivateBusinessRequest = {
	is_active: boolean;
};

/** OpenAPI `UpdateEmployeeRoleRequest` — `PUT /api/v1/business/{business_id}/employees/{employee_id}` */
export type UpdateEmployeeRoleRequest = {
	role_id: string;
};

/** OpenAPI `PermissionCreateSchema` — `POST /api/v1/permissions/{permission_id}` */
export type PermissionCreateRequest = {
	action: string;
};
