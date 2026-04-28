import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../../supabaseClient";
import { backendFetchJson } from "../../services/backendFetch";
import type {
	CreateEmployeeUserRequest,
	CreateEmployeeUserResponse,
	EmployeeOutput,
	RoleOutput,
} from "../../services/types";

export interface Staff {
	id: string;
	user_id?: string; // Foreign key to auth.users.id (for waiters)
	name: string;
	phone: string;
	email?: string;
	role: "WAITER" | "ADMIN";
	restaurant_id?: string;
	branch_id?: string;
	created_at: string;
	updated_at: string;
}

export interface StaffBranch {
	id: string;
	staff_id: string;
	branch_id: string;
}

interface StaffState {
	staff: Staff[];
	selectedStaff: Staff | null;
	staffBranches: StaffBranch[];
	loading: boolean;
	error: string | null;
	/** REST: roles for selected business (`GET /api/v1/business/roles`). */
	businessRoles: RoleOutput[];
	rolesLoading: boolean;
	/** REST: employees for selected business (`GET /api/v1/business/{id}/employees`). */
	apiEmployees: EmployeeOutput[];
	employeesBusinessId: string | null;
	employeesLoading: boolean;
}

const initialState: StaffState = {
	staff: [],
	selectedStaff: null,
	staffBranches: [],
	loading: false,
	error: null,
	businessRoles: [],
	rolesLoading: false,
	apiEmployees: [],
	employeesBusinessId: null,
	employeesLoading: false,
};

/** `GET /api/v1/business/roles?business_id=` */
export const fetchBusinessRoles = createAsyncThunk(
	"staff/fetchBusinessRoles",
	async (businessId: string) => {
		const roles = await backendFetchJson<RoleOutput[]>(
			`/api/v1/business/roles?business_id=${encodeURIComponent(businessId)}`,
			{ method: "GET" },
		);
		return { businessId, roles };
	},
);

/** `GET /api/v1/business/{business_id}/employees` */
export const fetchBusinessEmployees = createAsyncThunk(
	"staff/fetchBusinessEmployees",
	async (businessId: string) => {
		const employees = await backendFetchJson<EmployeeOutput[]>(
			`/api/v1/business/${businessId}/employees`,
			{ method: "GET" },
		);
		return { businessId, employees };
	},
);

/** `POST /api/v1/business/employees/create-user` */
export const createEmployeeUser = createAsyncThunk(
	"staff/createEmployeeUser",
	async (body: CreateEmployeeUserRequest, { rejectWithValue }) => {
		try {
			return await backendFetchJson<CreateEmployeeUserResponse>(
				"/api/v1/business/employees/create-user",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				},
			);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Failed to create employee";
			return rejectWithValue(msg);
		}
	},
);

// Async thunks
export const fetchStaff = createAsyncThunk(
	"staff/fetchAll",
	async (filters?: { branchId?: string; restaurantId?: string }) => {
		if (filters?.branchId) {
			// Fetch staff assigned to a specific branch
			const { data, error } = await supabase
				.from("staff_branches")
				.select("staff_id, staff(*)")
				.eq("branch_id", filters.branchId);

			if (error) throw new Error(error.message);
			return (data?.map((item: any) => item.staff).filter(Boolean) ||
				[]) as Staff[];
		} else if (filters?.restaurantId) {
			// Fetch staff by restaurant_id
			const { data, error } = await supabase
				.from("staff")
				.select("*")
				.eq("restaurant_id", filters.restaurantId)
				.order("created_at", { ascending: false });

			if (error) throw new Error(error.message);
			return data as Staff[];
		} else {
			// Fetch all staff
			const { data, error } = await supabase
				.from("staff")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw new Error(error.message);
			return data as Staff[];
		}
	},
);

export const fetchStaffById = createAsyncThunk(
	"staff/fetchById",
	async (id: string) => {
		const { data, error } = await supabase
			.from("staff")
			.select("*")
			.eq("id", id)
			.single();

		if (error) throw new Error(error.message);
		return data as Staff;
	},
);

