import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ArrowRight, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const T = {
  bg:          '#000000',
  surface:     '#0E0E0E',
  card:        '#181818',
  cardBorder:  'rgba(255,255,255,0.08)',
  accent:      '#D4A843',
  accentDim:   'rgba(212,168,67,0.12)',
  accentBorder:'rgba(212,168,67,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textMuted:   'rgba(255,255,255,0.28)',
  error:       '#F87171',
};

const STRINGS = {
  en: {
    portal:      'Driver Portal',
    phoneHint:   'Enter your mobile number to continue',
    otpHint:     (p: string) => `Code sent to ${p}`,
    mobileLabel: 'MOBILE NUMBER',
    placeholder: '+962 79 xxx xxxx',
    send:        'Send Code',
    sending:     'Sending…',
    otpLabel:    'VERIFICATION CODE',
    verify:      'Verify & Sign In',
    verifying:   'Verifying…',
    resend:      'Resend code',
    resending:   'Resending…',
    changNum:    '← Change number',
    errPhone:    'Please enter a valid phone number',
    errOtp:      'Please enter the 6-digit code',
    trust:       'Secured by Supabase Auth · Jordan',
  },
  ar: {
    portal:      'بوابة السائق',
    phoneHint:   'أدخل رقم هاتفك للمتابعة',
    otpHint:     (p: string) => `تم إرسال الرمز إلى ${p}`,
    mobileLabel: 'رقم الجوال',
    placeholder: '+962 79 xxx xxxx',
    send:        'إرسال الرمز',
    sending:     'جارٍ الإرسال…',
    otpLabel:    'رمز التحقق',
    verify:      'تحقق وتسجيل الدخول',
    verifying:   'جارٍ التحقق…',
    resend:      'إعادة الإرسال',
    resending:   'جارٍ إعادة الإرسال…',
    changNum:    'تغيير الرقم ←',
    errPhone:    'يرجى إدخال رقم هاتف صحيح',
    errOtp:      'يرجى إدخال رمز التحقق المكوّن من 6 أرقام',
    trust:       'مؤمَّن بواسطة Supabase Auth · الأردن',
  },
};

interface Props { onAuthenticated: () => void; }
type Step = 'phone' | 'otp';
type Lang = 'en' | 'ar';

