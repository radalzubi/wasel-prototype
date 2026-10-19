import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, FileText, CheckCircle, ChevronRight, User } from 'lucide-react';

interface Props {
  onComplete: (name: string) => void;
}

const steps = [
  { id: 'welcome',   title: 'Join Wasel',       subtitle: "Earn more with Jordan's fairest ride-hailing platform", icon: Car },
  { id: 'profile',   title: 'Your Name',         subtitle: 'How should riders address you?',                       icon: User },
  { id: 'documents', title: 'Submit Documents',  subtitle: 'License, vehicle registration, and ID',               icon: FileText },
  { id: 'approved',  title: "You're Approved!",  subtitle: 'Start accepting rides and earning today',             icon: CheckCircle },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName]   = useState('');

  const current = steps[step];
  const Icon    = current.icon;
  const isLast  = step === steps.length - 1;

  function handleNext() {
    if (step === 1 && !name.trim()) return; // require name
    if (isLast) {
      onComplete(name.trim());
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        height: '100%',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        padding: 32,
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 48, marginTop: 24 }}>
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              height: 4,
              flex: i <= step ? 2 : 1,
              background: i <= step ? '#D4A843' : 'rgba(255,255,255,0.12)',
              borderRadius: 2,
              transition: 'all 0.4s ease',
            }}
          />
        ))}
      </div>

      {/* Icon */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ duration: 0.3 }}
          style={{
            width: 80, height: 80,
            background: 'rgba(212,168,67,0.12)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <Icon size={36} color="#D4A843" />
        </motion.div>
      </AnimatePresence>

      {/* Text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${step}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 10, lineHeight: 1.2 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 32 }}>
            {current.subtitle}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Name input on step 1 */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: '14px 16px', gap: 10, marginBottom: 16,
          }}>
            <User size={16} color="rgba(255,255,255,0.4)" />
            <input
              type="text"
              placeholder="e.g. Ahmad Al-Hassan"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              autoFocus
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'white', fontSize: 15, flex: 1,
                fontFamily: "'Sora', sans-serif",
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Document checklist on step 2 */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
          {["Driver's License", "Vehicle Registration", "National ID"].map((doc, i) => (
            <div key={doc} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, marginBottom: 8,
              color: 'rgba(255,255,255,0.7)', fontSize: 14,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: i < 2 ? 'rgba(212,168,67,0.2)' : 'transparent',
                border: i < 2 ? '1px solid rgba(212,168,67,0.5)' : '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i < 2 && <span style={{ fontSize: 10, color: '#D4A843' }}>✓</span>}
              </div>
              {doc}
            </div>
          ))}
        </motion.div>
      )}

      <div style={{ flex: 1 }} />

      {/* CTA Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleNext}
        disabled={step === 1 && !name.trim()}
        style={{
          width: '100%',
          background: isLast
            ? 'linear-gradient(135deg, #D4A843 0%, #C49B2E 100%)'
            : (step === 1 && !name.trim())
              ? 'rgba(212,168,67,0.07)'
              : 'rgba(212,168,67,0.15)',
          border: '1px solid rgba(212,168,67,0.4)',
          borderRadius: 18, padding: '16px 0',
          color: isLast ? '#111111' : '#D4A843',
          fontSize: 15, fontWeight: 700, cursor: (step === 1 && !name.trim()) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: "'Sora', sans-serif",
          opacity: (step === 1 && !name.trim()) ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
      >
        {isLast ? 'Start Driving' : 'Continue'}
        <ChevronRight size={18} />
      </motion.button>
    </motion.div>
  );
}