export const createStaff = createAsyncThunk(
	"staff/create",
	async (
		data: {
			name: string;
			phone: string;
			role: "WAITER" | "ADMIN";
			email?: string;
			password: string;
			restaurant_id?: string;
			branch_id?: string;
		},
		{ rejectWithValue },
	) => {
		try {
			let authUserId: string | null = null;

			// Create Supabase Auth account for both WAITER and ADMIN
			// Use email if provided, otherwise create email from phone
			const phoneEmail =
				data.phone.replace(/[\s\+\-\(\)]/g, "") + "@staff.local";
			const authEmail = data.email || phoneEmail;

			if (!data.email && !data.phone) {
				throw new Error("Email or phone number is required");
			}

			const { data: authData, error: authError } = await supabase.auth.signUp({
				email: authEmail,
				password: data.password,
				options: {
					data: {
						name: data.name,
						phone: data.phone, // Store phone in user_metadata
					},
				},
			});

			if (authError) {
				// Provide more helpful error messages based on Supabase error codes
				let errorMessage = "Failed to create auth account";

				if (authError.message) {
					const message = authError.message.toLowerCase();

					// Check for duplicate email/phone errors
					if (
						message.includes("already registered") ||
						message.includes("user already registered") ||
						message.includes("email address is already in use") ||
						message.includes("phone number is already in use") ||
						authError.status === 422 || // Unprocessable Entity
						authError.code === "user_already_exists"
					) {
						errorMessage =
							"This email/phone is already registered. Please use a different one.";
					} else if (message.includes("invalid email")) {
						errorMessage = "Invalid email address. Please enter a valid email.";
					} else if (message.includes("password")) {
						errorMessage =
							"Password does not meet requirements. Please use a stronger password.";
					} else {
						// Use the actual Supabase error message
						errorMessage = authError.message;
					}
				}

				throw new Error(errorMessage);
			}

			if (!authData.user) {
				throw new Error("User creation failed - no user data returned");
			}

			authUserId = authData.user.id;

			// Update user's phone number in auth.users table via API route
			// Supabase Auth doesn't populate the phone column when using email-based signup
			// We need to call a server-side API route to update it using admin API
			try {
				const response = await fetch("/api/auth/update-phone", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userId: authUserId,
						phone: data.phone,
					}),
				});

				if (response.ok) {
					console.log("Phone number updated in auth.users table:", data.phone);
				} else {
					const errorData = await response.json();
					console.warn(
						"Could not update phone in auth.users table:",
						errorData.error,
					);
					// Continue anyway - phone is still in user_metadata
				}
			} catch (updateError: any) {
				// If update fails, continue - phone is still in user_metadata
				console.warn(
					"Could not update phone in auth.users table:",
					updateError.message,
				);
			}

			console.log("User created with phone:", {
				userId: authUserId,
				email: authEmail,
				phone: data.phone,
				phoneInMetadata: authData.user.user_metadata?.phone,
			});

			// If role is WAITER, add to staff table only
			if (data.role === "WAITER") {
				const { data: newStaff, error: staffError } = await supabase
					.from("staff")
					.insert([
						{
							user_id: authUserId,
							name: data.name,
							phone: data.phone,
							role: data.role,
							email: data.email || null,
							restaurant_id: data.restaurant_id || null,
							branch_id: data.branch_id || null,
						},
					])
					.select()
					.single();

				if (staffError) {
					// Rollback: try to delete auth user if staff creation fails
					try {
						const adminClient = supabase;
						if (adminClient && (adminClient as any).auth?.admin) {
							await (adminClient as any).auth.admin.deleteUser(authUserId);
						}
					} catch (rollbackError) {
						console.warn(
							"Could not rollback auth user creation. Manual cleanup may be required:",
							authUserId,
						);
					}

					// Provide better error messages from Supabase
					let errorMessage = "Failed to create staff record";
					if (staffError.message) {
						const message = staffError.message.toLowerCase();
						if (
							message.includes("duplicate") ||
							message.includes("unique") ||
							message.includes("already exists")
						) {
							errorMessage =
								"A staff member with this information already exists. Please check the details.";
						} else {
							errorMessage = staffError.message;
						}
					}

					throw new Error(errorMessage);
				}

				console.log("Waiter created in staff table:", {
					userId: authUserId,
					staffId: newStaff.id,
					email: authEmail,
				});

				return { ...newStaff, user_id: authUserId } as Staff;
			}

			// If role is ADMIN, add to platform_admins table only
			if (data.role === "ADMIN") {
				const { data: adminData, error: adminError } = await supabase
					.from("platform_admins")
					.insert([
						{
							user_id: authUserId,
							name: data.name,
							email: authEmail,
							role: "BRANCH_ADMIN", // Staff admins get BRANCH_ADMIN role
						},
					])
					.select()
					.single();

				if (adminError) {
					// Rollback: try to delete auth user if admin creation fails
					try {
						const adminClient = supabase;
						if (adminClient && (adminClient as any).auth?.admin) {
							await (adminClient as any).auth.admin.deleteUser(authUserId);
						}
					} catch (rollbackError) {
						console.warn(
							"Could not rollback auth user creation. Manual cleanup may be required:",
							authUserId,
						);
					}

					// Provide better error messages from Supabase
					let errorMessage = "Failed to create platform admin record";
					if (adminError.message) {
						const message = adminError.message.toLowerCase();
						if (
							message.includes("duplicate") ||
							message.includes("unique") ||
							message.includes("already exists")
						) {
							errorMessage =
								"An admin with this email/user ID already exists. Please use a different email.";
						} else {
							errorMessage = adminError.message;
						}
					}

					throw new Error(errorMessage);
				}

				console.log("Admin created in platform_admins table:", {
					userId: authUserId,
					adminId: adminData.id,
					email: authEmail,
				});

				// Return a staff-like object for consistency (even though it's in platform_admins)
				return {
					id: adminData.id || "",
					name: adminData.name,
					phone: data.phone,
					email: adminData.email,
					role: "ADMIN" as const,
					user_id: authUserId,
					created_at: adminData.created_at,
					updated_at: adminData.updated_at,
				} as Staff;
			}

			throw new Error("Invalid role specified");
		} catch (error: any) {
			// Extract error message properly
			let errorMessage = "Failed to create staff";

			if (error?.message) {
				errorMessage = error.message;
			} else if (typeof error === "string") {
				errorMessage = error;
			} else if (error?.error?.message) {
				errorMessage = error.error.message;
			}

			console.error("Staff creation error:", error);
			return rejectWithValue(errorMessage);
		}
	},
);

