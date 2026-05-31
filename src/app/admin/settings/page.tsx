"use client";

import { useState } from "react";

import { tabNavButtonClass, tabPanelEnterClass } from "@/lib/tab-animation";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("health");

  const systemHealth = {
    telebirrApi: { status: "operational", uptime: "99.9%", lastCheck: "2 minutes ago" },
    webhooks: { status: "operational", failures: 0, lastFailure: "None" },
    server: { status: "operational", uptime: "99.8%", responseTime: "120ms" },
    database: { status: "operational", connections: 45, maxConnections: 100 },
  };

  const errorLogs = [
    { id: 1, timestamp: "2024-01-15 14:30:22", level: "error", message: "Telebirr API timeout at Blue Nile Hotel", service: "Payment Gateway" },
    { id: 2, timestamp: "2024-01-15 13:15:10", level: "warning", message: "High database connection count", service: "Database" },
    { id: 3, timestamp: "2024-01-15 12:00:05", level: "info", message: "Scheduled backup completed successfully", service: "Backup" },
    { id: 4, timestamp: "2024-01-15 11:45:33", level: "error", message: "Webhook delivery failed for transaction TXN-002", service: "Webhooks" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-100 text-green-800";
      case "degraded":
        return "bg-yellow-100 text-yellow-800";
      case "down":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage system configuration and monitor platform health</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("health")}
            className={tabNavButtonClass(activeTab === "health")}
          >
            Platform Health
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("configuration")}
            className={tabNavButtonClass(activeTab === "configuration")}
          >
            Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={tabNavButtonClass(activeTab === "logs")}
          >
            Error Logs
          </button>
        </nav>
      </div>

      <div key={activeTab} className={cn(tabPanelEnterClass)}>
      {/* Platform Health Tab */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Telebirr API Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Telebirr API Status</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemHealth.telebirrApi.status)}`}>
                  {systemHealth.telebirrApi.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium text-gray-900">{systemHealth.telebirrApi.uptime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Check</span>
                  <span className="text-sm font-medium text-gray-900">{systemHealth.telebirrApi.lastCheck}</span>
                </div>
              </div>
            </div>

            {/* Webhooks Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Webhooks Status</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemHealth.webhooks.status)}`}>
                  {systemHealth.webhooks.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Failures (24h)</span>
                  <span className="text-sm font-medium text-gray-900">{systemHealth.webhooks.failures}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Failure</span>
                  <span className="text-sm font-medium text-gray-900">{systemHealth.webhooks.lastFailure}</span>
                </div>
              </div>
            </div>

            {/* Server Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Server Status</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemHealth.server.status)}`}>
                  {systemHealth.server.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium text-gray-900">{systemHealth.server.uptime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg. Response Time</span>
                  <span className="text-sm font-medium text-gray-900">{systemHealth.server.responseTime}</span>
                </div>
              </div>
            </div>

            {/* Database Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Database Status</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemHealth.database.status)}`}>
                  {systemHealth.database.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Connections</span>
                  <span className="text-sm font-medium text-gray-900">
                    {systemHealth.database.connections} / {systemHealth.database.maxConnections}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(systemHealth.database.connections / systemHealth.database.maxConnections) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === "configuration" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">System Configuration</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Payment Gateway</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="telebirr">Telebirr</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification Email</label>
                <input
                  type="email"
                  defaultValue="admin@zuluverify.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  defaultValue="30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto-backup"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto-backup" className="ml-2 text-sm text-gray-700">
                  Enable automatic daily backups
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email-notifications"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="email-notifications" className="ml-2 text-sm text-gray-700">
                  Send email notifications for critical alerts
                </label>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Logs Tab */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">System Error Logs</h3>
              <p className="mt-1 text-sm text-gray-500">Recent system errors and warnings</p>
            </div>
            <div className="divide-y divide-gray-200">
              {errorLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">{log.service}</span>
                        <span className="text-sm text-gray-400">{log.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-900">{log.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Load More Logs
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

