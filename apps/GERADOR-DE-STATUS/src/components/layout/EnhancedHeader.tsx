'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Menu, X, Home, Plus, History, Heart, User, Settings, Moon, Sun, MessageCircle } from 'lucide-react';

const EnhancedHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Início', href: '/', icon: Home },
    { label: 'Criar', href: '/#creator-section', icon: Plus },
    { label: 'Histórico', href: '/history', icon: History },
    { label: 'Favoritos', href: '/favorites', icon: Heart },
  ];

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Aqui você pode adicionar a lógica para mudar o tema
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass-effect border-b border-gray-700/50' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="p-2 rounded-lg bg-gradient-gold">
              <Sparkles className="h-6 w-6 text-black-deep" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white-pure">
                Status<span className="text-gradient">AI</span>
              </h1>
              <p className="text-xs text-gray-medium">Creator</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-light hover:text-gold-luxury transition-colors duration-300 font-medium rounded-lg hover:bg-gray-800/50"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </motion.a>
              );
            })}
            
            {/* Modo escuro/claro */}
            <motion.button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-light hover:text-gold-luxury transition-colors duration-300 hover:bg-gray-800/50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden p-2 rounded-lg text-gray-light hover:text-gold-luxury transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <motion.div
          className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: isMobileMenuOpen ? 1 : 0,
            height: isMobileMenuOpen ? 'auto' : 0
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 glass-effect rounded-lg mt-2 border border-gray-700/50">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 text-gray-light hover:text-gold-luxury transition-colors duration-300 font-medium rounded-md hover:bg-gray-dark"
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </motion.a>
              );
            })}
            
            {/* Modo escuro/claro no mobile */}
            <motion.button
              onClick={() => {
                toggleDarkMode();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-3 w-full px-3 py-2 text-gray-light hover:text-gold-luxury transition-colors duration-300 font-medium rounded-md hover:bg-gray-dark"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </motion.button>
          </div>
        </motion.div>
      </nav>
    </motion.header>
  );
};

export default EnhancedHeader;