export const updateStaff = createAsyncThunk(
	"staff/update",
	async ({ id, data }: { id: string; data: Partial<Staff> }) => {
		const { data: updatedStaff, error } = await supabase
			.from("staff")
			.update({ ...data, updated_at: new Date().toISOString() })
			.eq("id", id)
			.select()
			.single();

		if (error) throw new Error(error.message);
		return updatedStaff as Staff;
	},
);

export const deleteStaff = createAsyncThunk(
	"staff/delete",
	async (id: string) => {
		const { error } = await supabase.from("staff").delete().eq("id", id);

		if (error) throw new Error(error.message);
		return id;
	},
);

// Staff-Branch assignments
export const assignStaffToBranch = createAsyncThunk(
	"staff/assignToBranch",
	async ({ staffId, branchId }: { staffId: string; branchId: string }) => {
		const { data, error } = await supabase
			.from("staff_branches")
			.insert([{ staff_id: staffId, branch_id: branchId }])
			.select()
			.single();

		if (error) throw new Error(error.message);
		return data as StaffBranch;
	},
);

export const removeStaffFromBranch = createAsyncThunk(
	"staff/removeFromBranch",
	async ({ staffId, branchId }: { staffId: string; branchId: string }) => {
		const { error } = await supabase
			.from("staff_branches")
			.delete()
			.eq("staff_id", staffId)
			.eq("branch_id", branchId);

		if (error) throw new Error(error.message);
		return { staffId, branchId };
	},
);

