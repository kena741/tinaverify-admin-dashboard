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

