'use client'

import { motion } from 'framer-motion'
import { useSkipLinks } from '../../hooks/useAccessibility'

export default function SkipLinks() {
  const { skipToMain, skipToNav } = useSkipLinks()

  return (
    <div className="sr-only focus-within:not-sr-only">
      <motion.nav
        className="fixed top-0 left-0 z-[9999] bg-blue-600 text-white p-2 rounded-br-lg shadow-lg"
        initial={{ y: -100 }}
        whileFocus={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        aria-label="Links de navegação rápida"
      >
        <ul className="flex gap-2">
          <li>
            <button
              onClick={skipToMain}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-800 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-colors"
            >
              Pular para conteúdo principal
            </button>
          </li>
          <li>
            <button
              onClick={skipToNav}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-800 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-colors"
            >
              Pular para navegação
            </button>
          </li>
        </ul>
      </motion.nav>
    </div>
  )
}
