"use client";

import { useState } from "react";

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all");

  const notifications = [
    { id: 1, type: "payment_failure", message: "Payment failed at Addis Café - Bole, Table 5. Amount: ETB 450", time: "2 minutes ago", read: false, critical: true },
    { id: 2, type: "telebirr_error", message: "Telebirr connection error at Blue Nile Hotel. Retrying connection...", time: "15 minutes ago", read: false, critical: true },
    { id: 3, type: "staff_login", message: "Waiter John Doe logged in at Addis Café - Bole", time: "1 hour ago", read: true, critical: false },
    { id: 4, type: "restaurant_added", message: "New restaurant 'Habesha Restaurant' added to the platform", time: "2 hours ago", read: true, critical: false },
    { id: 5, type: "branch_activated", message: "Branch 'Kaldi's Coffee - Meskel' has been activated", time: "3 hours ago", read: true, critical: false },
    { id: 6, type: "payment_failure", message: "Payment failed at Tomoca - Piazza, Table 2. Amount: ETB 150", time: "4 hours ago", read: true, critical: true },
    { id: 7, type: "telebirr_restored", message: "Telebirr connection restored at Tomoca - Piazza", time: "5 hours ago", read: true, critical: false },
    { id: 8, type: "staff_logout", message: "Admin Sarah logged out from Blue Nile Hotel", time: "6 hours ago", read: true, critical: false },
  ];

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.read;
    if (filter === "critical") return notif.critical;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.critical && !n.read).length;

  const markAsRead = (id: number) => {
    // In a real app, this would update the backend
    console.log("Mark as read:", id);
  };

  const markAllAsRead = () => {
    // In a real app, this would update the backend
    console.log("Mark all as read");
  };

  const clearNotification = (id: number) => {
    // In a real app, this would delete from backend
    console.log("Clear notification:", id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "payment_failure":
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "telebirr_error":
      case "telebirr_restored":
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case "staff_login":
      case "staff_logout":
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">System notifications and alerts</p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Notifications</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{notifications.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 border-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
              <p className="mt-2 text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "critical"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Critical
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-6 hover:bg-gray-50 transition-colors ${
                !notif.read ? "bg-blue-50" : ""
              } ${notif.critical ? "border-l-4 border-red-500" : ""}`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    notif.critical
                      ? "bg-red-100"
                      : notif.type.includes("payment")
                      ? "bg-red-100"
                      : notif.type.includes("telebirr")
                      ? "bg-orange-100"
                      : "bg-blue-100"
                  }`}
                >
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.read ? "text-gray-700" : "text-gray-900 font-medium"}`}>
                    {notif.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{notif.time}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => clearNotification(notif.id)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

