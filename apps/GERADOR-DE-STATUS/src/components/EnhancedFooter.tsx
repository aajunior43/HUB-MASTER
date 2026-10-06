'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Github, Twitter, Linkedin, Mail, ExternalLink } from 'lucide-react';

const EnhancedFooter = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'GitHub', icon: Github, url: '#' },
    { name: 'Twitter', icon: Twitter, url: '#' },
    { name: 'LinkedIn', icon: Linkedin, url: '#' },
    { name: 'Email', icon: Mail, url: '#' },
  ];

  const quickLinks = [
    { name: 'Início', href: '#home' },
    { name: 'Criar Status', href: '#creator-section' },
    { name: 'Histórico', href: '#history' },
    { name: 'FAQ', href: '#faq' },
  ];

  const features = [
    'Criação com IA',
    'Design Personalizado',
    'Download em PNG',
    'Compartilhamento Fácil',
  ];

  return (
    <footer className="relative bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-gray-800/50">
      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 to-transparent"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Sobre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-gold">
                <Sparkles className="h-5 w-5 text-black-deep" />
              </div>
              <h3 className="text-xl font-bold text-white-pure">
                Status<span className="text-gradient">AI</span>
              </h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Transforme suas ideias em imagens de status profissionais para redes sociais com a ajuda da inteligência artificial.
            </p>
          </motion.div>

          {/* Links Rápidos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <h4 className="text-lg font-semibold text-white-pure">Links Rápidos</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-gray-300 hover:text-gold-luxury transition-colors duration-300 text-sm flex items-center space-x-2"
                  >
                    <span>{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Recursos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <h4 className="text-lg font-semibold text-white-pure">Recursos</h4>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-gold-luxury rounded-full"></div>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Redes Sociais */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            <h4 className="text-lg font-semibold text-white-pure">Conecte-se</h4>
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.url}
                    className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:text-gold-luxury hover:border-gold-luxury transition-all duration-300"
                    whileHover={{ y: -3, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.a>
                );
              })}
            </div>
            <p className="text-gray-300 text-sm">
              Precisa de ajuda? <a href="mailto:suporte@statusai.com" className="text-gold-luxury hover:underline">Contate-nos</a>
            </p>
          </motion.div>
        </div>

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-t border-gray-800/50 mt-8 pt-8 text-center"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-gray-300 text-sm">
              © {currentYear} StatusAI Creator. Todos os direitos reservados.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-300 hover:text-gold-luxury text-sm transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="text-gray-300 hover:text-gold-luxury text-sm transition-colors">
                Política de Privacidade
              </a>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-xs">
              Desenvolvido com ❤️ por <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent font-bold">Aleksandro Alves</span>
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default EnhancedFooter;
