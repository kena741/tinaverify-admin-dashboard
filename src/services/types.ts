type UUID = string;

// -----------------------------
// Users
// -----------------------------

/** OpenAPI `UserInformationInputSchema` */
export type UserInformationInput = {
	first_name: string;
	last_name: string;
};

/** OpenAPI `UserInformationOutputSchema` */
export type UserInformationOutput = {
	first_name: string;
	last_name: string;
};

/** OpenAPI `UserInformationUpdateSchema` (partial update) */
export type UserInformationUpdateRequest = {
	first_name?: string | null;
	last_name?: string | null;
};

/** OpenAPI `UserInputSchema` — body for `POST /api/v1/users` */
export type RegisterUserRequest = {
	phone_number: string;
	password: string;
	username?: string | null;
	email?: string | null;
	user_information?: UserInformationInput | null;
	referral_code?: string | null;
};

/** OpenAPI `UserUpdateSchema` — body for `PATCH /api/v1/users/{user_id}` */
export type UserUpdateRequest = {
	phone_number?: string | null;
	username?: string | null;
	email?: string | null;
	user_information?: UserInformationUpdateRequest | null;
};

/** OpenAPI `UserPasswordUpdateSchema` — body for `PATCH /api/v1/users/me/password` */
export type UserPasswordUpdateRequest = {
	old_password: string;
	new_password: string;
};

/** OpenAPI `ForgotPasswordRequest` — body for `POST /api/v1/users/forgot-password` */
export type ForgotPasswordRequest = {
	phone_number: string;
};

/** OpenAPI `UserOutputSchema` */
export type UserOutput = {
	id: UUID;
	phone_number: string;
	username: string | null;
	email: string | null;
	is_superuser: boolean;
	is_active: boolean;
	role: string | null;
	user_information?: UserInformationOutput | null;
};

/** OpenAPI `UserAuthResponse` — `token_type` defaults to `"bearer"` on the server */
export type UserAuthResponse = {
	access_token: string;
	refresh_token: string;
	token_type?: string;
	user: UserOutput;
};

/** OpenAPI `Body_login_api_v1_users_login_post` (x-www-form-urlencoded) */
export type LoginRequest = {
	username: string;
	password: string;
	grant_type?: "password" | null;
	scope?: string;
	client_id?: string | null;
	client_secret?: string | null;
};

// -----------------------------
// Business / branches
// -----------------------------

/** OpenAPI `BusinessCreateSchema` — body for `POST /api/v1/business` */
export type BusinessCreateRequest = {
	name: string;
	tin_number: string;
};

/** OpenAPI `BusinessOutputSchema` */
export type BusinessOutput = {
	id: UUID;
	name: string;
	tin_number: string;
	owner_id: UUID;
	is_active: boolean;
	is_archived: boolean;
};

/** OpenAPI `BranchCreateSchema` — body for `POST /api/v1/branches` */
export type BranchCreateRequest = {
	business_id: UUID;
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
	id: UUID;
	name: string;
	business_id: UUID;
	is_head_quarter: boolean;
	address: string | null;
	is_archived: boolean;
	created_at: string;
	updated_at: string;
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

// -----------------------------
// Bank accounts
// -----------------------------

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
	business_id: UUID;
	bank_name: BankNameEnum;
	account_name: string;
	account_number: string;
};

/** OpenAPI `BankAccountUpdateSchema` */
export type BankAccountUpdateRequest = {
	bank_name?: BankNameEnum | null;
	account_name?: string | null;
	account_number?: string | null;
};

/** OpenAPI `BankAccountResponseSchema` */
export type BankAccountResponse = {
	id: UUID;
	business_id: UUID;
	bank_name: BankNameEnum;
	account_name: string;
	account_number: string;
	is_archived: boolean;
};

// -----------------------------
// Employees
// -----------------------------

