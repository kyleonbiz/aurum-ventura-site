'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function OnboardingStep({
  params,
}: {
  params: { uniqueId: string; step: string };
}) {
  const [formData, setFormData] = useState({
    businessDescription: '',
    numberOfEmployees: '',
    annualRevenue: '',
  });

  const currentStep = parseInt(params.step) || 1;
  const totalSteps = 3;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      // In a real app, save responses and navigate
      window.location.href = `/get-started/${params.uniqueId}/step/${currentStep + 1}`;
    } else {
      window.location.href = `/get-started/${params.uniqueId}/complete`;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      window.location.href = `/get-started/${params.uniqueId}/step/${currentStep - 1}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Step {currentStep} of {totalSteps}
              </h1>
              <span className="text-sm text-gray-600">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <form className="space-y-6">
            {currentStep === 1 && (
              <>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Tell us about your business
                </h2>
                <div>
                  <label
                    htmlFor="businessDescription"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Business Description *
                  </label>
                  <textarea
                    id="businessDescription"
                    name="businessDescription"
                    required
                    value={formData.businessDescription}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your business in a few sentences..."
                  />
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Company details
                </h2>
                <div>
                  <label
                    htmlFor="numberOfEmployees"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Number of Employees *
                  </label>
                  <input
                    type="number"
                    id="numberOfEmployees"
                    name="numberOfEmployees"
                    required
                    value={formData.numberOfEmployees}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Financial information
                </h2>
                <div>
                  <label
                    htmlFor="annualRevenue"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Annual Revenue *
                  </label>
                  <input
                    type="number"
                    id="annualRevenue"
                    name="annualRevenue"
                    required
                    value={formData.annualRevenue}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
              </>
            )}

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 font-semibold py-3 rounded-lg transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                {currentStep === totalSteps ? 'Complete' : 'Next'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
