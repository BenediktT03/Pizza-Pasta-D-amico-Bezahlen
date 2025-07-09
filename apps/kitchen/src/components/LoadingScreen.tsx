// Loading Screen Component for Kitchen App
import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-center">
        {/* Animated Kitchen Icon */}
        <div className="mb-8">
          <svg
            className="w-20 h-20 mx-auto animate-bounce"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        
        {/* Loading spinner */}
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Kitchen Display wird geladen...
        </h2>
        <p className="text-gray-500">
          Einen Moment bitte
        </p>
      </div>
    </div>
  );
};