export function LoginScreen({ onAuthenticated }: Props) {
  const { sendOtp, verifyOtp } = useAuth();

  const [lang, setLang]           = useState<Lang>('en');
  const [step, setStep]           = useState<Step>('phone');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const s    = STRINGS[lang];
  const isAr = lang === 'ar';
  const font = isAr ? "'Cairo', 'Tajawal', sans-serif" : "'Sora', sans-serif";
  const dir  = isAr ? ('rtl' as const) : ('ltr' as const);

  function normalizePhone(raw: string) {
    const cleaned = raw.replace(/[\s\-()]/g, '');
    if (!cleaned.startsWith('+')) {
      return cleaned.startsWith('07') ? `+962${cleaned.slice(1)}` : `+${cleaned}`;
    }
    return cleaned;
  }

  async function handleSendOtp() {
    setError(null);
    const normalized = normalizePhone(phone.trim());
    if (!normalized || normalized.length < 8) { setError(s.errPhone); return; }
    setLoading(true);
    try {
      await sendOtp(normalized);
      setPhone(normalized);
      setStep('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : s.errPhone);
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp() {
    setError(null);
    if (otp.trim().length < 4) { setError(s.errOtp); return; }
    setLoading(true);
    try {
      await verifyOtp(phone, otp.trim());
      onAuthenticated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : s.errOtp);
    } finally { setLoading(false); }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try { await sendOtp(phone); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to resend'); }
    finally { setResending(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ height: '100%', background: T.bg, display: 'flex', flexDirection: 'column', fontFamily: font, direction: dir }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '56px 24px 28px', background: T.surface, borderBottom: `1px solid ${T.cardBorder}`, position: 'relative' }}>

        {/* Language toggle */}
        <button
          onClick={() => { setLang(l => l === 'en' ? 'ar' : 'en'); setError(null); }}
          style={{
            position: 'absolute', top: 18,
            [isAr ? 'left' : 'right']: 20,
            background: T.accentDim, border: `1px solid ${T.accentBorder}`,
            borderRadius: 10, padding: '5px 14px',
            color: T.accent, fontFamily: font, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.03em',
          }}
        >
          {lang === 'en' ? 'عربي' : 'EN'}
        </button>

        {/* Wordmark */}
        <div style={{ fontFamily: "'Tajawal','Cairo',sans-serif", fontSize: 34, color: T.accent, fontWeight: 800, direction: 'rtl', marginBottom: 6, lineHeight: 1 }}>
          واصل
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>
          {s.portal}
        </div>
        <div style={{ fontSize: 13, color: T.textMuted }}>
          {step === 'phone' ? s.phoneHint : s.otpHint(phone)}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* Step 1 — Phone */}
          {step === 'phone' && (
            <motion.div key="phone"
              initial={{ x: isAr ? -36 : 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isAr ? 36 : -36, opacity: 0 }}
            >
              <div style={{ marginBottom: 8, fontSize: 11, color: T.textMuted, letterSpacing: isAr ? 0 : '0.06em', fontWeight: 600 }}>
                {s.mobileLabel}
              </div>

              <div style={{
                background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '4px 16px',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                flexDirection: isAr ? 'row-reverse' : 'row',
              }}>
                <Phone size={16} color={T.textMuted} />
                <input
                  type="tel" value={phone} dir="ltr"
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder={s.placeholder}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: T.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: 16,
                    padding: '14px 0', outline: 'none',
                    textAlign: isAr ? 'right' : 'left',
                  }}
                />
              </div>

              {error && <div style={{ color: T.error, fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <motion.button
                whileTap={{ scale: 0.97 }} onClick={handleSendOtp} disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? 'rgba(212,168,67,0.3)' : 'linear-gradient(135deg,#D4A843,#C49B2E)',
                  border: 'none', borderRadius: 18, padding: '16px 0',
                  color: '#111', fontWeight: 700, fontSize: 15, fontFamily: font,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  flexDirection: isAr ? 'row-reverse' : 'row',
                }}
              >
                {loading ? s.sending : <>{s.send} <ArrowRight size={16} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} /></>}
              </motion.button>

              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', color: T.textMuted, fontSize: 11, flexDirection: isAr ? 'row-reverse' : 'row' }}>
                <Shield size={12} color={T.textMuted} />
                {s.trust}
              </div>
            </motion.div>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <motion.div key="otp"
              initial={{ x: isAr ? -36 : 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isAr ? 36 : -36, opacity: 0 }}
            >
              <div style={{ marginBottom: 8, fontSize: 11, color: T.textMuted, letterSpacing: isAr ? 0 : '0.06em', fontWeight: 600 }}>
                {s.otpLabel}
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '4px 16px', marginBottom: 10 }}>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" dir="ltr"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="• • • • • •"
                  autoFocus
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    color: T.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: 28,
                    padding: '16px 0', outline: 'none',
                    textAlign: 'center', letterSpacing: '0.3em', fontWeight: 700,
                  }}
                />
              </div>

              <button
                onClick={handleResend} disabled={resending}
                style={{
                  background: 'transparent', border: 'none', color: T.textMuted,
                  fontFamily: font, fontSize: 12, cursor: 'pointer',
                  marginBottom: 24, padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                  flexDirection: isAr ? 'row-reverse' : 'row',
                  width: '100%', justifyContent: isAr ? 'flex-end' : 'flex-start',
                }}
              >
                <RefreshCw size={12} />
                {resending ? s.resending : s.resend}
              </button>

              {error && <div style={{ color: T.error, fontSize: 13, marginBottom: 16, textAlign: isAr ? 'right' : 'left' }}>{error}</div>}

              <motion.button
                whileTap={{ scale: 0.97 }} onClick={handleVerifyOtp} disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? 'rgba(212,168,67,0.3)' : 'linear-gradient(135deg,#D4A843,#C49B2E)',
                  border: 'none', borderRadius: 18, padding: '16px 0',
                  color: '#111', fontWeight: 700, fontSize: 15, fontFamily: font,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? s.verifying : s.verify}
              </motion.button>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
                style={{
                  marginTop: 16, width: '100%', background: 'transparent', border: 'none',
                  color: T.textMuted, fontFamily: font, fontSize: 13, cursor: 'pointer', textAlign: 'center',
                }}
              >
                {s.changNum}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
