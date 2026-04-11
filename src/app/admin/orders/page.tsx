"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { fetchRestaurants } from "../../../features/restaurants/restaurantsSlice";
import { fetchBranches } from "../../../features/branches/branchesSlice";
import { fetchTables, assignTableToWaiter } from "../../../features/tables/tablesSlice";
import { fetchMenuItems, fetchCategories } from "../../../features/menu/menuSlice";
import { createOrder } from "../../../features/orders/ordersSlice";
import { fetchStaff } from "../../../features/staff/staffSlice";

export default function OrdersPage() {
  const { user, isSystemAdmin, isBranchAdmin } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { restaurants, loading: restaurantsLoading } = useAppSelector((state: any) => state.restaurants);
  const { branches, loading: branchesLoading } = useAppSelector((state: any) => state.branches);
  const { tables: branchTables, loading: tablesLoading } = useAppSelector((state: any) => state.tables);
  const { items: menuItems, categories, loading: menuLoading } = useAppSelector((state: any) => state.menu);
  const { staff: waiters, loading: waitersLoading } = useAppSelector((state: any) => state.staff);
  
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>(user?.branchId || "");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<string>("");

  useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  useEffect(() => {
    if (restaurants.length === 0) return;
    dispatch(fetchBranches());
  }, [dispatch, restaurants]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    
    // Branch admins are locked to their branch
    if (isBranchAdmin() && user.branchId) {
      setSelectedBranch(user.branchId);
      // Find the restaurant for this branch
      const branch = branches.find((b: any) => b.id === user.branchId);
      if (branch) {
        setSelectedRestaurant(branch.restaurant_id);
      }
    }
  }, [user, router, isBranchAdmin, branches]);

  // Filter branches based on selected restaurant
  const filteredBranches = useMemo(() => {
    if (!selectedRestaurant) return branches;
    return branches.filter((branch: any) => branch.restaurant_id === selectedRestaurant);
  }, [branches, selectedRestaurant]);

  // Update selected branch when restaurant changes
  useEffect(() => {
    if (selectedRestaurant && filteredBranches.length > 0) {
      // If current branch is not in filtered branches, select first branch
      const branchExists = filteredBranches.find((b: any) => b.id === selectedBranch);
      if (!branchExists) {
        setSelectedBranch(filteredBranches[0].id);
      }
    }
  }, [selectedRestaurant, filteredBranches, selectedBranch]);

  // Fetch tables, menu items, categories, and waiters when branch is selected
  useEffect(() => {
    if (selectedBranch) {
      dispatch(fetchTables(selectedBranch));
      const filters: any = { branchId: selectedBranch };
      if (selectedRestaurant) {
        filters.restaurantId = selectedRestaurant;
      }
      dispatch(fetchMenuItems(filters));
      dispatch(fetchCategories(filters));
      dispatch(fetchStaff(filters)); // Fetch waiters for this branch
    }
  }, [dispatch, selectedBranch, selectedRestaurant]);

  // Preserve selectedTable when tables refresh - only clear if table no longer exists
  useEffect(() => {
    if (selectedTable && branchTables.length > 0) {
      const tableExists = branchTables.find((t: any) => t.id === selectedTable);
      if (!tableExists) {
        // Table no longer exists, clear selection
        setSelectedTable(null);
        setShowOrderModal(false);
      }
    }
  }, [branchTables, selectedTable]);

  // Filter waiters (only WAITER role)
  const availableWaiters = useMemo(() => {
    return waiters.filter((waiter: any) => waiter.role === 'WAITER');
  }, [waiters]);

  // Map table status from database to display format
  const getTableStatusDisplay = (status: string) => {
    switch (status) {
      case "FREE":
        return "available";
      case "ASSIGNED":
        return "occupied";
      case "PAID":
        return "reserved";
      default:
        return status.toLowerCase();
    }
  };

  // Transform tables from database to UI format
  const tables = useMemo(() => {
    if (!branchTables || branchTables.length === 0) return [];
    
    return branchTables.map((table: any) => ({
      id: table.id as string,
      number: parseInt(table.table_number) || table.table_number,
      capacity: table.capacity,
      status: getTableStatusDisplay(table.status),
      orderId: table.status === "ASSIGNED" ? `ORD-${table.id.slice(0, 8).toUpperCase()}` : null,
      waiter: table.assigned_waiter_id ? "Assigned Waiter" : null, // TODO: Fetch waiter name
      orderTotal: 0, // TODO: Calculate from order items
      items: 0, // TODO: Count order items
      createdAt: table.status === "ASSIGNED" ? "Recently" : null,
    }));
  }, [branchTables]);

  // VAT rate constant
  const VAT_RATE = 0.15; // 15%

  // Calculate price breakdown (price includes VAT)
  const calculatePriceBreakdown = (priceIncludingVAT: number, isTaxable: boolean) => {
    if (!isTaxable) {
      return {
        basePrice: priceIncludingVAT,
        vatAmount: 0,
        priceIncludingVAT: priceIncludingVAT,
      };
    }
    const basePrice = priceIncludingVAT / (1 + VAT_RATE);
    const vatAmount = priceIncludingVAT - basePrice;
    return {
      basePrice,
      vatAmount,
      priceIncludingVAT,
    };
  };

  // Transform menu items for display
  const transformedMenuItems = useMemo(() => {
    return menuItems
      .filter((item: any) => item.is_available) // Only show available items
      .map((item: any) => {
        const category = categories.find((c: any) => c.id === item.category_id);
        const priceBreakdown = calculatePriceBreakdown(parseFloat(item.price), item.is_taxable);
        return {
          id: item.id,
          name: item.name,
          price: parseFloat(item.price), // Price including VAT
          basePrice: priceBreakdown.basePrice,
          vatAmount: priceBreakdown.vatAmount,
          is_taxable: item.is_taxable,
          category: category?.name || "Uncategorized",
          description: item.description,
        };
      });
  }, [menuItems, categories]);

  // Group menu items by category
  const menuItemsByCategory = useMemo(() => {
    const grouped: Record<string, typeof transformedMenuItems> = {};
    transformedMenuItems.forEach((item: any) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [transformedMenuItems]);

  const [currentOrder, setCurrentOrder] = useState<Array<{ item: any; quantity: number }>>([]);

  const handleCreateOrder = (tableId: string) => {
    console.log("Creating order for table:", tableId);
    setSelectedTable(tableId);
    setSelectedWaiter(""); // Reset waiter selection
    setCurrentOrder([]);
    setShowOrderModal(true);
  };

  const handleAddItem = (item: any) => {
    const existingItem = currentOrder.find(o => o.item.id === item.id);
    if (existingItem) {
      setCurrentOrder(currentOrder.map(o => 
        o.item.id === item.id ? { ...o, quantity: o.quantity + 1 } : o
      ));
    } else {
      setCurrentOrder([...currentOrder, { item, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (itemId: number) => {
    setCurrentOrder(currentOrder.filter(o => o.item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      setCurrentOrder(currentOrder.map(o => 
        o.item.id === itemId ? { ...o, quantity } : o
      ));
    }
  };

  const handleSubmitOrder = async () => {
    console.log("Submitting order:", { selectedTable, selectedBranch, currentOrderLength: currentOrder.length, selectedWaiter });
    
    // Better validation with specific error messages
    if (!selectedTable) {
      console.error("No table selected");
      alert("Please select a table first.");
      return;
    }

    if (!selectedBranch) {
      console.error("No branch selected");
      alert("Please select a branch first.");
      return;
    }

    if (currentOrder.length === 0) {
      console.error("No items in order");
      alert("Please add at least one item to the order.");
      return;
    }

    if (!selectedWaiter) {
      console.error("No waiter selected");
      alert("Please select a waiter for this order.");
      return;
    }

    try {
      // Get table number from selected table
      const selectedTableData = branchTables.find((t: any) => t.id === selectedTable);
      if (!selectedTableData) {
        alert("Table not found. Please try again.");
        return;
      }

      // Prepare order items
      const orderItems = currentOrder.map((orderItem) => ({
        menu_item_id: orderItem.item.id,
        menu_item_name: orderItem.item.name,
        quantity: orderItem.quantity,
        price: orderItem.item.price, // Price including VAT
        base_price: orderItem.item.basePrice,
        vat_amount: orderItem.item.vatAmount,
        is_taxable: orderItem.item.is_taxable,
      }));

      // Create the order
      const orderResult = await dispatch(createOrder({
        table_id: selectedTable,
        table_number: selectedTableData.table_number,
        branch_id: selectedBranch,
        restaurant_id: selectedRestaurant || undefined,
        waiter_id: selectedWaiter,
        items: orderItems,
        subtotal: orderTotals.subtotal,
        vat: orderTotals.vat,
        total: orderTotals.total,
      })).unwrap();

      // Update table status to ASSIGNED
      await dispatch(assignTableToWaiter({
        tableId: selectedTable,
        waiterId: selectedWaiter,
      }));

      // Refresh tables
      dispatch(fetchTables(selectedBranch));

      // Close modal and reset
      setShowOrderModal(false);
      setSelectedTable(null);
      setSelectedWaiter("");
      setCurrentOrder([]);
      
      // Show success message
      alert(`Order created successfully! Order ID: ${orderResult.id}\nQR code is now active for this table.`);
    } catch (error: any) {
      console.error("Failed to create order:", error);
      alert(error.message || "Failed to create order. Please try again.");
    }
  };

  // Calculate order totals with VAT breakdown
  const orderTotals = useMemo(() => {
    let subtotal = 0;
    let totalVAT = 0;
    let total = 0;

    currentOrder.forEach((orderItem) => {
      const itemTotal = orderItem.item.price * orderItem.quantity;
      total += itemTotal;
      
      if (orderItem.item.is_taxable) {
        const basePrice = orderItem.item.basePrice * orderItem.quantity;
        const vatAmount = orderItem.item.vatAmount * orderItem.quantity;
        subtotal += basePrice;
        totalVAT += vatAmount;
      } else {
        subtotal += itemTotal;
      }
    });

    return {
      subtotal,
      vat: totalVAT,
      total,
    };
  }, [currentOrder]);

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-red-100 text-red-800 border-red-200";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isBranchAdmin() ? `Managing orders for ${user?.branchName}` : "Create and manage orders for tables"}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isSystemAdmin() ? (
            <>
              <select
                value={selectedRestaurant}
                onChange={(e) => {
                  setSelectedRestaurant(e.target.value);
                  setSelectedBranch(""); // Reset branch when restaurant changes
                }}
                className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Restaurant</option>
                {restaurants.map((restaurant: any) => (
                  <option key={restaurant.id} value={restaurant.id} className="text-gray-900">
                    {restaurant.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={!selectedRestaurant || branchesLoading}
                className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <option value="">Select Branch</option>
                {filteredBranches.map((branch: any) => (
                  <option key={branch.id} value={branch.id} className="text-gray-900">
                    {branch.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
              {branches.find((b: any) => b.id === selectedBranch)?.name || user?.branchName || "Current Branch"}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tables</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{tables.length || 0}</p>
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
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {tables.filter((t: any) => t.status === "occupied" && t.orderId).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Tables</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {tables.filter((t: any) => t.status === "available").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                ETB {tables.reduce((sum: number, t: any) => sum + t.orderTotal, 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {tablesLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading tables...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">No tables found for this branch.</p>
          {!selectedBranch && (
            <p className="text-sm text-gray-400">Please select a branch to view tables.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table: any) => (
          <div
            key={table.id}
            className={`border-2 rounded-lg p-4 text-center cursor-pointer transition-all hover:shadow-lg ${getTableStatusColor(table.status)}`}
            onClick={() => table.status === "available" && handleCreateOrder(table.id)}
          >
            <div className="text-3xl font-bold mb-2">Table {table.number}</div>
            <div className="text-sm mb-2">Capacity: {table.capacity}</div>
            <div className="text-xs font-semibold mb-2 uppercase">{table.status}</div>
            
            {table.orderId && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-semibold">Order: {table.orderId}</p>
                <p className="text-xs">Waiter: {table.waiter}</p>
                <p className="text-xs font-semibold">ETB {table.orderTotal}</p>
                <p className="text-xs">{table.items} items</p>
                <div className="mt-2 flex space-x-1">
                  <Link
                    href={`/pay/table/${table.id}/order/${table.orderId}`}
                    className="flex-1 px-2 py-1 text-xs bg-white rounded border hover:bg-gray-50 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View QR
                  </Link>
                  <button
                    className="flex-1 px-2 py-1 text-xs bg-white rounded border hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // View order details
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            )}
            
            {table.status === "available" && (
              <button className="mt-3 w-full px-3 py-1 text-xs bg-white rounded border hover:bg-gray-50 transition-colors">
                Create Order
              </button>
            )}
          </div>
        ))}
        </div>
      )}

      {/* Create Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Create Order - Table {selectedTable ? (tables.find((t: any) => t.id === selectedTable)?.number || branchTables.find((t: any) => t.id === selectedTable)?.table_number || selectedTable) : "N/A"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Select items to add to the order</p>
                  {!selectedTable && (
                    <p className="text-xs text-red-600 mt-1">⚠️ No table selected. Please close and select a table.</p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Assign Waiter *</label>
                    <select
                      value={selectedWaiter}
                      onChange={(e) => setSelectedWaiter(e.target.value)}
                      required
                      className="px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Waiter</option>
                      {availableWaiters.map((waiter: any) => (
                        <option key={waiter.id} value={waiter.id}>
                          {waiter.name} {waiter.phone ? `(${waiter.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setSelectedTable(null);
                    setSelectedWaiter("");
                    setCurrentOrder([]);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Menu Items */}
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Categories */}
                  {menuLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="ml-3 text-gray-600">Loading menu items...</p>
                    </div>
                  ) : Object.keys(menuItemsByCategory).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 mb-4">No menu items available.</p>
                      {!selectedBranch && (
                        <p className="text-sm text-gray-400">Please select a branch to view menu items.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.keys(menuItemsByCategory).map((category) => (
                        <div key={category}>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">{category}</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {menuItemsByCategory[category].map((item: any) => (
                              <button
                                key={item.id}
                                onClick={() => handleAddItem(item)}
                                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    {item.description && (
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                                    )}
                                    <div className="mt-1">
                                      <p className="text-sm font-semibold text-gray-900">ETB {item.price.toLocaleString()}</p>
                                      {item.is_taxable && (
                                        <p className="text-xs text-gray-500">
                                          Inc. VAT 15% • Base: ETB {item.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                      )}
                                      {!item.is_taxable && (
                                        <p className="text-xs text-gray-500">Non-taxable</p>
                                      )}
                                    </div>
                                  </div>
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-4 sticky top-20">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h4>
                    
                    {currentOrder.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No items added yet</p>
                    ) : (
                      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                        {currentOrder.map((orderItem) => (
                          <div key={orderItem.item.id} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-gray-900 text-sm">{orderItem.item.name}</p>
                              <button
                                onClick={() => handleRemoveItem(orderItem.item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleUpdateQuantity(orderItem.item.id, orderItem.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
                                >
                                  -
                                </button>
                                <span className="text-sm font-medium text-gray-900 w-8 text-center">{orderItem.quantity}</span>
                                <button
                                  onClick={() => handleUpdateQuantity(orderItem.item.id, orderItem.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">
                                  ETB {(orderItem.item.price * orderItem.quantity).toLocaleString()}
                                </p>
                                {orderItem.item.is_taxable && (
                                  <p className="text-xs text-gray-500">
                                    VAT: ETB {(orderItem.item.vatAmount * orderItem.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4">
                      {/* Receipt-like breakdown */}
                      <div className="bg-white rounded-lg p-3 mb-4 border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Receipt Breakdown</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Subtotal (excl. VAT)</span>
                            <span className="font-medium text-gray-900">
                              ETB {orderTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {orderTotals.vat > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">VAT (15%)</span>
                              <span className="font-medium text-gray-900">
                                ETB {orderTotals.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-gray-900">Total (incl. VAT)</span>
                              <span className="text-base font-bold text-gray-900">
                                ETB {orderTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleSubmitOrder}
                        disabled={currentOrder.length === 0}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Create Order & Generate QR
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

