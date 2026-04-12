"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../../../features/menu/menuSlice";
import { fetchRestaurants } from "../../../features/restaurants/restaurantsSlice";
import { useListAllUserBranchesQuery } from "../../../services/branch-management/branchManagementApi";
import { branchFromOutput } from "../../../features/branches/branchModel";
import { tabNavButtonClass, tabPanelEnterClass } from "@/lib/tab-animation";
import { cn } from "@/lib/utils";

export default function MenuPage() {
  const { user, isSystemAdmin, isBranchAdmin } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const { restaurants } = useAppSelector((state: any) => state.restaurants);
  const { data: allBranchesData } = useListAllUserBranchesQuery();
  const branches = useMemo(
    () => (allBranchesData?.branches ?? []).map(branchFromOutput),
    [allBranchesData?.branches],
  );
  const { categories, items, loading, error } = useAppSelector((state: any) => state.menu);
  
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>(user?.branchId || "");
  const [activeTab, setActiveTab] = useState<"categories" | "items">("categories");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    sort_order: 0,
  });
  
  const [itemFormData, setItemFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    is_taxable: true,
    is_available: true,
    image_url: "",
  });

  useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  // Set branch for branch admins
  useEffect(() => {
    if (isBranchAdmin() && user?.branchId) {
      setSelectedBranch(user.branchId);
      const branch = branches.find((b: any) => b.id === user.branchId);
      if (branch) {
        setSelectedRestaurant(branch.restaurant_id);
      }
    }
  }, [user, isBranchAdmin, branches]);

  // Fetch categories and items when branch is selected
  useEffect(() => {
    if (selectedBranch) {
      const filters: any = { branchId: selectedBranch };
      if (selectedRestaurant) {
        filters.restaurantId = selectedRestaurant;
      }
      dispatch(fetchCategories(filters));
      dispatch(fetchMenuItems(filters));
    }
  }, [dispatch, selectedBranch, selectedRestaurant]);

  // Filter branches by restaurant
  const filteredBranches = useMemo(() => {
    if (!selectedRestaurant) return branches;
    return branches.filter((branch: any) => branch.restaurant_id === selectedRestaurant);
  }, [branches, selectedRestaurant]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    return items;
  }, [items]);

  // Handle category form
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedRestaurant) {
      alert("Please select a restaurant and branch");
      return;
    }

    try {
      const categoryData = {
        ...categoryFormData,
        restaurant_id: selectedRestaurant,
        branch_id: selectedBranch,
      };

      if (editingCategory) {
        await dispatch(updateCategory({ id: editingCategory.id, data: categoryData })).unwrap();
      } else {
        await dispatch(createCategory(categoryData)).unwrap();
      }

      setShowCategoryModal(false);
      setCategoryFormData({ name: "", description: "", is_active: true, sort_order: 0 });
      setEditingCategory(null);
    } catch (error: any) {
      console.error("Failed to save category:", error);
      alert(error.message || "Failed to save category");
    }
  };

  // Handle item form
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedRestaurant) {
      alert("Please select a restaurant and branch");
      return;
    }

    try {
      const itemData = {
        ...itemFormData,
        restaurant_id: selectedRestaurant,
        branch_id: selectedBranch,
        price: parseFloat(itemFormData.price.toString()),
      };

      if (editingItem) {
        await dispatch(updateMenuItem({ id: editingItem.id, data: itemData })).unwrap();
      } else {
        await dispatch(createMenuItem(itemData)).unwrap();
      }

      setShowItemModal(false);
      setItemFormData({
        name: "",
        description: "",
        price: 0,
        category_id: "",
        is_taxable: true,
        is_available: true,
        image_url: "",
      });
      setEditingItem(null);
    } catch (error: any) {
      console.error("Failed to save item:", error);
      alert(error.message || "Failed to save item");
    }
  };

  // Handle edit category
  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setShowCategoryModal(true);
  };

  // Handle edit item
  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      category_id: item.category_id || "",
      is_taxable: item.is_taxable,
      is_available: item.is_available,
      image_url: item.image_url || "",
    });
    setShowItemModal(true);
  };

  // Handle delete category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await dispatch(deleteCategory(id)).unwrap();
    } catch (error: any) {
      alert(error.message || "Failed to delete category");
    }
  };

  // Handle delete item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await dispatch(deleteMenuItem(id)).unwrap();
    } catch (error: any) {
      alert(error.message || "Failed to delete item");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage menu categories and items</p>
        </div>
        <div className="flex items-center space-x-3">
          {isSystemAdmin() ? (
            <>
              <select
                value={selectedRestaurant}
                onChange={(e) => {
                  setSelectedRestaurant(e.target.value);
                  setSelectedBranch("");
                }}
                className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Restaurant</option>
                {restaurants.map((restaurant: any) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={!selectedRestaurant}
                className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <option value="">Select Branch</option>
                {filteredBranches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
              {branches.find((b: any) => b.id === selectedBranch)?.name || "Current Branch"}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-8 px-6">
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={tabNavButtonClass(activeTab === "categories")}
            >
              Categories ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={tabNavButtonClass(activeTab === "items")}
            >
              Menu Items ({items.length})
            </button>
          </nav>
        </div>

        <div key={activeTab} className={cn("p-6", tabPanelEnterClass)}>
          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Menu Categories</h3>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryFormData({ name: "", description: "", is_active: true, sort_order: 0 });
                    setShowCategoryModal(true);
                  }}
                  disabled={!selectedBranch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Category
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">Loading categories...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-4">No categories found.</p>
                  {!selectedBranch && (
                    <p className="text-sm text-gray-400">Please select a branch to view categories.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category: any) => (
                    <div
                      key={category.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            category.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-gray-500">Sort: {category.sort_order}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Items Tab */}
          {activeTab === "items" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setItemFormData({
                      name: "",
                      description: "",
                      price: 0,
                      category_id: "",
                      is_taxable: true,
                      is_available: true,
                      image_url: "",
                    });
                    setShowItemModal(true);
                  }}
                  disabled={!selectedBranch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Item
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">Loading items...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-4">No menu items found.</p>
                  {!selectedBranch && (
                    <p className="text-sm text-gray-400">Please select a branch to view items.</p>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item: any) => {
                        const category = categories.find((c: any) => c.id === item.category_id);
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                {item.description && (
                                  <div className="text-sm text-gray-500">{item.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {category?.name || "Uncategorized"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                ETB {parseFloat(item.price).toLocaleString()}
                              </div>
                              {item.is_taxable && (
                                <div className="text-xs text-gray-500">Taxable</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  item.is_available
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {item.is_available ? "Available" : "Unavailable"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingCategory ? "Edit Category" : "Add Category"}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setCategoryFormData({ name: "", description: "", is_active: true, sort_order: 0 });
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Coffee, Food, Drinks"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Category description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={categoryFormData.sort_order}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={categoryFormData.is_active}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryFormData({ name: "", description: "", is_active: true, sort_order: 0 });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingCategory ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingItem ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  setItemFormData({
                    name: "",
                    description: "",
                    price: 0,
                    category_id: "",
                    is_taxable: true,
                    is_available: true,
                    image_url: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Item name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Item description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={itemFormData.category_id}
                  onChange={(e) => setItemFormData({ ...itemFormData, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemFormData.price}
                  onChange={(e) => setItemFormData({ ...itemFormData, price: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={itemFormData.image_url}
                  onChange={(e) => setItemFormData({ ...itemFormData, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_taxable"
                    checked={itemFormData.is_taxable}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_taxable: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_taxable" className="ml-2 text-sm text-gray-700">
                    Taxable
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={itemFormData.is_available}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_available: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                    Available
                  </label>
                </div>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                    setItemFormData({
                      name: "",
                      description: "",
                      price: 0,
                      category_id: "",
                      is_taxable: true,
                      is_available: true,
                      image_url: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingItem ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

