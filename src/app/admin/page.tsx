"use client";

import { useState } from "react";

export default function AdminDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("today");

  // Mock data
  const stats = {
    totalRestaurants: 24,
    totalBranches: 67,
    activeStaff: 142,
    transactionsToday: 1247,
  };

  const paymentSuccessRate = [
    { branch: "Addis Café - Bole", rate: 98.5 },
    { branch: "Blue Nile Hotel", rate: 97.2 },
    { branch: "Kaldi's Coffee - Meskel", rate: 96.8 },
    { branch: "Habesha Restaurant", rate: 95.4 },
    { branch: "Tomoca - Piazza", rate: 94.1 },
  ];

  const revenueData = [
    { date: "Mon", restaurant: "Addis Café", revenue: 45000 },
    { date: "Tue", restaurant: "Addis Café", revenue: 52000 },
    { date: "Wed", restaurant: "Addis Café", revenue: 48000 },
    { date: "Thu", restaurant: "Addis Café", revenue: 61000 },
    { date: "Fri", restaurant: "Addis Café", revenue: 75000 },
    { date: "Sat", restaurant: "Addis Café", revenue: 89000 },
    { date: "Sun", restaurant: "Addis Café", revenue: 92000 },
  ];

  const recentActivity = [
    { id: 1, type: "login", message: "Waiter John Doe logged in at Addis Café - Bole", time: "2 minutes ago", status: "success" },
    { id: 2, type: "payment", message: "Payment failed at Blue Nile Hotel - Table 12", time: "15 minutes ago", status: "error" },
    { id: 3, type: "restaurant", message: "New restaurant 'Habesha Restaurant' added", time: "1 hour ago", status: "info" },
    { id: 4, type: "branch", message: "New branch 'Kaldi's Coffee - Meskel' activated", time: "2 hours ago", status: "success" },
    { id: 5, type: "login", message: "Admin Sarah logged in", time: "3 hours ago", status: "success" },
    { id: 6, type: "payment", message: "Telebirr connection restored at Tomoca - Piazza", time: "4 hours ago", status: "success" },
  ];

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back! Here's what's happening with your restaurants.</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Restaurants</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalRestaurants}</p>
              <p className="mt-1 text-xs text-green-600">+3 this month</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Branches</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalBranches}</p>
              <p className="mt-1 text-xs text-green-600">+5 this month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.activeStaff}</p>
              <p className="mt-1 text-xs text-gray-500">142 online now</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions Today</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.transactionsToday.toLocaleString()}</p>
              <p className="mt-1 text-xs text-green-600">+12% from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Success Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Payment Success Rate by Branch</h2>
          </div>
          <div className="space-y-4">
            {paymentSuccessRate.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.branch}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.rate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      item.rate >= 97
                        ? "bg-green-500"
                        : item.rate >= 95
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Total Revenue (This Week)</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-end justify-between h-48 space-x-2">
              {revenueData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                    <div
                      className="w-full bg-blue-500 rounded-t-lg hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                      title={`${item.date}: ETB ${item.revenue.toLocaleString()}`}
                    />
                  </div>
                  <span className="mt-2 text-xs text-gray-600">{item.date}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-semibold text-gray-900">ETB {revenueData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</button>
        </div>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div
                className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.status === "error"
                    ? "bg-red-100"
                    : activity.status === "success"
                    ? "bg-green-100"
                    : "bg-blue-100"
                }`}
              >
                {activity.type === "login" && (
                  <svg className={`w-5 h-5 ${activity.status === "success" ? "text-green-600" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {activity.type === "payment" && (
                  <svg className={`w-5 h-5 ${activity.status === "error" ? "text-red-600" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
                {(activity.type === "restaurant" || activity.type === "branch") && (
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="mt-1 text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

