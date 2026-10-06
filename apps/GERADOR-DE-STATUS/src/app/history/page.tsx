'use client';

import React from 'react';
import EnhancedHeader from '@/components/EnhancedHeader';
import HistorySection from '@/components/HistorySection';
import EnhancedFooter from '@/components/EnhancedFooter';

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-black">
      <EnhancedHeader />
      
      <main className="pt-20">
        <HistorySection />
      </main>
      
      <EnhancedFooter />
    </div>
  );
}