"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { fetchRestaurantById } from "../../../../features/restaurants/restaurantsSlice";
import { fetchBranches } from "../../../../features/branches/branchesSlice";
import { fetchStaff } from "../../../../features/staff/staffSlice";

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedRestaurant, loading, error } = useAppSelector((state: any) => state.restaurants);
  const { branches, loading: branchesLoading } = useAppSelector((state: any) => state.branches);
  const { staff: restaurantStaff, loading: staffLoading } = useAppSelector((state: any) => state.staff);
  const [activeTab, setActiveTab] = useState("overview");

  // Unwrap params Promise using React.use()
  const { id } = use(params);

  // Fetch restaurant by ID and its branches on component mount
  useEffect(() => {
    if (id) {
      dispatch(fetchRestaurantById(id));
      dispatch(fetchBranches(id)); // Fetch branches for this restaurant
      dispatch(fetchStaff({ restaurantId: id })); // Fetch staff for this restaurant
    }
  }, [dispatch, id]);

  const restaurant = selectedRestaurant || {
    id: id,
    name: "Loading...",
    status: "ACTIVE",
  };

  // Filter branches for this restaurant (in case all branches are fetched)
  const restaurantBranches = branches.filter((branch: any) => branch.restaurant_id === id);

  // Get branch name for staff member
  const getBranchName = (branchId?: string) => {
    if (!branchId) return "Unassigned";
    const branch = restaurantBranches.find((b: any) => b.id === branchId);
    return branch?.name || "Unknown Branch";
  };

  const recentTransactions = [
    { id: "TXN-001", branch: "Bole Branch", table: 5, waiter: "John Doe", amount: 450, status: "success", timestamp: "2024-01-15 14:30" },
    { id: "TXN-002", branch: "Bishoftu Branch", table: 8, waiter: "Meron Tadesse", amount: 680, status: "success", timestamp: "2024-01-15 14:25" },
    { id: "TXN-003", branch: "Meskel Square Branch", table: 12, waiter: "Daniel Tesfaye", amount: 320, status: "success", timestamp: "2024-01-15 14:20" },
    { id: "TXN-004", branch: "Bole Branch", table: 3, waiter: "John Doe", amount: 950, status: "success", timestamp: "2024-01-15 14:15" },
  ];

  // Mock analytics data (these would come from payments/transactions in a real app)
  const analytics = {
    totalRevenue: 0, // Would be calculated from payments
    totalTransactions: 0, // Would be calculated from payments
    avgSuccessRate: 0, // Would be calculated from payments
    todayRevenue: 0,
    todayTransactions: 0,
    monthlyGrowth: 0,
  };

  const monthlyRevenue = [
    { month: "Jan", revenue: 2100000 },
    { month: "Feb", revenue: 2350000 },
    { month: "Mar", revenue: 2800000 },
    { month: "Apr", revenue: 3200000 },
    { month: "May", revenue: 3500000 },
    { month: "Jun", revenue: 3800000 },
  ];

  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(d => d.revenue));

  const hourlyRevenue = [
    { hour: "8AM", revenue: 12000 },
    { hour: "10AM", revenue: 18000 },
    { hour: "12PM", revenue: 35000 },
    { hour: "2PM", revenue: 28000 },
    { hour: "4PM", revenue: 22000 },
    { hour: "6PM", revenue: 45000 },
    { hour: "8PM", revenue: 38000 },
  ];

  const maxHourlyRevenue = Math.max(...hourlyRevenue.map(d => d.revenue));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading restaurant details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            {error || "Restaurant not found"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-blue-600 font-bold text-2xl">
                {restaurant.name ? restaurant.name.substring(0, 2).toUpperCase() : "R"}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    restaurant.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {restaurant.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-gray-500">
                  Created: {new Date(restaurant.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Edit Restaurant
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Add Branch
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">ETB {analytics.totalRevenue.toLocaleString()}</p>
              <p className="mt-1 text-xs text-green-600">+{analytics.monthlyGrowth}% this month</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.totalTransactions.toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">All time</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.avgSuccessRate.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-green-600">Excellent</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">ETB {analytics.todayRevenue.toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">{analytics.todayTransactions} transactions</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("branches")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "branches"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Branches ({restaurantBranches.length})
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "staff"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Staff ({restaurantStaff.length})
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "analytics"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "transactions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Transactions
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Restaurant Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Restaurant Name</p>
                      <p className="text-base font-medium text-gray-900">{restaurant.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact Email</p>
                      <p className="text-base font-medium text-gray-900">{restaurant.contactEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact Phone</p>
                      <p className="text-base font-medium text-gray-900">{restaurant.contactPhone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="text-base font-medium text-gray-900">{restaurant.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="text-base font-medium text-gray-900">
                        {restaurant.created_at ? new Date(restaurant.created_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Total Branches</p>
                        <p className="text-base font-semibold text-gray-900">{restaurantBranches.length}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Total Staff</p>
                        <p className="text-base font-semibold text-gray-900">{restaurant.totalStaff}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Payment Success Rate</p>
                        <p className="text-base font-semibold text-gray-900">{analytics.avgSuccessRate.toFixed(1)}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${analytics.avgSuccessRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {recentTransactions.slice(0, 5).map((txn) => (
                      <div key={txn.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{txn.id}</p>
                            <p className="text-xs text-gray-500">{txn.branch} - Table {txn.table}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">ETB {txn.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{txn.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Branches Tab */}
          {activeTab === "branches" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Branches</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                  Add Branch
                </button>
              </div>
              {branchesLoading ? (
                <div className="text-center p-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading branches...</p>
                </div>
              ) : restaurantBranches.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No branches found for this restaurant.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restaurantBranches.map((branch: any) => (
                  <div key={branch.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{branch.name}</h4>
                        {branch.address && (
                          <p className="text-sm text-gray-500 mt-1">{branch.address}</p>
                        )}
                      </div>
                      <Link
                        href={`/admin/branches/${branch.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2"
                      >
                        View
                      </Link>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600">Address</p>
                        <p className="text-sm font-medium text-gray-900">{branch.address || "No address provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Created</p>
                        <p className="text-sm font-medium text-gray-900">
                          {branch.created_at ? new Date(branch.created_at).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      {branch.telebirr_merchant_id && (
                        <div>
                          <p className="text-xs text-gray-600">Telebirr</p>
                          <p className="text-xs font-medium text-green-600">Connected</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center space-x-2">
                      <Link
                        href={`/admin/branches/${branch.id}`}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
                      >
                        View Details
                      </Link>
                      <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === "staff" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Staff Members</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                  Add Staff
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <p className="mt-2 text-sm text-gray-500">Loading staff...</p>
                        </td>
                      </tr>
                    ) : restaurantStaff.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No staff members found for this restaurant.
                        </td>
                      </tr>
                    ) : (
                      restaurantStaff.map((member: any) => (
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
                                <div className="text-sm text-gray-500">{member.email || member.phone}</div>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getBranchName(member.branch_id)}
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
                              <button className="text-gray-600 hover:text-gray-900">View</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Monthly Revenue Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Revenue Trend</h3>
                <div className="flex items-end justify-between h-64 space-x-2">
                  {monthlyRevenue.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                        <div
                          className="w-full bg-linear-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-colors cursor-pointer"
                          style={{ height: `${(item.revenue / maxMonthlyRevenue) * 100}%` }}
                          title={`${item.month}: ETB ${item.revenue.toLocaleString()}`}
                        />
                      </div>
                      <span className="mt-2 text-xs text-gray-600">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly Revenue Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Today's Revenue by Hour</h3>
                <div className="flex items-end justify-between h-48 space-x-2">
                  {hourlyRevenue.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                        <div
                          className="w-full bg-linear-to-t from-green-500 to-green-400 rounded-t-lg hover:from-green-600 hover:to-green-500 transition-colors cursor-pointer"
                          style={{ height: `${(item.revenue / maxHourlyRevenue) * 100}%` }}
                          title={`${item.hour}: ETB ${item.revenue.toLocaleString()}`}
                        />
                      </div>
                      <span className="mt-2 text-xs text-gray-600">{item.hour}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue by Branch */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue by Branch</h3>
                <div className="space-y-4">
                  {branches.map((branch: any, index: number) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                        <span className="text-sm font-semibold text-gray-900">ETB {branch.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-500 h-2.5 rounded-full"
                          style={{ width: `${(branch.revenue / analytics.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Rate by Branch */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Success Rate by Branch</h3>
                <div className="space-y-4">
                  {branches.map((branch: any, index: number) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                        <span className="text-sm font-semibold text-gray-900">{branch.successRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            branch.successRate >= 97
                              ? "bg-green-500"
                              : branch.successRate >= 95
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${branch.successRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Branches</option>
                    {restaurantBranches.map((branch: any) => (
                      <option key={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                    Export
                  </button>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.branch}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Table {txn.table}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.waiter}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">ETB {txn.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              txn.status === "success"
                                ? "bg-green-100 text-green-800"
                                : txn.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {txn.status === "success" ? "Success" : txn.status === "pending" ? "Pending" : "Failed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{txn.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