export const fetchStaffBranches = createAsyncThunk(
	"staff/fetchBranches",
	async (staffId: string) => {
		const { data, error } = await supabase
			.from("staff_branches")
			.select("*")
			.eq("staff_id", staffId);

		if (error) throw new Error(error.message);
		return data as StaffBranch[];
	},
);

const staffSlice = createSlice({
	name: "staff",
	initialState,
	reducers: {
		setSelectedStaff: (state, action: PayloadAction<Staff | null>) => {
			state.selectedStaff = action.payload;
		},
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch all
			.addCase(fetchStaff.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchStaff.fulfilled, (state, action) => {
				state.loading = false;
				state.staff = action.payload;
			})
			.addCase(fetchStaff.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch staff";
			})
			// Fetch by ID
			.addCase(fetchStaffById.fulfilled, (state, action) => {
				state.selectedStaff = action.payload;
			})
			// Create
			.addCase(createStaff.fulfilled, (state, action) => {
				state.staff.push(action.payload);
			})
			// Update
			.addCase(updateStaff.fulfilled, (state, action) => {
				const index = state.staff.findIndex((s) => s.id === action.payload.id);
				if (index !== -1) {
					state.staff[index] = action.payload;
				}
				if (state.selectedStaff?.id === action.payload.id) {
					state.selectedStaff = action.payload;
				}
			})
			// Delete
			.addCase(deleteStaff.fulfilled, (state, action) => {
				state.staff = state.staff.filter((s) => s.id !== action.payload);
				if (state.selectedStaff?.id === action.payload) {
					state.selectedStaff = null;
				}
			})
			// Assign to branch
			.addCase(assignStaffToBranch.fulfilled, (state, action) => {
				state.staffBranches.push(action.payload);
			})
			// Remove from branch
			.addCase(removeStaffFromBranch.fulfilled, (state, action) => {
				state.staffBranches = state.staffBranches.filter(
					(sb) =>
						!(
							sb.staff_id === action.payload.staffId &&
							sb.branch_id === action.payload.branchId
						),
				);
			})
			// Fetch staff branches
			.addCase(fetchStaffBranches.fulfilled, (state, action) => {
				state.staffBranches = action.payload;
			})
			.addCase(fetchBusinessRoles.pending, (state) => {
				state.rolesLoading = true;
			})
			.addCase(fetchBusinessRoles.fulfilled, (state, action) => {
				state.rolesLoading = false;
				state.businessRoles = action.payload.roles;
			})
			.addCase(fetchBusinessRoles.rejected, (state) => {
				state.rolesLoading = false;
			})
			.addCase(fetchBusinessEmployees.pending, (state) => {
				state.employeesLoading = true;
				state.error = null;
			})
			.addCase(fetchBusinessEmployees.fulfilled, (state, action) => {
				state.employeesLoading = false;
				state.apiEmployees = action.payload.employees;
				state.employeesBusinessId = action.payload.businessId;
			})
			.addCase(fetchBusinessEmployees.rejected, (state, action) => {
				state.employeesLoading = false;
				state.error = action.error.message || "Failed to load employees";
			})
			.addCase(createEmployeeUser.fulfilled, (state) => {
				state.error = null;
			})
			.addCase(createEmployeeUser.rejected, (state, action) => {
				state.error =
					(action.payload as string) ||
					action.error.message ||
					"Failed to create employee";
			});
	},
});

export const { setSelectedStaff, clearError } = staffSlice.actions;
export default staffSlice.reducer;
