'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, User } from 'lucide-react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Influenciadora Digital',
      content: 'Essa ferramenta revolucionou minha criação de conteúdo. Os status gerados são sempre criativos e visualmente impressionantes!',
      avatar: null,
      rating: 5
    },
    {
      name: 'Carlos Oliveira',
      role: 'Empreendedor',
      content: 'Economizo horas criando posts para minhas redes sociais. A IA entende exatamente o que quero comunicar.',
      avatar: null,
      rating: 5
    },
    {
      name: 'Ana Costa',
      role: 'Designer',
      content: 'Mesmo sendo designer, uso essa ferramenta como inspiração. A combinação de IA e design é perfeita!',
      avatar: null,
      rating: 5
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
            <Quote className="h-4 w-4 text-gold-luxury" />
            <span className="text-gray-300 text-sm font-medium">Depoimentos</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white-pure mb-6">
            O que dizem nossos <span className="text-gradient">usuários</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Veja como nossa ferramenta está transformando a criação de conteúdo para milhares de usuários
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-effect rounded-2xl p-6 border border-gray-700/50 hover:border-gold-luxury/30 transition-all duration-300"
            >
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-gold-luxury fill-current" />
                ))}
              </div>
              
              <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
              
              <div className="flex items-center">
                {testimonial.avatar ? (
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                    <User className="h-5 w-5 text-black-deep" />
                  </div>
                )}
                <div className="ml-3">
                  <h4 className="text-white-pure font-semibold">{testimonial.name}</h4>
                  <p className="text-gray-400 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
