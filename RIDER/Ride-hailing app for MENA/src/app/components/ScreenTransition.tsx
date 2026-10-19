import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

const NAV_ORDER = ['home', 'news', 'explore', 'settings'] as const;
type Screen = (typeof NAV_ORDER)[number];

interface ScreenTransitionProps {
  screen: Screen | string;
  children: React.ReactNode;
}

const variants = {
  enter: {
    opacity: 0,
    x: 20,
  },
  center: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -20,
  },
};

export function ScreenTransition({ screen, children }: ScreenTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={screen}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
