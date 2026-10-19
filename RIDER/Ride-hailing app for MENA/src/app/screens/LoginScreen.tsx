import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ArrowRight, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  onAuthenticated: () => void;
}

type Step = 'phone' | 'otp';

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    return cleaned.startsWith('07') ? `+962${cleaned.slice(1)}` : `+${cleaned}`;
  }
  return cleaned;
}

export function LoginScreen({ onAuthenticated }: Props) {
  const { sendOtp, verifyOtp } = useAuth();
  const { lang, isRTL } = useLanguage();
  const font = isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif';

  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleSendOtp() {
    setError(null);
    const normalized = normalizePhone(phone.trim());
    if (!normalized || normalized.length < 8) {
      setError(lang === 'ar' ? 'أدخل رقماً صحيحاً' : 'Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(normalized);
      setPhone(normalized);
      setStep('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : lang === 'ar' ? 'فشل الإرسال' : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    if (otp.trim().length < 4) {
      setError(lang === 'ar' ? 'أدخل الرمز المكون من 6 أرقام' : 'Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, otp.trim());
      onAuthenticated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : lang === 'ar' ? 'رمز غير صحيح' : 'Invalid code, please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try { await sendOtp(phone); } catch { /* ignore */ }
    finally { setResending(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0,
        background: 'var(--bg-primary)',
        display: 'flex', flexDirection: 'column',
        fontFamily: font, direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      <div style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: 'calc(var(--wasel-safe-top, 0px) + 20px) 24px 24px',
      }}>
        <div style={{
          fontFamily: 'Cairo, sans-serif',
          fontSize: 36, color: 'var(--accent)', fontWeight: 800,
          marginBottom: 6,
        }}>
          واصل
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {lang === 'ar' ? 'أهلاً بك' : 'Welcome back'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {step === 'phone'
            ? (lang === 'ar' ? 'أدخل رقم هاتفك للمتابعة' : 'Enter your mobile number to continue')
            : (lang === 'ar' ? `تم إرسال الرمز إلى ${phone}` : `Code sent to ${phone}`)}
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 24px calc(24px + var(--wasel-safe-bottom, 0px))', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* ── Step 1: Phone ── */}
          {step === 'phone' && (
            <motion.div key="phone" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
              <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
                {lang === 'ar' ? 'رقم الهاتف' : 'MOBILE NUMBER'}
              </div>
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '4px 16px',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
              }}>
                <Phone size={16} color="var(--text-tertiary)" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder="+962 79 xxx xxxx"
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontFamily: font, fontSize: 16,
                    padding: '14px 0', outline: 'none',
                  }}
                />
              </div>

              {error && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSendOtp}
                disabled={loading}
                className="btn-gold"
                style={{
                  width: '100%', borderRadius: 18, padding: '16px 0',
                  fontWeight: 700, fontSize: 15, fontFamily: font,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? (lang === 'ar' ? 'جارٍ الإرسال…' : 'Sending…') : (
                  <>{lang === 'ar' ? 'أرسل الرمز' : 'Send Code'} <ArrowRight size={16} /></>
                )}
              </motion.button>

              <div style={{
                marginTop: 32, display: 'flex', alignItems: 'center', gap: 8,
                justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 12,
              }}>
                <Shield size={13} color="var(--text-tertiary)" />
                {lang === 'ar' ? 'مُأمَّن بـ Supabase Auth' : 'Secured by Supabase Auth · Jordan'}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <motion.div key="otp" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
              <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
                {lang === 'ar' ? 'رمز التحقق' : 'VERIFICATION CODE'}
              </div>
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, marginBottom: 10,
              }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="123456"
                  maxLength={6}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontFamily: font, fontSize: 32,
                    padding: '16px 0', outline: 'none',
                    textAlign: 'center', letterSpacing: '0.3em', fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleResend} disabled={resending}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                  fontFamily: font, fontSize: 12, cursor: 'pointer', marginBottom: 24,
                  padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <RefreshCw size={12} />
                {resending ? (lang === 'ar' ? 'جارٍ الإعادة…' : 'Resending…') : (lang === 'ar' ? 'أعد إرسال الرمز' : 'Resend code')}
              </button>

              {error && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <motion.button
                whileTap={{ scale: 0.97 }} onClick={handleVerifyOtp} disabled={loading}
                className="btn-gold"
                style={{
                  width: '100%', borderRadius: 18, padding: '16px 0',
                  fontWeight: 700, fontSize: 15, fontFamily: font,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? (lang === 'ar' ? 'جارٍ التحقق…' : 'Verifying…') : (lang === 'ar' ? 'تحقق وسجّل الدخول' : 'Verify & Sign In')}
              </motion.button>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
                style={{
                  marginTop: 16, width: '100%', background: 'transparent', border: 'none',
                  color: 'var(--text-tertiary)', fontFamily: font, fontSize: 13, cursor: 'pointer',
                }}
              >
                {lang === 'ar' ? '← تغيير الرقم' : '← Change number'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
