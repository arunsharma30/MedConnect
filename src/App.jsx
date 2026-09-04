import React, { useState, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import RoleSelection from './components/RoleSelection';
import HowItWorks from './components/HowItWorks';
import TrustBanner from './components/TrustBanner';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';

function App() {
  const [authView, setAuthView] = useState({ role: 'patient', action: 'login' });
  const authModalRef = useRef(null);

  const handleOpenAuth = (role, action) => {
    setAuthView({ role, action });
    if (authModalRef.current) {
      authModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <>
      <Header onOpenAuth={handleOpenAuth} />
      <main className="flex-grow">
        <Hero onOpenAuth={handleOpenAuth} />
        <RoleSelection onOpenAuth={handleOpenAuth} />
        <HowItWorks />
        <TrustBanner />
        <AuthModal ref={authModalRef} authView={authView} setAuthView={setAuthView} />
      </main>
      <Footer onOpenAuth={handleOpenAuth} />
    </>
  );
}

export default App;
