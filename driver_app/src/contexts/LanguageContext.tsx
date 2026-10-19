import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'en' | 'ar';

const strings = {
  en: {
    driverPortal:    'Driver Portal',
    enterPhone:      'Enter your mobile number to continue',
    codeSentTo:      'Code sent to',
    mobileNumber:    'MOBILE NUMBER',
    phonePlaceholder:'+962 79 xxx xxxx',
    sendCode:        'Send Code',
    sending:         'Sending…',
    verifyCode:      'VERIFICATION CODE',
    resendCode:      'Resend code',
    resending:       'Resending…',
    verifySignIn:    'Verify & Sign In',
    verifying:       'Verifying…',
    changeNumber:    '← Change number',
    secured:         'Secured by Supabase Auth · Jordan',
    // Dashboard
    online:          'Online · Ready for rides',
    offline:         'Offline · Tap to go online',
    goingOnline:     'Going online…',
    goingOffline:    'Going offline…',
    totalTrips:      'Total Trips',
    rating:          'Rating',
    riderAvg:        'Rider average',
    acceptance:      'Acceptance',
    allTime:         'All time',
    subscription:    'Subscription',
    yourVehicle:     'Your Vehicle',
    edit:            'Edit',
    verified:        'Vehicle Verified · Insurance Active',
    upgradeInfo:     'Upgrade for higher dispatch priority',
    testRide:        'Test Ride Offer (Dev)',
    waitingRide:     'Waiting for Ride Offer…',
    recentTrips:     'RECENT TRIPS',
    recentEarnings:  'RECENT EARNINGS',
    signOut:         'Sign out',
    // Subscription
    chooseTier:      'Choose Your Tier',
    higherTier:      'Higher tier = more rides dispatched to you',
    currentPlan:     '✓ CURRENT PLAN',
    popular:         'POPULAR',
    activePlan:      '✓ Active Plan',
    switchTo:        'Switch to',
    switching:       'Switching…',
    jdMonth:         'JD / month',
    tierNote:        'Tiers renew monthly. Cancel or change anytime.',
    billingContact:  'Contact support for billing questions.',
    language:        'Language',
    arabic:          'العربية',
    english:         'English',
  },
  ar: {
    driverPortal:    'بوابة السائق',
    enterPhone:      'أدخل رقم هاتفك للمتابعة',
    codeSentTo:      'تم إرسال الرمز إلى',
    mobileNumber:    'رقم الهاتف',
    phonePlaceholder:'+962 79 xxx xxxx',
    sendCode:        'إرسال الرمز',
    sending:         'جارٍ الإرسال…',
    verifyCode:      'رمز التحقق',
    resendCode:      'إعادة إرسال الرمز',
    resending:       'جارٍ الإعادة…',
    verifySignIn:    'تحقق وتسجيل الدخول',
    verifying:       'جارٍ التحقق…',
    changeNumber:    'تغيير الرقم →',
    secured:         'مؤمّن بواسطة Supabase · الأردن',
    // Dashboard
    online:          'متصل · جاهز للرحلات',
    offline:         'غير متصل · اضغط للاتصال',
    goingOnline:     'جارٍ الاتصال…',
    goingOffline:    'جارٍ قطع الاتصال…',
    totalTrips:      'إجمالي الرحلات',
    rating:          'التقييم',
    riderAvg:        'متوسط الركاب',
    acceptance:      'قبول الرحلات',
    allTime:         'كل الأوقات',
    subscription:    'الاشتراك',
    yourVehicle:     'سيارتك',
    edit:            'تعديل',
    verified:        'السيارة موثّقة · التأمين فعّال',
    upgradeInfo:     'ترقّ للحصول على أولوية في التوزيع',
    testRide:        'اختبار عرض رحلة',
    waitingRide:     'في انتظار عرض رحلة…',
    recentTrips:     'آخر الرحلات',
    recentEarnings:  'آخر الأرباح',
    signOut:         'تسجيل الخروج',
    // Subscription
    chooseTier:      'اختر مستوى اشتراكك',
    higherTier:      'المستوى الأعلى = مزيد من الرحلات',
    currentPlan:     '✓ الخطة الحالية',
    popular:         'الأكثر طلباً',
    activePlan:      '✓ الخطة النشطة',
    switchTo:        'التحويل إلى',
    switching:       'جارٍ التحويل…',
    jdMonth:         'دينار / شهر',
    tierNote:        'تتجدد الاشتراكات شهرياً. يمكن الإلغاء في أي وقت.',
    billingContact:  'تواصل مع الدعم لأسئلة الفوترة.',
    language:        'اللغة',
    arabic:          'العربية',
    english:         'English',
  },
} as const;

type StringKey = keyof typeof strings.en;

interface LanguageContextType {
  lang: Lang;
  isRTL: boolean;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
  fontFamily: string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const stored = (localStorage.getItem('wasel_driver_lang') as Lang | null) ?? 'en';
  const [lang, setLangState] = useState<Lang>(stored);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('wasel_driver_lang', l);
    setLangState(l);
  }, []);

  const isRTL = lang === 'ar';
  const fontFamily = isRTL
    ? "'Tajawal', 'Cairo', sans-serif"
    : "'Sora', sans-serif";

  const t = useCallback((k: StringKey) => strings[lang][k] as string, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, isRTL, setLang, t, fontFamily }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useDriverLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useDriverLanguage must be inside LanguageProvider');
  return ctx;
}
