"use client";

import { useRouter } from "next/navigation";
import { useState, use } from "react";

export default function PaymentPage({ params }: { params: Promise<{ tableId: string; orderId: string }> }) {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success" | "failed">("pending");

  // Unwrap params Promise using React.use()
  const { tableId, orderId } = use(params);

  // Mock order data - In a real app, this would be fetched based on params
  const order = {
    id: orderId,
    tableId: tableId,
    tableNumber: parseInt(tableId),
    restaurant: "Addis Café",
    branch: "Bole Branch",
    waiter: "John Doe",
    items: [
      { id: 1, name: "Cappuccino", quantity: 2, price: 80, total: 160 },
      { id: 2, name: "Pasta Carbonara", quantity: 1, price: 180, total: 180 },
      { id: 3, name: "Caesar Salad", quantity: 1, price: 120, total: 120 },
    ],
    subtotal: 460,
    tax: 46,
    total: 506,
    createdAt: "2024-01-15 14:30",
    status: "pending",
  };

  const handlePayWithTelebirr = () => {
    setPaymentStatus("processing");
    
    // Simulate payment processing
    setTimeout(() => {
      // In a real app, this would call the Telebirr API
      setPaymentStatus("success");
      
      // After successful payment, redirect or show success message
      setTimeout(() => {
        // In a real app, this would update the order status and table status
        alert("Payment successful! Thank you for your order.");
        // Could redirect to a success page or close
      }, 2000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{order.restaurant}</h1>
          <p className="text-gray-600 mt-1">{order.branch}</p>
        </div>

        {/* Order Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
          <div className="text-center mb-6">
            <div className="inline-block px-4 py-2 bg-blue-100 rounded-full mb-3">
              <span className="text-blue-600 font-semibold">Table {order.tableNumber}</span>
            </div>
            <p className="text-sm text-gray-600">Order ID: {order.id}</p>
            <p className="text-sm text-gray-600">Waiter: {order.waiter}</p>
          </div>

          {/* Order Items */}
          <div className="border-t border-b border-gray-200 py-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity} × ETB {item.price}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">ETB {item.total}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">ETB {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tax (10%)</span>
              <span className="text-gray-900">ETB {order.tax.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">ETB {order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          {paymentStatus === "pending" && (
            <button
              onClick={handlePayWithTelebirr}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Pay with Telebirr</span>
            </button>
          )}

          {paymentStatus === "processing" && (
            <div className="w-full px-6 py-4 bg-yellow-100 text-yellow-800 rounded-lg text-center">
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-semibold">Processing payment...</span>
              </div>
            </div>
          )}

          {paymentStatus === "success" && (
            <div className="w-full px-6 py-4 bg-green-100 text-green-800 rounded-lg text-center">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Payment Successful!</span>
              </div>
              <p className="text-sm mt-2">Thank you for your payment. Your order has been confirmed.</p>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="w-full px-6 py-4 bg-red-100 text-red-800 rounded-lg text-center">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-semibold">Payment Failed</span>
              </div>
              <p className="text-sm mt-2">Please try again or contact your waiter.</p>
              <button
                onClick={() => setPaymentStatus("pending")}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Scan this QR code to pay for your order instantly
          </p>
        </div>
      </div>
    </div>
  );
}

