"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { fetchBranches } from "../../../features/branches/branchesSlice";
import { fetchRestaurants } from "../../../features/restaurants/restaurantsSlice";
import { fetchStaff, createStaff, assignStaffToBranch } from "../../../features/staff/staffSlice";

export default function StaffPage() {
  const dispatch = useAppDispatch();
  const { branches, loading: branchesLoading } = useAppSelector((state: any) => state.branches);
  const { restaurants } = useAppSelector((state: any) => state.restaurants);
  const { staff, loading: staffLoading, error: staffError } = useAppSelector((state: any) => state.staff);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    password: "",
  });
  const [formError, setFormError] = useState<string>("");

  useEffect(() => {
    dispatch(fetchRestaurants());
    dispatch(fetchStaff());
  }, [dispatch]);

  useEffect(() => {
    if (restaurants.length === 0) return;
    dispatch(fetchBranches());
  }, [dispatch, restaurants]);

  // Create a map of restaurant IDs to names for lookup
  const restaurantMap = useMemo(() => {
    const map: Record<string, string> = {};
    restaurants.forEach((restaurant: any) => {
      map[restaurant.id] = restaurant.name;
    });
    return map;
  }, [restaurants]);

  // Get restaurant_id from selected branch
  const selectedBranchData = useMemo(() => {
    if (!selectedBranch) return null;
    return branches.find((branch: any) => branch.id === selectedBranch);
  }, [branches, selectedBranch]);

  // Get branch names for each staff member
  const getStaffBranches = useMemo(() => {
    const branchMap: Record<string, string> = {};
    branches.forEach((branch: any) => {
      branchMap[branch.id] = branch.name;
    });
    return branchMap;
  }, [branches]);

  // Format staff data with branch information
  const formattedStaff = useMemo(() => {
    return staff.map((member: any) => {
      const branchName = member.branch_id ? getStaffBranches[member.branch_id] : null;
      const restaurantName = member.restaurant_id ? restaurantMap[member.restaurant_id] : null;
      return {
        ...member,
        branchName: branchName || "Unassigned",
        restaurantName: restaurantName || "Unknown",
      };
    });
  }, [staff, getStaffBranches, restaurantMap]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    return formattedStaff.filter((member: any) => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        member.phone.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = 
        roleFilter === "all" || 
        (roleFilter === "admin" && member.role === "ADMIN") ||
        (roleFilter === "waiter" && member.role === "WAITER");
      // Status filter - all staff are considered active for now
      const matchesStatus = statusFilter === "all" || statusFilter === "active";
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [formattedStaff, searchTerm, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage staff members and their assignments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Staff</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="waiter">Waiter</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {staffError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{staffError}</p>
        </div>
      )}

      {/* Staff table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {staffLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-sm text-gray-500">Loading staff...</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No staff members found.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member: any) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold text-sm">
                              {member.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            {member.email && <div className="text-sm text-gray-500">{member.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            member.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {member.role === "ADMIN" ? "Admin" : "Waiter"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.restaurantName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.branchName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.phone}</div>
                        {member.email && <div className="text-sm text-gray-500">{member.email}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button className="text-purple-600 hover:text-purple-900">Assign Branch</button>
                          <button className="text-red-600 hover:text-red-900">Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add New Staff Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedBranch("");
                  setFormData({ name: "", role: "", email: "", phone: "", password: "" });
                  setFormError("");
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{formError}</p>
              </div>
            )}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setFormError("");
                
                if (!formData.name || !formData.role || !formData.phone || !formData.password) {
                  setFormError("Please fill in all required fields");
                  return;
                }

                // For WAITER role, email or phone is required
                if (formData.role === 'WAITER' && !formData.email && !formData.phone) {
                  setFormError("Email or phone number is required for waiter accounts");
                  return;
                }

                try {
                  // Create staff member
                  // For WAITER role, this will also create Supabase Auth account and platform_admin record
                  const staffResult = await dispatch(createStaff({
                    name: formData.name,
                    phone: formData.phone,
                    role: formData.role as 'WAITER' | 'ADMIN',
                    email: formData.email || undefined,
                    password: formData.password,
                    restaurant_id: selectedBranchData?.restaurant_id || undefined,
                    branch_id: selectedBranch || undefined,
                  })).unwrap();

                  // Assign to selected branch
                  if (selectedBranch && staffResult.id) {
                    await dispatch(assignStaffToBranch({
                      staffId: staffResult.id,
                      branchId: selectedBranch,
                    }));
                  }

                  // Reset form and close modal
                  setFormData({ name: "", role: "", email: "", phone: "", password: "" });
                  setSelectedBranch("");
                  setFormError("");
                  setShowAddModal(false);
                } catch (error: any) {
                  console.error("Failed to create staff:", error);
                  // Extract error message from Redux rejected action
                  const errorMessage = error?.payload || error?.message || "Failed to create staff member. Please try again.";
                  setFormError(errorMessage);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="WAITER">Waiter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+251 911 123 456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password (minimum 6 characters)"
                />
                <p className="mt-1 text-xs text-gray-500">Required: Set a password for staff login (minimum 6 characters)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Branch</label>
                {branchesLoading ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50">
                    Loading branches...
                  </div>
                ) : branches.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50">
                    No branches available
                  </div>
                ) : (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch: any) => {
                      const restaurantName = restaurantMap[branch.restaurant_id] || "Unknown";
                      return (
                        <option key={branch.id} value={branch.id}>
                          {restaurantName} - {branch.name}
                        </option>
                      );
                    })}
                  </select>
                )}
                <p className="mt-1 text-xs text-gray-500">Select a branch to assign this staff member</p>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedBranch("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

