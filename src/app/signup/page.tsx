"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { signupRestaurantOwner, checkEmailExists, clearError } from "../../features/auth/signupSlice";

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error, success, signupData } = useAppSelector((state) => state.signup);
  const [currentStep, setCurrentStep] = useState(1);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Owner info
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // Restaurant info
    restaurantName: "",
    // Branch info
    branchName: "",
    branchAddress: "",
    // Telebirr (optional)
    telebirrMerchantId: "",
    telebirrAppKey: "",
    telebirrPublicKey: "",
    telebirrShortcode: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "email") {
      setEmailError(null);
    }
  };

  const handleEmailBlur = async () => {
    if (formData.email) {
      try {
        const result = await dispatch(checkEmailExists(formData.email)).unwrap();
        if (result.exists) {
          setEmailError("This email is already registered");
        }
      } catch (error) {
        // Email check failed, but continue
      }
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          return false;
        }
        if (formData.password.length < 6) {
          return false;
        }
        return true;
      case 2:
        return !!formData.restaurantName;
      case 3:
        return !!formData.branchName && !!formData.branchAddress;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      dispatch(clearError());
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    dispatch(clearError());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(3)) {
      return;
    }

    if (emailError) {
      return;
    }

    const signupPayload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      restaurantName: formData.restaurantName,
      branchName: formData.branchName,
      branchAddress: formData.branchAddress,
      telebirrMerchantId: formData.telebirrMerchantId || undefined,
      telebirrAppKey: formData.telebirrAppKey || undefined,
      telebirrPublicKey: formData.telebirrPublicKey || undefined,
      telebirrShortcode: formData.telebirrShortcode || undefined,
    };

    try {
      await dispatch(signupRestaurantOwner(signupPayload)).unwrap();
      // Redirect to login or dashboard after successful signup
      setTimeout(() => {
        router.push("/login?signup=success");
      }, 2000);
    } catch (error) {
      // Error is handled by Redux
    }
  };

  if (success && signupData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Signup Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your restaurant <strong>{signupData.restaurant.name}</strong> and branch <strong>{signupData.branch.name}</strong> have been created successfully.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800 font-semibold mb-1">✅ Account Ready</p>
              <p className="text-xs text-green-700">
                Your account has been created. You can now log in with your email: <strong>{signupData.admin.email}</strong>
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting to login page...
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-4xl font-bold text-gray-900">Zuludine</span>
          </Link>
          <p className="mt-2 text-gray-600">Restaurant Payment Platform</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Restaurant Account</h1>
          <p className="text-gray-600 mb-8">Sign up to start accepting payments with Zuludine</p>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  {step < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Owner Info</span>
              <span>Restaurant</span>
              <span>Branch</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Owner Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleEmailBlur}
                    required
                    className={`w-full px-4 py-2 bg-white text-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      emailError ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Enter your email"
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+251 911 123 456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 bg-white text-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formData.password && formData.password !== formData.confirmPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Confirm your password"
                  />
                  {formData.password && formData.password !== formData.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Restaurant Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    name="restaurantName"
                    value={formData.restaurantName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter restaurant name"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You can add more branches and configure settings after signup.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Branch Information */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">First Branch Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Main Branch, Bole Branch"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Address *</label>
                  <textarea
                    name="branchAddress"
                    value={formData.branchAddress}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter complete branch address"
                  />
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Telebirr Integration (Optional)</h4>
                  <p className="text-xs text-gray-500 mb-4">You can configure Telebirr credentials later in settings</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                      <input
                        type="text"
                        name="telebirrMerchantId"
                        value={formData.telebirrMerchantId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">App Key</label>
                      <input
                        type="text"
                        name="telebirrAppKey"
                        value={formData.telebirrAppKey}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                      <input
                        type="text"
                        name="telebirrPublicKey"
                        value={formData.telebirrPublicKey}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shortcode</label>
                      <input
                        type="text"
                        name="telebirrShortcode"
                        value={formData.telebirrShortcode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !validateStep(3) || !!emailError}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
