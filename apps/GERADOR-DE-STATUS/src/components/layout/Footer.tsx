'use client';

import React from 'react';
import { motion } from 'framer-motion';

const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-gray-300 text-sm">
              DEV <span className="text-gradient font-semibold">ALEKSANDRO ALVES</span>
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;