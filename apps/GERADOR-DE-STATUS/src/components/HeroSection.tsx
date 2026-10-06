'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Star, Zap } from 'lucide-react';

const HeroSection = () => {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Partículas flutuantes com valores fixos para evitar erro de hidratação
  const particles = [
    { id: 0, x: 15, y: 20, delay: 0, duration: 5 },
    { id: 1, x: 85, y: 15, delay: 0.5, duration: 4.5 },
    { id: 2, x: 25, y: 80, delay: 1, duration: 6 },
    { id: 3, x: 75, y: 70, delay: 1.5, duration: 4 },
    { id: 4, x: 45, y: 30, delay: 2, duration: 5.5 },
    { id: 5, x: 65, y: 90, delay: 2.5, duration: 4.8 },
    { id: 6, x: 10, y: 60, delay: 3, duration: 5.2 },
    { id: 7, x: 90, y: 40, delay: 3.5, duration: 4.3 },
    { id: 8, x: 35, y: 10, delay: 0.8, duration: 5.8 },
    { id: 9, x: 55, y: 85, delay: 1.3, duration: 4.7 },
    { id: 10, x: 20, y: 50, delay: 1.8, duration: 5.3 },
    { id: 11, x: 80, y: 25, delay: 2.3, duration: 4.9 }
  ];

  const features = [];

  const handleCreateStatus = () => {
    if (!text.trim()) return;
    setIsTyping(true);
    // Aqui você pode adicionar a lógica para rolar para a seção de criação
    document.getElementById('creator-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black-deep">
      {/* Background com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-black-deep via-gray-dark to-black-carbon" />
      
      {/* Partículas animadas */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-gold-luxury rounded-full opacity-30"
            initial={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Efeito de luz no fundo */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold-luxury rounded-full opacity-5 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">




        {/* Título simples */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-white-pure mb-12 leading-tight"
        >
          <span className="text-gradient">Status AI</span>
        </motion.h1>

        {/* Formulário de input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="flex flex-col sm:flex-row gap-4 p-2 card-luxury">
            <input
              type="text"
              placeholder="Ex: motivação, amor, sucesso..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white-pure placeholder-gray-medium text-lg px-4 py-3"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateStatus()}
            />
            <motion.button
              onClick={handleCreateStatus}
              disabled={!text.trim() || isTyping}
              className="btn-primary flex items-center space-x-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: text.trim() ? 1.05 : 1 }}
              whileTap={{ scale: text.trim() ? 0.95 : 1 }}
            >
              <span>{isTyping ? '...' : 'Gerar'}</span>
              {!isTyping && <ArrowRight className="h-5 w-5" />}
              {isTyping && <div className="loading-spinner h-5 w-5" />}
            </motion.button>
          </div>
        </motion.div>



        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-gold-luxury rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-3 bg-gold-luxury rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
