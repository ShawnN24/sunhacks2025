'use client';

import React, { useState } from 'react';
import TriangulationExample from '@/app/components/TriangulationExample';
import { MockTriangulationService } from '@/lib/mockTriangulationService';

export default function TriangulationTestPage() {
  const [useMockData, setUseMockData] = useState(true);

  const toggleMockData = () => {
    const newValue = !useMockData;
    setUseMockData(newValue);
    MockTriangulationService.setUseMockData(newValue);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎯 AI Activity Finder Test
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Test the Gemini AI-powered activity finder with mock location data
          </p>
          
          {/* Mock Data Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useMockData}
                onChange={toggleMockData}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Use Mock Data (Recommended for Testing)
              </span>
            </label>
            <div className="text-xs text-gray-500">
              {useMockData ? '🔧 Mock Mode' : '🌐 Real Data Mode'}
            </div>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* 1-on-1 DM Test */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              💬 1-on-1 Activity Test
            </h2>
            <p className="text-gray-600 mb-4">
              Test activity suggestions between you and one friend
            </p>
            <TriangulationExample
              currentUserId="current_user"
              conversationType="direct"
              friendId="friend_sarah"
            />
          </div>

          {/* Group Chat Test */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              👥 Group Activity Test
            </h2>
            <p className="text-gray-600 mb-4">
              Test activity suggestions for a group of friends
            </p>
            <TriangulationExample
              currentUserId="current_user"
              conversationType="group"
              groupId="test_group"
            />
          </div>
        </div>

        {/* Outlier Filtering Test Scenarios */}
        <div className="mt-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🔍 Outlier Filtering Tests
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Test the outlier detection and filtering algorithm with groups containing distant members
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Outlier Test - Tucson Member */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-400">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                🚫 Outlier Test: Tucson Member
              </h3>
              <p className="text-gray-600 mb-4">
                Group with one member in Tucson (100+ miles away) - should be filtered out
              </p>
              <div className="bg-orange-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800">
                  <strong>Expected:</strong> Tucson member should be identified as outlier and filtered out, 
                  meeting point should be centered on Phoenix area members only.
                </p>
              </div>
              <TriangulationExample
                currentUserId="current_user"
                conversationType="group"
                groupId="outlier_test_group"
                testScenario="outliers"
              />
            </div>

            {/* Extreme Outlier Test - California Member */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-400">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                🚨 Extreme Outlier Test: California Member
              </h3>
              <p className="text-gray-600 mb-4">
                Group with one member in Los Angeles (300+ miles away) - should be filtered out
              </p>
              <div className="bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Expected:</strong> California member should be identified as extreme outlier and filtered out, 
                  meeting point should be centered on Phoenix area members only.
                </p>
              </div>
              <TriangulationExample
                currentUserId="current_user"
                conversationType="group"
                groupId="extreme_outlier_test_group"
                testScenario="extreme_outlier"
              />
            </div>
          </div>
        </div>

        {/* Mock Data Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            🔧 Mock Data Information
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">Mock Locations:</h4>
              <ul className="space-y-1">
                <li>• Downtown Phoenix, AZ</li>
                <li>• Tempe, AZ (ASU Campus)</li>
                <li>• Scottsdale, AZ</li>
                <li>• Mesa, AZ</li>
                <li>• Glendale, AZ</li>
                <li>• Chandler, AZ</li>
              </ul>
            </div>
            <div>
            <h4 className="font-medium mb-2">Test Scenarios:</h4>
            <ul className="space-y-1">
              <li>• 1-on-1: You (Scottsdale) + Friend (Tempe) → Activities</li>
              <li>• Group: 4 members across Phoenix area → Group activities</li>
              <li>• <strong>Outlier Test:</strong> 5 members (4 in Phoenix + 1 in Tucson)</li>
              <li>• <strong>Extreme Outlier:</strong> 4 members (3 in Phoenix + 1 in LA)</li>
              <li>• Diverse activity suggestions (restaurants, entertainment, etc.)</li>
              <li>• AI-powered venue recommendations</li>
              <li>• <strong>Outlier filtering:</strong> Automatic detection and removal of distant members</li>
            </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            🚀 How to Test
          </h3>
          <ol className="text-sm text-green-700 space-y-2">
            <li>1. <strong>Click "Find Activities"</strong> in any test scenario</li>
            <li>2. <strong>Watch the AI analysis</strong> - Gemini will analyze locations and suggest activities</li>
            <li>3. <strong>Review the results</strong> - See central location, activity suggestions, and travel time</li>
            <li>4. <strong>Test outlier filtering</strong> - Try the outlier test scenarios to see distant members filtered out</li>
            <li>5. <strong>Check outlier info</strong> - Look for the orange "Outlier Filtering Applied" section in results</li>
            <li>6. <strong>Test "Open in Maps"</strong> - Opens the activity location in Google Maps</li>
            <li>7. <strong>Compare scenarios</strong> - See how outlier filtering improves central location accuracy</li>
          </ol>
        </div>

        {/* API Status */}
        <div className="mt-6 bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">API Status: {useMockData ? 'Using Mock Data' : 'Using Real Firebase Data'}</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Make sure your GEMINI_API_KEY is set in environment variables for AI suggestions
          </p>
        </div>
      </div>
    </div>
  );
}
