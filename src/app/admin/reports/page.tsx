"use client";

import { useState } from "react";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("month");
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const revenueData = [
    { restaurant: "Addis Café", branch: "Bole Branch", revenue: 1250000, transactions: 2847, successRate: 98.5 },
    { restaurant: "Blue Nile Hotel", branch: "Main Branch", revenue: 980000, transactions: 2156, successRate: 97.2 },
    { restaurant: "Kaldi's Coffee", branch: "Meskel Square", revenue: 750000, transactions: 1892, successRate: 96.8 },
    { restaurant: "Habesha Restaurant", branch: "Main Branch", revenue: 620000, transactions: 1456, successRate: 95.4 },
    { restaurant: "Tomoca", branch: "Piazza Branch", revenue: 450000, transactions: 1234, successRate: 94.1 },
  ];

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalTransactions = revenueData.reduce((sum, item) => sum + item.transactions, 0);
  const avgSuccessRate = revenueData.reduce((sum, item) => sum + item.successRate, 0) / revenueData.length;

  const monthlyRevenue = [
    { month: "Jan", revenue: 2100000 },
    { month: "Feb", revenue: 2350000 },
    { month: "Mar", revenue: 2800000 },
    { month: "Apr", revenue: 3200000 },
    { month: "May", revenue: 3500000 },
    { month: "Jun", revenue: 3800000 },
  ];

  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(d => d.revenue));

  const exportReport = (format: string) => {
    // In a real app, this would generate and download the report
    console.log(`Exporting report as ${format}`);
    alert(`Exporting report as ${format}...`);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">View detailed reports and analytics for your restaurants</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportReport("CSV")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportReport("PDF")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <select
            value={restaurantFilter}
            onChange={(e) => setRestaurantFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Restaurants</option>
            <option value="addis">Addis Café</option>
            <option value="bluenile">Blue Nile Hotel</option>
            <option value="kaldi">Kaldi's Coffee</option>
            <option value="habesha">Habesha Restaurant</option>
            <option value="tomoca">Tomoca</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Branches</option>
            <option value="bole">Bole Branch</option>
            <option value="meskel">Meskel Square</option>
            <option value="piazza">Piazza Branch</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">ETB {totalRevenue.toLocaleString()}</p>
              <p className="mt-1 text-xs text-green-600">+12% from last period</p>
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
              <p className="mt-2 text-3xl font-bold text-gray-900">{totalTransactions.toLocaleString()}</p>
              <p className="mt-1 text-xs text-green-600">+8% from last period</p>
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
              <p className="text-sm font-medium text-gray-600">Avg. Success Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{avgSuccessRate.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-green-600">+0.5% from last period</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Restaurant/Branch */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Revenue by Restaurant/Branch</h2>
        <div className="space-y-4">
          {revenueData.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">{item.restaurant}</span>
                  <span className="text-sm text-gray-500 ml-2">- {item.branch}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">ETB {item.revenue.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-2">({item.transactions} transactions)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{ width: `${(item.revenue / totalRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Monthly Revenue Trend</h2>
        <div className="space-y-4">
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
      </div>

      {/* Payment Success Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Success Rate by Branch</h2>
        <div className="space-y-4">
          {revenueData.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{item.restaurant} - {item.branch}</span>
                <span className="text-sm font-semibold text-gray-900">{item.successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    item.successRate >= 97
                      ? "bg-green-500"
                      : item.successRate >= 95
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${item.successRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

