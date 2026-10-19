import React, { useEffect, useState } from 'react';
import {
  User, MapPin, Clock, CreditCard, Shield, Globe, Info,
  Car, Bell, HelpCircle, LogOut, ChevronRight, Star, Edit2,
  Home, Briefcase, Plus, Check, Phone, Mail, Moon,
} from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TripHistoryScreen } from './TripHistoryScreen';

type SettingsView = 'main' | 'profile' | 'places' | 'history' | 'payment' | 'safety' | 'about' | 'notifications' | 'becomeDriver';

const glassCard: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
};

interface Props {
  onLogout?: () => void;
}

export function SettingsScreen({ onLogout }: Props) {
  const { lang, isRTL, t, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { session, logout, updateProfile } = useAuth();
  const fontFamily = isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif';
  const [view, setView] = useState<SettingsView>('main');
  const [notifRideUpdates, setNotifRideUpdates] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);
  const [notifNews, setNotifNews] = useState(true);
  const [notifRating, setNotifRating] = useState(true);
  const [profileName, setProfileName] = useState(session?.name || (lang === 'ar' ? '' : ''));
  const [profilePhone, setProfilePhone] = useState(session?.phone || '');
  const [profileEmail, setProfileEmail] = useState(session?.email || '');

  useEffect(() => {
    setProfileName(session?.name || '');
    setProfilePhone(session?.phone || '');
    setProfileEmail(session?.email || '');
  }, [session?.email, session?.name, session?.phone]);

  const slideIn: Variants = {
    hidden: { x: isRTL ? -300 : 300, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
    exit: { x: isRTL ? -300 : 300, opacity: 0, transition: { duration: 0.2 } },
  };

  const SubHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <div
      className="flex items-center gap-3 px-4 wasel-safe-top pb-4"
      style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
    >
      <button
        onClick={onBack}
        className="rounded-full flex items-center justify-center"
        style={{ width: 36, height: 36, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <ChevronRight size={20} color="var(--text-secondary)" style={{ transform: isRTL ? 'none' : 'rotate(180deg)' }} />
      </button>
      <h2 style={{ fontFamily, fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{title}</h2>
    </div>
  );

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-primary)', direction: isRTL ? 'rtl' : 'ltr' }}
    >
      <AnimatePresence mode="wait">

        {/* MAIN SETTINGS */}
        {view === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Header */}
            <div
              className="px-4 wasel-safe-top pb-6"
              style={{
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="rounded-2xl flex items-center justify-center text-2xl"
                  style={{ width: 60, height: 60, background: 'var(--accent-subtle)', border: '2px solid rgba(212,168,67,0.35)' }}
                >
                  👤
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily, fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{profileName}</div>
                  <div style={{ fontFamily, fontSize: 12.5, color: 'var(--text-tertiary)' }}>{profilePhone}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    {[1,2,3,4,5].map(s => <Star key={s} size={11} fill="#D4A843" color="#D4A843" />)}
                    <span style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                      5.0 · 12 {lang === 'ar' ? 'رحلة' : 'trips'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setView('profile')}>
                  <Edit2 size={17} color="var(--text-tertiary)" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 wasel-scroll-pad" style={{ scrollbarWidth: 'none' }}>

              {/* Language toggle */}
              <div
                className="rounded-2xl p-4 mb-3 flex items-center justify-between"
                style={glassCard}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: 'var(--accent-subtle)' }}>
                    <Globe size={19} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{t('language')}</div>
                    <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>{lang === 'ar' ? 'العربية' : 'English'}</div>
                  </div>
                </div>
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {['en', 'ar'].map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l as 'en' | 'ar')}
                      className="px-3 py-1.5 transition-all"
                      style={{
                        background: lang === l ? 'var(--chip-active-bg)' : 'var(--chip-bg)',
                        color: lang === l ? 'var(--chip-active-text)' : 'var(--text-secondary)',
                        fontFamily: l === 'ar' ? 'Cairo, sans-serif' : 'Sora, sans-serif',
                        fontSize: 12,
                        fontWeight: lang === l ? 700 : 400,
                      }}
                    >
                      {l === 'en' ? 'EN' : 'ع'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme toggle */}
              <div
                className="rounded-2xl p-4 mb-3 flex items-center justify-between"
                style={glassCard}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: 'var(--accent-subtle)' }}>
                    <Moon size={19} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                      {lang === 'ar' ? 'المظهر' : 'Appearance'}
                    </div>
                    <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {theme === 'dark' ? (lang === 'ar' ? 'داكن' : 'Dark') : (lang === 'ar' ? 'فاتح' : 'Light')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="rounded-full relative flex-shrink-0"
                  style={{ width: 46, height: 26, background: theme === 'dark' ? '#D4A843' : 'var(--border-strong)', transition: 'background 0.2s' }}
                >
                  <motion.div
                    animate={{ x: theme === 'dark' ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="rounded-full absolute"
                    style={{ width: 20, height: 20, background: 'white', top: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                  />
                </button>
              </div>

              {/* Menu sections */}
              {[
                {
                  items: [
                    { icon: <User size={18} color="#60A5FA" />, bg: 'rgba(96,165,250,0.1)', label: t('profile'), view: 'profile' as SettingsView },
                    { icon: <MapPin size={18} color="#34D399" />, bg: 'rgba(52,211,153,0.1)', label: t('savedPlaces'), view: 'places' as SettingsView },
                    { icon: <Clock size={18} color="#FBBF24" />, bg: 'rgba(251,191,36,0.1)', label: t('rideHistory'), view: 'history' as SettingsView },
                  ],
                },
                {
                  items: [
                    { icon: <CreditCard size={18} color="#A78BFA" />, bg: 'rgba(167,139,250,0.1)', label: t('payment'), view: 'payment' as SettingsView },
                    { icon: <Shield size={18} color="#F87171" />, bg: 'rgba(248,113,113,0.1)', label: t('safety'), view: 'safety' as SettingsView },
                    { icon: <Bell size={18} color="#60A5FA" />, bg: 'rgba(96,165,250,0.1)', label: t('notifications'), view: 'notifications' as SettingsView },
                  ],
                },
                {
                  items: [
                    { icon: <Car size={18} color="#D4A843" />, bg: 'rgba(212,168,67,0.1)', label: t('becomeDriver'), view: 'becomeDriver' as SettingsView },
                    { icon: <Info size={18} color="var(--text-secondary)" />, bg: 'var(--bg-input)', label: t('about'), view: 'about' as SettingsView },
                    { icon: <HelpCircle size={18} color="#34D399" />, bg: 'rgba(52,211,153,0.1)', label: t('helpSupport'), view: 'main' as SettingsView },
                  ],
                },
              ].map((section, si) => (
                <div key={si} className="rounded-2xl overflow-hidden mb-3" style={glassCard}>
                  {section.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setView(item.view)}
                      className="w-full flex items-center gap-3 px-4 py-3.5"
                      style={{
                        borderBottom: i < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                        direction: isRTL ? 'rtl' : 'ltr',
                      }}
                    >
                      <div className="rounded-xl flex items-center justify-center" style={{ width: 38, height: 38, background: item.bg, flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <span style={{ fontFamily, fontWeight: 500, fontSize: 13.5, color: 'var(--text-primary)', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                        {item.label}
                      </span>
                      <ChevronRight size={15} color="var(--text-tertiary)" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                    </button>
                  ))}
                </div>
              ))}

              {/* Logout */}
              <button
                onClick={() => { logout(); onLogout?.(); }}
                className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 mb-3"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
              >
                <LogOut size={16} color="#F87171" />
                <span style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: '#F87171' }}>{t('logout')}</span>
              </button>

              {/* Footer */}
              <div className="text-center pb-2">
                <div style={{ fontFamily, fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{t('madeInJordan')}</div>
                <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{t('version')} 1.0.0 · © 2026 Wasel</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PROFILE */}
        {view === 'profile' && (
          <motion.div key="profile" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('editProfile')} onBack={() => setView('main')} />
            <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
              <div className="flex flex-col items-center mb-6">
                <div
                  className="rounded-2xl flex items-center justify-center text-4xl mb-3"
                  style={{ width: 80, height: 80, background: 'var(--accent-subtle)', border: '2px solid rgba(212,168,67,0.35)' }}
                >
                  👤
                </div>
                <button style={{ fontFamily, fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>
                  {lang === 'ar' ? 'تغيير الصورة' : 'Change Photo'}
                </button>
              </div>
              {/* Phone is read-only — it is the auth identity and cannot be changed here */}
              <div className="rounded-2xl p-4 mb-3" style={glassCard}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ color: 'var(--text-tertiary)' }}><Phone size={15} /></span>
                  <label style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>{t('phoneLabel')}</label>
                </div>
                <div
                  style={{ fontFamily, fontSize: 15, color: 'var(--text-secondary)', fontWeight: 600, direction: 'ltr', opacity: 0.6 }}
                >
                  {profilePhone}
                </div>
              </div>
              {[
                { icon: <User size={15} />, label: t('nameLabel'), value: profileName, setter: setProfileName },
                { icon: <Mail size={15} />, label: t('emailLabel'), value: profileEmail, setter: setProfileEmail },
              ].map((field, i) => (
                <div key={i} className="rounded-2xl p-4 mb-3" style={glassCard}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ color: 'var(--text-tertiary)' }}>{field.icon}</span>
                    <label style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>{field.label}</label>
                  </div>
                  <input
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    className="w-full outline-none bg-transparent"
                    style={{ fontFamily, fontSize: 15, color: 'var(--text-primary)', fontWeight: 600, direction: isRTL ? 'rtl' : 'ltr' }}
                  />
                </div>
              ))}
              <button
                onClick={() => { updateProfile({ name: profileName, email: profileEmail }); setView('main'); }}
                className="w-full rounded-2xl py-4 btn-gold"
                style={{ fontFamily, fontWeight: 700, fontSize: 15 }}
              >
                {t('saveChanges')}
              </button>
            </div>
          </motion.div>
        )}

        {/* SAVED PLACES */}
        {view === 'places' && (
          <motion.div key="places" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('savedPlacesTitle')} onBack={() => setView('main')} />
            <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
              {[
                {
                  icon: <Home size={18} color="white" />,
                  bg: 'rgba(96,165,250,0.2)',
                  label: t('homePlace'),
                  addr: session?.savedHome?.address || session?.savedHome?.label || (lang === 'ar' ? 'غير محفوظ بعد' : 'Not saved yet'),
                },
                {
                  icon: <Briefcase size={18} color="white" />,
                  bg: 'rgba(212,168,67,0.2)',
                  label: t('workPlace'),
                  addr: session?.savedWork?.address || session?.savedWork?.label || (lang === 'ar' ? 'غير محفوظ بعد' : 'Not saved yet'),
                },
              ].map((place, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-4 mb-3" style={glassCard}>
                  <div className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, background: place.bg }}>
                    {place.icon}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{place.label}</div>
                    <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>{place.addr}</div>
                  </div>
                  <Check size={15} color={place.addr.includes('Not saved') || place.addr.includes('غير محفوظ') ? 'var(--text-tertiary)' : '#34D399'} />
                </div>
              ))}
              <div
                className="w-full rounded-2xl p-4"
                style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-strong)' }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Plus size={17} color="var(--text-secondary)" />
                  <span style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: 'var(--text-secondary)' }}>{t('addPlace')}</span>
                </div>
                <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  {lang === 'ar' ? 'احفظ نقطة الالتقاط الحالية من الشاشة الرئيسية كمنزل أو عمل.' : 'Save your current pickup from the home screen as Home or Work.'}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* RIDE HISTORY */}
        {view === 'history' && (
          <motion.div key="history" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('rideHistory')} onBack={() => setView('main')} />
            <TripHistoryScreen />
          </motion.div>
        )}

        {/* PAYMENT */}
        {view === 'payment' && (
          <motion.div key="payment" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('paymentMethod')} onBack={() => setView('main')} />
            <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
              {[
                { icon: '💵', label: lang === 'ar' ? 'نقداً' : 'Cash', desc: lang === 'ar' ? 'الافتراضي — الأكثر شيوعاً في الأردن' : 'Default — Most common in Jordan', selected: true },
                { icon: '💳', label: lang === 'ar' ? 'بطاقة ائتمان / مدين' : 'Credit / Debit Card', desc: lang === 'ar' ? 'أضف بطاقتك' : 'Add your card', selected: false },
                { icon: '📱', label: 'CliQ', desc: lang === 'ar' ? 'الدفع الفوري الأردني' : 'Jordanian instant payment', selected: false },
              ].map((method, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl p-4 mb-3"
                  style={{
                    background: method.selected ? 'var(--accent-subtle)' : 'var(--bg-card)',
                    border: `1.5px solid ${method.selected ? 'rgba(212,168,67,0.35)' : 'var(--border)'}`,
                    borderRadius: 16,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{method.icon}</span>
                  <div className="flex-1">
                    <div style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{method.label}</div>
                    <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>{method.desc}</div>
                  </div>
                  {method.selected && <Check size={16} color="#D4A843" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SAFETY */}
        {view === 'safety' && (
          <motion.div key="safety" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('safety')} onBack={() => setView('main')} />
            <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
              <div
                className="rounded-2xl p-5 mb-4 text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
                <div style={{ fontFamily, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{t('safetyDesc')}</div>
                <div style={{ fontFamily, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {lang === 'ar' ? 'ميزات أمان متقدمة لحمايتك في كل رحلة' : 'Advanced safety features for every ride'}
                </div>
              </div>
              {[
                { icon: '🆘', label: lang === 'ar' ? 'طوارئ SOS' : 'Emergency SOS', desc: lang === 'ar' ? 'اتصال فوري بالطوارئ وإشعار جهات الاتصال' : 'Instant emergency call & notify contacts' },
                { icon: '📍', label: lang === 'ar' ? 'مشاركة الرحلة' : 'Share Trip', desc: lang === 'ar' ? 'شارك موقعك مع العائلة والأصدقاء' : 'Share live location with family & friends' },
                { icon: '🔒', label: lang === 'ar' ? 'التحقق من السائق' : 'Driver Verification', desc: lang === 'ar' ? 'جميع السائقين تم فحصهم والتحقق منهم' : 'All drivers are screened & verified' },
                { icon: '📷', label: lang === 'ar' ? 'رمز السلامة' : 'Safety Code', desc: lang === 'ar' ? 'تحقق من السائق برمز فريد' : 'Verify your driver with a unique code' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-4 mb-3" style={glassCard}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ABOUT */}
        {view === 'about' && (
          <motion.div key="about" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('about')} onBack={() => setView('main')} />
            <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
              <div className="flex flex-col items-center py-6 mb-4">
                <div
                  className="rounded-2xl flex items-center justify-center mb-3"
                  style={{ width: 80, height: 80, background: 'var(--accent-subtle)', border: '2px solid rgba(212,168,67,0.3)' }}
                >
                  <span style={{ fontSize: 44, color: 'var(--accent)', fontFamily: 'Cairo, sans-serif', fontWeight: 800 }}>و</span>
                </div>
                <div style={{ fontFamily, fontWeight: 800, fontSize: 26, color: 'var(--text-primary)' }}>Wasel · واصل</div>
                <div style={{ fontFamily, fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>{t('tagline')}</div>
              </div>
              {[
                { icon: '🚗', title: t('driverFirst'), desc: lang === 'ar' ? 'السائقون يدفعون اشتراكاً شهرياً ثابتاً ويحتفظون بـ 100% من الأرباح' : 'Drivers pay a flat monthly subscription and keep 100% of earnings' },
                { icon: '⚡', title: t('noSurge'), desc: lang === 'ar' ? 'التسعير الخوارزمي يضمن أسعاراً عادلة دون مضاعفة' : 'Algorithmic pricing ensures fair fares without surge multipliers' },
                { icon: '💵', title: t('cashDefault'), desc: lang === 'ar' ? 'النقد هو طريقة الدفع الافتراضية، مطابقاً لطريقة السوق المحلي' : 'Cash is the default, matching how most people in the region pay' },
                { icon: '🌍', title: lang === 'ar' ? 'مبني للمنطقة' : 'Built for the Region', desc: lang === 'ar' ? 'تجربة ثنائية اللغة مع دعم كامل للغة العربية من اليمين لليسار' : 'Fully bilingual with complete Arabic RTL support from day one' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl p-4 mb-3" style={glassCard}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontFamily, fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontFamily, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
              <div className="text-center py-4">
                <div style={{ fontFamily, fontSize: 12.5, color: 'var(--text-tertiary)' }}>{t('madeInJordan')}</div>
                <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{t('version')} 1.0.0 · Amman, Jordan</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* NOTIFICATIONS */}
        {view === 'notifications' && (
          <motion.div key="notifications" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('notifications')} onBack={() => setView('main')} />
            <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
              {[
                { icon: '🚗', label: lang === 'ar' ? 'تحديثات الرحلة' : 'Ride Updates', desc: lang === 'ar' ? 'وصول السائق، بدء الرحلة، الوصول' : 'Driver arrival, trip start, destination', value: notifRideUpdates, setter: setNotifRideUpdates },
                { icon: '🎁', label: lang === 'ar' ? 'العروض والخصومات' : 'Promotions & Deals', desc: lang === 'ar' ? 'كودات الخصم والعروض الخاصة' : 'Discount codes and special offers', value: notifPromos, setter: setNotifPromos },
                { icon: '📰', label: lang === 'ar' ? 'تنبيهات الأخبار' : 'News Alerts', desc: lang === 'ar' ? 'آخر الأخبار المحلية والمحتوى المميز' : 'Breaking local news and featured content', value: notifNews, setter: setNotifNews },
                { icon: '⭐', label: lang === 'ar' ? 'تذكير التقييم' : 'Rating Reminders', desc: lang === 'ar' ? 'تذكير لتقييم رحلتك بعد وصولك' : 'Reminder to rate your driver after arrival', value: notifRating, setter: setNotifRating },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-4 mb-3" style={glassCard}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                  <div className="flex-1">
                    <div style={{ fontFamily, fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)' }}>{item.desc}</div>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => item.setter(!item.value)}
                    className="rounded-full relative flex-shrink-0"
                    style={{ width: 46, height: 26, background: item.value ? '#D4A843' : 'var(--border-strong)', transition: 'background 0.2s' }}
                  >
                    <motion.div
                      animate={{ x: item.value ? 22 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="rounded-full absolute"
                      style={{ width: 20, height: 20, background: 'white', top: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* BECOME A DRIVER */}
        {view === 'becomeDriver' && (
          <motion.div key="becomeDriver" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col">
            <SubHeader title={t('becomeDriver')} onBack={() => setView('main')} />
            <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
              {/* Hero */}
              <div
                className="rounded-2xl p-5 mb-4 text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent-subtle)' }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>🚗</div>
                <div style={{ fontFamily, fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 4 }}>{t('driverFirst')}</div>
                <div style={{ fontFamily, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {lang === 'ar' ? 'اشتراك شهري ثابت — لا عمولة على كل رحلة' : 'Flat monthly subscription — zero per-ride commission'}
                </div>
              </div>

              {/* Plan cards */}
              {[
                {
                  tier: lang === 'ar' ? 'ستارتر' : 'Starter',
                  fee: 'JD 20 / mo',
                  cap: lang === 'ar' ? '٦ رحلات / يوم' : '6 rides / day',
                  perks: lang === 'ar' ? ['يخدم رحلات Normal', 'دعم عملاء أساسي', 'تطبيق السائق الكامل'] : ['Serves Normal rides', 'Basic driver support', 'Full driver app'],
                  color: '#60A5FA',
                },
                {
                  tier: lang === 'ar' ? 'كور' : 'Core',
                  fee: 'JD 35 / mo',
                  cap: lang === 'ar' ? '٩ رحلات / يوم' : '9 rides / day',
                  perks: lang === 'ar' ? ['يخدم Normal + Comfort', 'دعم ذو أولوية', 'شارة Core المميزة'] : ['Serves Normal + Comfort', 'Priority support', 'Core badge'],
                  color: '#34D399',
                },
                {
                  tier: lang === 'ar' ? 'برو' : 'Pro',
                  fee: 'JD 55 / mo',
                  cap: lang === 'ar' ? '١٢ رحلة / يوم' : '12 rides / day',
                  perks: lang === 'ar' ? ['يخدم جميع الرحلات', 'دعم VIP ٢٤/٧', 'شارة Pro الذهبية'] : ['Serves all ride types', 'VIP 24/7 support', 'Gold Pro badge'],
                  color: '#D4A843',
                },
              ].map((plan, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 mb-3"
                  style={{ background: 'var(--bg-card)', borderLeft: `3px solid ${plan.color}`, border: `1px solid var(--border)`, borderLeftWidth: 3, borderLeftColor: plan.color }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <div style={{ fontFamily, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{plan.tier}</div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontFamily, fontWeight: 800, fontSize: 17, color: plan.color }}>{plan.fee}</div>
                      <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{plan.cap}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {plan.perks.map((perk, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div className="rounded-full flex items-center justify-center" style={{ width: 16, height: 16, background: `${plan.color}18`, flexShrink: 0 }}>
                          <span style={{ fontSize: 9, color: plan.color, fontWeight: 700 }}>✓</span>
                        </div>
                        <span style={{ fontFamily, fontSize: 12, color: 'var(--text-secondary)' }}>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                className="w-full rounded-2xl py-4 btn-gold mt-1"
                style={{ fontFamily, fontWeight: 700, fontSize: 15 }}
              >
                {lang === 'ar' ? 'قدّم طلبك الآن' : 'Apply Now'}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
