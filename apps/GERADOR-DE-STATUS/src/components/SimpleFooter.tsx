'use client';

import React from 'react';

const SimpleFooter = () => {
  return (
    <footer className="relative bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-gray-800/50">
      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 to-transparent"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-gray-800/30 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-700/50">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <p className="text-gray-300 text-sm">
              DEV <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent font-bold">ALEKSANDRO ALVES</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SimpleFooter;