/** OpenAPI `CreateEmployeeUserRequest` */
export type CreateEmployeeUserRequest = {
	business_id: UUID;
	phone_number: string;
	role_id: UUID;
	branch_id: UUID;
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

/** OpenAPI `UpdateEmployeeRequest` — body for `PUT /api/v1/business/{business_id}/employees/{employee_id}` */
export type UpdateEmployeeRequest = {
	role_id?: UUID | null;
	branch_id?: UUID | null;
	phone_number?: string | null;
	email?: string | null;
	username?: string | null;
};

/** OpenAPI `EmployeeOutputSchema` */
export type EmployeeOutput = {
	id: UUID;
	user_id: UUID;
	employee_id: UUID;
	business_id: UUID;
	branch_id?: UUID | null;
	role_id: UUID;
	is_active: boolean;
	user?: UserOutput | null;
	branch?: BranchOutput | null;
};

// -----------------------------
// Roles / permissions
// -----------------------------

/** OpenAPI `RoleCreateSchema` — body for `POST /api/v1/roles` */
export type RoleCreateRequest = {
	name: string;
};

/** OpenAPI `RoleResponseSchema` */
export type RoleOutput = {
	id: UUID;
	name: string;
};

/** OpenAPI `PermissionCreateSchema` — body for `POST /api/v1/permissions` */
export type PermissionCreateRequest = {
	action: string;
};

/** OpenAPI `PermissionResponseSchema` */
export type PermissionOutput = {
	id: UUID;
	action: string;
};

/** OpenAPI `AssignPermissionSchema` — body for `POST /api/v1/roles/{role_id}/permissions` */
export type AssignPermissionRequest = {
	permission_ids: UUID[];
};

// -----------------------------
// Subscriptions
// -----------------------------

/** OpenAPI `SubscriptionPlanOutputSchema` */
export type SubscriptionPlanOutput = {
	id: UUID;
	name: string;
	monthly_transaction_limit: number;
	price: string;
	duration_days: number;
	is_archived: boolean;
};

/** OpenAPI `SubscriptionPlanCreateSchema` — body for `POST /api/v1/subscription-plan` */
export type SubscriptionPlanCreate = {
	name: string;
	monthly_transaction_limit: number;
	price: number | string;
	duration_days?: number;
};

/** OpenAPI `SubscriptionPlanUpdateSchema` — body for `PATCH /api/v1/subscription-plan/{subscription_plan_id}` */
export type SubscriptionPlanUpdate = {
	name?: string | null;
	monthly_transaction_limit?: number | null;
	price?: number | string | null;
	duration_days?: number | null;
};

/** OpenAPI `SubscriptionCheckoutSchema` — body for `POST /api/v1/subscriptions/checkout` */
export type SubscriptionCheckoutRequest = {
	plan_id: UUID;
};

/** OpenAPI `CustomCheckoutSchema` — body for `POST /api/v1/subscriptions/checkout/custom` */
export type CustomCheckoutRequest = {
	amount?: number | null;
	credits?: number | null;
};

/** OpenAPI `SubscriptionCheckoutOutputSchema` */
export type SubscriptionCheckoutResponse = {
	checkout_url: string;
	tx_ref: string;
};

/** OpenAPI `AdminGrantCreditsSchema` — body for `POST /api/v1/subscriptions/grant-credits` */
export type AdminGrantCreditsRequest = {
	credits: number;
};

/** OpenAPI `SubscriptionOutputSchema` */
export type SubscriptionOutput = {
	id: UUID;
	business_id: UUID;
	plan_id?: UUID | null;
	status: string;
	started_at?: string | null;
	ended_at?: string | null;
	chapa_transaction_reference?: string | null;
};

/** OpenAPI `SubscriptionStatus` */
export type SubscriptionStatus =
	| "pending"
	| "active"
	| "expired"
	| "cancelled"
	| "insufficient_credits";

/** OpenAPI `SubscriptionBusinessOutputSchema` */
export type SubscriptionBusinessOutput = {
	id: UUID;
	name: string;
	tin_number: string;
};

/** OpenAPI `AdminSubscriptionOutputSchema` — `GET /api/v1/subscriptions/transactions` */
export type AdminSubscriptionOutput = {
	id: UUID;
	business_id: UUID;
	plan_id?: UUID | null;
	status: string;
	amount?: number | null;
	credits_limit: number;
	started_at?: string | null;
	ended_at?: string | null;
	chapa_transaction_reference?: string | null;
	created_at?: string | null;
	business?: SubscriptionBusinessOutput | null;
	plan?: SubscriptionPlanOutput | null;
};

/** OpenAPI `UsageOutputSchema` */
export type UsageOutput = {
	subscription_id: UUID;
	credits_limit: number;
	credits_used: number;
	remaining_credits: number;
};

/** OpenAPI `ExchangeRateOutputSchema` */
export type ExchangeRateOutput = {
	credits_per_etb: number;
};

/** OpenAPI `ExchangeRateUpdateSchema` */
export type ExchangeRateUpdateRequest = {
	credits_per_etb: number;
};

// -----------------------------
// Transactions / verification
// -----------------------------

/** OpenAPI `VerifiedTransactionOutputSchema` */
export type VerifiedTransactionOutput = {
	id: UUID;
	reference_number: string;
	business_id: UUID;
	amount: string;
	currency: string;
	bank_account_id?: UUID | null;
	sender_name?: string | null;
	sender_account?: string | null;
	receiver_name?: string | null;
	receiver_account?: string | null;
	status: string;
	error_message?: string | null;
	receipt_url?: string | null;
};

/** OpenAPI `Body_update_transaction_status_api_v1_transactions__transaction_id__status_patch` */
export type UpdateTransactionStatusRequest = {
	status: "verified" | "failed";
};

// Note: verify endpoints accept multipart/form-data; actual HTTP usage should send FormData.
/** OpenAPI `Body_verify_cbe_endpoint_api_v1_verify_cbe_post` */
export type VerifyCbeRequest = {
	business_id: UUID;
	file: File;
	sender_account_number: string;
};

/** OpenAPI `Body_verify_cbebirr_endpoint_api_v1_verify_cbebirr_post` */
export type VerifyCbebirrRequest = {
	business_id: UUID;
	file: File;
};

/** OpenAPI `Body_verify_awash_endpoint_api_v1_verify_awash_post` */
export type VerifyAwashRequest = {
	business_id: UUID;
	file: File;
	account_number: string;
};

/** OpenAPI `Body_verify_dashen_endpoint_api_v1_verify_dashen_post` */
export type VerifyDashenRequest = {
	business_id: UUID;
	file: File;
};

/** OpenAPI `Body_verify_abysinya_endpoint_api_v1_verify_abysinya_post` */
export type VerifyAbysinyaRequest = {
	business_id: UUID;
	file: File;
	sender_account_number: string;
};

/** OpenAPI `Body_verify_telebirr_endpoint_api_v1_verify_telebirr_post` */
export type VerifyTelebirrRequest = {
	business_id: UUID;
	file: File;
};

// -----------------------------
// Referrals
// -----------------------------

/** OpenAPI `CampaignCreateSchema` — body for `POST /api/v1/admin/referrals/campaigns` */
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

/** OpenAPI `ReferralPerformanceSchema` */
export type ReferralPerformance = {
	code: string;
	description: string;
	is_active: boolean;
	total_signups: number;
	active_subscriptions: number;
};

/** OpenAPI commission rate response — `GET/PUT /api/v1/admin/referrals/commission-rate` */
export type CommissionRateOutput = {
	commission_rate: number;
};

/** OpenAPI commission rate request body */
export type CommissionRateUpdateRequest = {
	commission_rate: number;
};

// -----------------------------
// SMS (GeezSMS)
// -----------------------------

/** Body for `POST /api/v1/sms/geezsms/send` */
export type SendCustomSmsRequest = {
	phone: string;
	message: string;
};

/** Response from custom SMS send */
export type SendCustomSmsResponse = {
	status?: string;
	message?: string;
	api_log_id?: string;
};

// -----------------------------
// Analytics
// -----------------------------

/** `GET /api/v1/analytics/summary` — platform KPIs (admin only). */
export type AnalyticsRevenueOutput = {
	daily: string | number;
	weekly: string | number;
	monthly: string | number;
	/** Platform lifetime paid subscription revenue. */
	all_time?: string | number;
	/** Revenue for the requested `start_date` / `end_date` range. */
	custom: string | number;
};

export type AnalyticsTopPlanOutput = {
	plan_id?: UUID | null;
	plan_name?: string | null;
	subscription_count: number;
};

export type AnalyticsSummaryOutput = {
	revenue: AnalyticsRevenueOutput;
	total_paying_businesses: number | string;
	total_businesses: number | string;
	top_plan: AnalyticsTopPlanOutput | null;
	total_verified_transactions: number | string;
	/** Sum of verified transaction amounts for the selected period. */
	total_verified_amount: string | number;
	total_failed_transactions: number | string;
};

// -----------------------------
// Payments / gateways
// -----------------------------

export type PaymentGatewayState = {
	enabled: boolean;
};

export type PaymentGatewaysOutput = {
	chapa: PaymentGatewayState;
	telebirr: PaymentGatewayState;
};

export type PaymentGatewaysUpdateRequest = {
	chapa?: PaymentGatewayState;
	telebirr?: PaymentGatewayState;
};

// -----------------------------
// Banners
// -----------------------------

/** `GET/POST/PATCH /api/v1/banners` */
export type BannerOutput = {
	id: UUID;
	/** Public URL of the banner image (set by server after upload). */
	image_url: string;
	/** Internal storage object path. */
	image_path: string;
	/** Where users go when they tap the banner. */
	redirect_url?: string | null;
	is_active: boolean;
	click_count: number;
	created_at: string;
	updated_at: string;
};

export type CreateBannerRequest = {
	/** Tap destination (`multipart` field: `redirect_url`). */
	redirect_url: string;
	is_active: boolean;
	/** Banner image file (`multipart` field: `image`). Server sets `image_url`. */
	image: File;
};

/** `PATCH /api/v1/banners/{banner_id}` */
export type UpdateBannerRequest = {
	redirect_url?: string;
	is_active?: boolean;
	image?: File;
};

// -----------------------------
// Misc
// -----------------------------

/** OpenAPI `DeactivateBusinessRequest` — body for `PATCH /api/v1/business/{business_id}/deactivate` */
export type DeactivateBusinessRequest = {
	is_active: boolean;
};

/** OpenAPI `ValidationError` */
export type ValidationError = {
	loc: Array<string | number>;
	msg: string;
	type: string;
	input?: unknown;
	ctx?: Record<string, unknown>;
};

/** OpenAPI `HTTPValidationError` */
export type HTTPValidationError = {
	detail?: ValidationError[];
};
