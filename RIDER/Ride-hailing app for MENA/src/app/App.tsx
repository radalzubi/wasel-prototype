import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MobileFrame } from './components/MobileFrame';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { NewsScreen } from './screens/NewsScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { Place } from './data/mockData';

type Tab = 'home' | 'news' | 'explore' | 'settings';

function AppInner() {
  const { isRTL } = useLanguage();
  const { session, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [pendingDestination, setPendingDestination] = useState<Place | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const handleRideHere = (place: Place) => {
    setPendingDestination(place);
    setActiveTab('home');
  };

  if (isLoading) {
    return (
      <MobileFrame isRTL={isRTL}>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-primary)',
          fontFamily: isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif',
          color: 'var(--text-tertiary)', fontSize: 14,
        }}>
          {isRTL ? 'جارٍ التحميل…' : 'Loading…'}
        </div>
      </MobileFrame>
    );
  }

  if (showLogin || !session) {
    return (
      <MobileFrame isRTL={isRTL}>
        <LoginScreen onAuthenticated={() => setShowLogin(false)} />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame isRTL={isRTL}>
      {/* All screens stay mounted — HomeScreen ride state persists across tab switches */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          paddingBottom: 'calc(64px + var(--wasel-safe-bottom, 0px))',
        }}
      >

        <div style={{
          position: 'absolute', inset: 0,
          visibility: activeTab === 'home' ? 'visible' : 'hidden',
          pointerEvents: activeTab === 'home' ? 'auto' : 'none',
          zIndex: activeTab === 'home' ? 1 : 0,
        }}>
          <HomeScreen
            pendingDestination={pendingDestination}
            onPendingConsumed={() => setPendingDestination(null)}
          />
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          visibility: activeTab === 'news' ? 'visible' : 'hidden',
          pointerEvents: activeTab === 'news' ? 'auto' : 'none',
          zIndex: activeTab === 'news' ? 1 : 0,
        }}>
          <NewsScreen />
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          visibility: activeTab === 'explore' ? 'visible' : 'hidden',
          pointerEvents: activeTab === 'explore' ? 'auto' : 'none',
          zIndex: activeTab === 'explore' ? 1 : 0,
        }}>
          <ExploreScreen onRideHere={handleRideHere} />
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          visibility: activeTab === 'settings' ? 'visible' : 'hidden',
          pointerEvents: activeTab === 'settings' ? 'auto' : 'none',
          zIndex: activeTab === 'settings' ? 1 : 0,
        }}>
          <SettingsScreen onLogout={() => setShowLogin(true)} />
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </MobileFrame>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </LanguageProvider>
  );
}
