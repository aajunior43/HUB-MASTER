'use client';

import React from 'react';
import EnhancedHeader from '@/components/EnhancedHeader';
import FavoritesSection from '@/components/FavoritesSection';
import EnhancedFooter from '@/components/EnhancedFooter';

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-black">
      <EnhancedHeader />
      
      <main className="pt-20">
        <FavoritesSection />
      </main>
      
      <EnhancedFooter />
    </div>
  );
}