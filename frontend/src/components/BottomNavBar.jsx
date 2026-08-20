import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function BottomNavBar({ items, activeId, onChange }) {
  return (
    <motion.nav
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Bottom Navigation"
      className="capsule-nav"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        return (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.97 }}
            className={`capsule-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            type="button"
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
            <motion.div
              initial={false}
              animate={{
                width: isActive ? 68 : 0,
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? 6 : 0,
              }}
              transition={{
                width: { type: 'spring', stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className="capsule-nav-label-wrap"
            >
              <span className="capsule-nav-label" title={item.label}>
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}