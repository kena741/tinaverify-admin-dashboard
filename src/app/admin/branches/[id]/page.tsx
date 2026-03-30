"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { fetchBranchById } from "../../../../features/branches/branchesSlice";
import { fetchRestaurants } from "../../../../features/restaurants/restaurantsSlice";
import { fetchTables, createTable } from "../../../../features/tables/tablesSlice";
import { fetchStaff, createStaff, assignStaffToBranch } from "../../../../features/staff/staffSlice";

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedBranch, loading, error } = useAppSelector((state: any) => state.branches);
  const { restaurants } = useAppSelector((state: any) => state.restaurants);
  const { tables: branchTables, loading: tablesLoading } = useAppSelector((state: any) => state.tables);
  const { staff: branchStaff, loading: staffLoading } = useAppSelector((state: any) => state.staff);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [tableFormData, setTableFormData] = useState({
    table_number: "",
    capacity: 4,
  });
  const [staffFormData, setStaffFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    password: "",
  });
  const [staffFormError, setStaffFormError] = useState<string>("");

  // Unwrap params Promise using React.use()
  const { id } = use(params);

  // Fetch branch, restaurants, tables, and staff on component mount
  useEffect(() => {
    if (id) {
      dispatch(fetchBranchById(id));
      dispatch(fetchRestaurants());
      dispatch(fetchTables(id)); // Fetch tables for this branch
      dispatch(fetchStaff({ branchId: id })); // Fetch staff for this branch
    }
  }, [dispatch, id]);

  // Get restaurant name for this branch
  const restaurantName = useMemo(() => {
    if (!selectedBranch || !restaurants.length) return "Loading...";
    const restaurant = restaurants.find((r: any) => r.id === selectedBranch.restaurant_id);
    return restaurant?.name || "Unknown Restaurant";
  }, [selectedBranch, restaurants]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading branch details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-600">
        <p className="text-lg mb-4">Error: {error}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  // No branch found
  if (!selectedBranch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-600">
        <p className="text-lg mb-4">Branch not found.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Use real branch data
  const branch = {
    id: selectedBranch.id,
    name: selectedBranch.name,
    restaurant: restaurantName,
    restaurant_id: selectedBranch.restaurant_id,
    address: selectedBranch.address || "No address provided",
    active: selectedBranch.active,
    telebirrStatus: selectedBranch.telebirr_merchant_id ? "connected" : "not_connected",
    createdAt: selectedBranch.created_at ? new Date(selectedBranch.created_at).toLocaleDateString() : "N/A",
  };

  // Handle add table form submission
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableFormData.table_number || !tableFormData.capacity) {
      return;
    }

    try {
      await dispatch(createTable({
        branch_id: id,
        table_number: tableFormData.table_number,
        capacity: tableFormData.capacity,
        status: 'FREE',
      })).unwrap();
      
      // Reset form and close modal
      setTableFormData({ table_number: "", capacity: 4 });
      setShowAddTableModal(false);
    } catch (error) {
      console.error("Failed to create table:", error);
    }
  };

  // Map table status to display format
  const getTableStatusDisplay = (status: string) => {
    switch (status) {
      case "FREE":
        return "available";
      case "ASSIGNED":
        return "occupied";
      case "PAID":
        return "paid";
      default:
        return status.toLowerCase();
    }
  };


  const recentTransactions = [
    { id: "TXN-001", table: 1, waiter: "John Doe", amount: 450, status: "success", timestamp: "2024-01-15 14:30", telebirrId: "TB-123456" },
    { id: "TXN-002", table: 5, waiter: "John Doe", amount: 680, status: "success", timestamp: "2024-01-15 14:25", telebirrId: "TB-123457" },
    { id: "TXN-003", table: 7, waiter: "Meron Tadesse", amount: 320, status: "success", timestamp: "2024-01-15 14:20", telebirrId: "TB-123458" },
    { id: "TXN-004", table: 1, waiter: "John Doe", amount: 950, status: "success", timestamp: "2024-01-15 14:15", telebirrId: "TB-123459" },
    { id: "TXN-005", table: 5, waiter: "John Doe", amount: 1200, status: "failed", timestamp: "2024-01-15 14:10", telebirrId: "TB-123460" },
  ];

  const analytics = {
    totalRevenue: 1250000,
    totalTransactions: 2847,
    successRate: 98.5,
    todayRevenue: 125000,
    todayTransactions: 247,
    avgTransactionValue: 439,
    monthlyGrowth: 12.5,
    occupiedTables: branchTables.filter((t: any) => t.status === "ASSIGNED").length,
    availableTables: branchTables.filter((t: any) => t.status === "FREE").length,
  };

  const dailyRevenue = [
    { day: "Mon", revenue: 45000 },
    { day: "Tue", revenue: 52000 },
    { day: "Wed", revenue: 48000 },
    { day: "Thu", revenue: 61000 },
    { day: "Fri", revenue: 75000 },
    { day: "Sat", revenue: 89000 },
    { day: "Sun", revenue: 92000 },
  ];

  const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.revenue));

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

  const paymentMethods = [
    { method: "Telebirr", count: 2347, percentage: 82.4, revenue: 1030000 },
    { method: "Cash", count: 450, percentage: 15.8, revenue: 195000 },
    { method: "Other", count: 50, percentage: 1.8, revenue: 25000 },
  ];

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
      case "ASSIGNED":
        return "bg-red-100 text-red-800 border-red-200";
      case "reserved":
      case "PAID":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "available":
      case "FREE":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{branch.name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <Link href={`/admin/restaurants/${branch.restaurant_id}`} className="text-sm text-blue-600 hover:text-blue-700">
                  {branch.restaurant}
                </Link>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    branch.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {branch.active ? "Active" : "Inactive"}
                </span>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    branch.telebirrStatus === "connected"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  Telebirr {branch.telebirrStatus === "connected" ? "Connected" : "Not Connected"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Edit Branch
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Generate QR Code
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
              <p className="mt-1 text-xs text-gray-500">Avg: ETB {analytics.avgTransactionValue}</p>
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
              <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.successRate}%</p>
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
              <p className="text-sm font-medium text-gray-600">Table Status</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {analytics.occupiedTables}/{branchTables.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">{analytics.availableTables} available</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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
              onClick={() => setActiveTab("tables")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "tables"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tables ({branchTables.length})
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "staff"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Staff ({branchStaff.length})
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
              onClick={() => setActiveTab("settings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Branch Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Branch Name</p>
                      <p className="text-base font-medium text-gray-900">{branch.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Restaurant</p>
                      <Link href={`/admin/restaurants/${branch.restaurant_id}`} className="text-base font-medium text-blue-600 hover:text-blue-700">
                        {branch.restaurant}
                      </Link>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="text-base font-medium text-gray-900">{branch.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="text-base font-medium text-gray-900">{branch.createdAt}</p>
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Total Tables</p>
                        <p className="text-base font-semibold text-gray-900">{branchTables.length}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Occupied Tables</p>
                        <p className="text-base font-semibold text-gray-900">
                          {analytics.occupiedTables} / {branchTables.length}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${branchTables.length > 0 ? (analytics.occupiedTables / branchTables.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Payment Success Rate</p>
                        <p className="text-base font-semibold text-gray-900">{analytics.successRate}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${analytics.successRate}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Average Transaction Value</p>
                        <p className="text-base font-semibold text-gray-900">ETB {analytics.avgTransactionValue}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {recentTransactions.slice(0, 5).map((txn) => (
                      <div key={txn.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{txn.id}</p>
                            <p className="text-xs text-gray-500">Table {txn.table} - {txn.waiter}</p>
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

          {/* Tables Tab */}
          {activeTab === "tables" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Table Management</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Status</option>
                    <option value="FREE">Available</option>
                    <option value="ASSIGNED">Occupied</option>
                    <option value="PAID">Paid</option>
                  </select>
                  <button 
                    onClick={() => setShowAddTableModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Add Table
                  </button>
                </div>
              </div>
              {tablesLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading tables...</p>
                </div>
              ) : branchTables.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-4">No tables found for this branch.</p>
                  <button
                    onClick={() => setShowAddTableModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Add First Table
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {branchTables.map((table: any) => {
                    const statusDisplay = getTableStatusDisplay(table.status);
                    return (
                      <div
                        key={table.id}
                        className={`border-2 rounded-lg p-4 text-center ${getTableStatusColor(statusDisplay)}`}
                      >
                        <div className="text-2xl font-bold mb-2">Table {table.table_number}</div>
                        <div className="text-sm mb-2">Capacity: {table.capacity}</div>
                        <div className="text-xs font-semibold mb-2 uppercase">{statusDisplay}</div>
                        {table.assigned_waiter_id && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs">Waiter Assigned</p>
                          </div>
                        )}
                        <button className="mt-3 w-full px-3 py-1 text-xs bg-white rounded border hover:bg-gray-50 transition-colors">
                          {table.status === "ASSIGNED" ? "View Order" : "Assign"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === "staff" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assigned Staff</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                  Assign Staff
                </button>
              </div>
              {staffLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading staff...</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {branchStaff.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No staff members assigned to this branch.
                          </td>
                        </tr>
                      ) : (
                        branchStaff.map((member: any) => (
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
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Status</option>
                    <option>Success</option>
                    <option>Pending</option>
                    <option>Failed</option>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telebirr ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.id}</td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{txn.telebirrId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{txn.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Daily Revenue Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Revenue Trend</h3>
                <div className="flex items-end justify-between h-64 space-x-2">
                  {dailyRevenue.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                        <div
                          className="w-full bg-linear-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-colors cursor-pointer"
                          style={{ height: `${(item.revenue / maxDailyRevenue) * 100}%` }}
                          title={`${item.day}: ETB ${item.revenue.toLocaleString()}`}
                        />
                      </div>
                      <span className="mt-2 text-xs text-gray-600">{item.day}</span>
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

              {/* Payment Methods */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Methods Distribution</h3>
                <div className="space-y-4">
                  {paymentMethods.map((method, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{method.method}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{method.count} transactions</span>
                          <span className="text-xs text-gray-500 ml-2">({method.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-500 h-2.5 rounded-full"
                          style={{ width: `${method.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">ETB {method.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Branch Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                      <input
                        type="text"
                        defaultValue={branch.name}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        defaultValue={branch.address}
                        rows={3}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Active Status</label>
                      <select
                        defaultValue={branch.active ? "true" : "false"}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Telebirr Configuration */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Telebirr Integration</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Connection Status</label>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            branch.telebirrStatus === "connected"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {branch.telebirrStatus === "connected" ? "Connected" : "Not Connected"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                      <input
                        type="password"
                        defaultValue="••••••••••••••••"
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Merchant ID</label>
                      <input
                        type="text"
                        defaultValue="MERCHANT_123456"
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto-sync"
                        defaultChecked
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="auto-sync" className="ml-2 text-sm text-gray-700">
                        Enable automatic payment sync
                      </label>
                    </div>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Update Configuration
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Code & NFC */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code & NFC</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">QR Code</h4>
                    <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                      Download QR Code
                    </button>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">NFC Cards</h4>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">Table 1-5</span>
                        <span className="text-xs text-green-600">Active</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">Table 6-10</span>
                        <span className="text-xs text-green-600">Active</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">Table 11-15</span>
                        <span className="text-xs text-yellow-600">Pending</span>
                      </div>
                    </div>
                    <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                      Manage NFC Cards
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add New Table</h3>
              <button
                onClick={() => {
                  setShowAddTableModal(false);
                  setTableFormData({ table_number: "", capacity: 4 });
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                <input
                  type="text"
                  value={tableFormData.table_number}
                  onChange={(e) => setTableFormData({ ...tableFormData, table_number: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 1, 2, 3 or A1, B2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableFormData.capacity}
                  onChange={(e) => setTableFormData({ ...tableFormData, capacity: parseInt(e.target.value) || 4 })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number of seats"
                />
                <p className="mt-1 text-xs text-gray-500">Maximum number of people this table can accommodate</p>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTableModal(false);
                    setTableFormData({ table_number: "", capacity: 4 });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add New Staff Member</h3>
              <button
                onClick={() => {
                  setShowAddStaffModal(false);
                  setStaffFormData({ name: "", role: "", email: "", phone: "", password: "" });
                  setStaffFormError("");
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {staffFormError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{staffFormError}</p>
              </div>
            )}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setStaffFormError("");
                
                if (!staffFormData.name || !staffFormData.role || !staffFormData.phone || !staffFormData.password) {
                  setStaffFormError("Please fill in all required fields");
                  return;
                }

                // For WAITER role, email or phone is required
                if (staffFormData.role === 'WAITER' && !staffFormData.email && !staffFormData.phone) {
                  setStaffFormError("Email or phone number is required for waiter accounts");
                  return;
                }

                try {
                  // Create staff member with current branch
                  const staffResult = await dispatch(createStaff({
                    name: staffFormData.name,
                    phone: staffFormData.phone,
                    role: staffFormData.role as 'WAITER' | 'ADMIN',
                    email: staffFormData.email || undefined,
                    password: staffFormData.password,
                    restaurant_id: selectedBranch?.restaurant_id || undefined,
                    branch_id: id, // Use current branch ID
                  })).unwrap();

                  // Assign to current branch
                  if (staffResult.id) {
                    await dispatch(assignStaffToBranch({
                      staffId: staffResult.id,
                      branchId: id,
                    }));
                  }

                  // Reset form and close modal
                  setStaffFormData({ name: "", role: "", email: "", phone: "", password: "" });
                  setStaffFormError("");
                  setShowAddStaffModal(false);
                  
                  // Refresh staff list
                  dispatch(fetchStaff({ branchId: id }));
                } catch (error: any) {
                  console.error("Failed to create staff:", error);
                  const errorMessage = error?.payload || error?.message || "Failed to create staff member. Please try again.";
                  setStaffFormError(errorMessage);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select 
                  value={staffFormData.role}
                  onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
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
                  value={staffFormData.email}
                  onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={staffFormData.phone}
                  onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+251 911 123 456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={staffFormData.password}
                  onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password (minimum 6 characters)"
                />
                <p className="mt-1 text-xs text-gray-500">Required: Set a password for staff login (minimum 6 characters)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Branch</label>
                <select
                  value={id}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded-lg cursor-not-allowed"
                >
                  <option value={id}>
                    {restaurantName} - {selectedBranch?.name || "Loading..."}
                  </option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Staff will be assigned to this branch</p>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStaffModal(false);
                    setStaffFormData({ name: "", role: "", email: "", phone: "", password: "" });
                    setStaffFormError("");
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

