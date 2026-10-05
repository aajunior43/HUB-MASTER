'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Palette, Download, Share2, History, Heart, Zap } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: Wand2,
      title: 'Criação com IA',
      description: 'Gere status únicos e criativos com nossa inteligência artificial avançada.'
    },
    {
      icon: Palette,
      title: 'Design Personalizado',
      description: 'Personalize cores, fontes e layouts para criar status únicos.'
    },
    {
      icon: Download,
      title: 'Download Fácil',
      description: 'Baixe seus status em alta qualidade com um único clique.'
    },
    {
      icon: Share2,
      title: 'Compartilhamento Rápido',
      description: 'Compartilhe diretamente nas suas redes sociais favoritas.'
    },
    {
      icon: History,
      title: 'Histórico de Criações',
      description: 'Acesse suas criações anteriores a qualquer momento.'
    },
    {
      icon: Heart,
      title: 'Favoritos',
      description: 'Salve seus status favoritos para reutilizar quando quiser.'
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-black via-gray-dark to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50 mb-4">
            <Sparkles className="h-4 w-4 text-gold-luxury" />
            <span className="text-gray-300 text-sm font-medium">Recursos Poderosos</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white-pure mb-6">
            Tudo que você precisa em <span className="text-gradient">um só lugar</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Descubra as funcionalidades que tornam nossa ferramenta a melhor escolha para criar status incríveis
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass-effect rounded-2xl p-6 border border-gray-700/50 hover:border-gold-luxury/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-black-deep" />
                </div>
                <h3 className="text-xl font-bold text-white-pure mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="glass-effect rounded-2xl p-8 max-w-3xl mx-auto border border-gray-700/50">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-white-pure mb-2">Pronto para começar?</h3>
                <p className="text-gray-300">
                  Crie seu primeiro status incrível em segundos
                </p>
              </div>
              <motion.button
                className="btn-primary px-6 py-3 flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Criar Status Agora</span>
                <Zap className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
