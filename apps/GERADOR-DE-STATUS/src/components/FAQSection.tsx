'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Como funciona a criação de status com IA?',
      answer: 'Nossa inteligência artificial analisa o tema que você fornece e gera automaticamente um status criativo com design profissional. Você pode personalizar cores, fontes e layout conforme necessário.'
    },
    {
      question: 'Posso editar o status depois de gerado?',
      answer: 'Sim! Após gerar seu status, você pode editar o texto, ajustar cores, modificar o tamanho da fonte e fazer outras personalizações antes de baixar.'
    },
    {
      question: 'Os status gerados são únicos?',
      answer: 'Absolutamente. Cada status é gerado de forma única com base no tema fornecido, garantindo que seu conteúdo seja original e criativo.'
    },
    {
      question: 'Em quais formatos posso baixar os status?',
      answer: 'Você pode baixar seus status em formato PNG de alta qualidade, pronto para compartilhar em qualquer rede social.'
    },
    {
      question: 'Preciso criar uma conta para usar a ferramenta?',
      answer: 'Não, nossa ferramenta é totalmente gratuita e não requer criação de conta. Você pode começar a criar status imediatamente.'
    },
    {
      question: 'A ferramenta funciona em dispositivos móveis?',
      answer: 'Sim, nossa interface é totalmente responsiva e funciona perfeitamente em smartphones, tablets e desktops.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-gradient-to-b from-black via-gray-dark to-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50 mb-4">
            <HelpCircle className="h-4 w-4 text-gold-luxury" />
            <span className="text-gray-300 text-sm font-medium">Perguntas Frequentes</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white-pure mb-6">
            Dúvidas <span className="text-gradient">Frequentes</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Encontre respostas para as perguntas mais comuns sobre nossa ferramenta
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="glass-effect rounded-xl border border-gray-700/50 overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-800/30 transition-colors duration-200"
                onClick={() => toggleFAQ(index)}
              >
                <h3 className="text-lg font-semibold text-white-pure">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </motion.div>
              </button>
              
              <motion.div
                initial={false}
                animate={{ 
                  height: openIndex === index ? 'auto' : 0,
                  opacity: openIndex === index ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4">
                  <p className="text-gray-300">{faq.answer}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
