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
  user_information?: {
    first_name: string;
    last_name: string;
  } | null;
};

export type UserAuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
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

/** OpenAPI `EmployeeOutputSchema` */
export type EmployeeOutput = {
  id: string;
  user_id: string;
  branch_id: string;
  role_id: string;
  is_active: boolean;
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
