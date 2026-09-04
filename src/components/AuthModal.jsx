import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AuthModal = forwardRef(({ authView, setAuthView }, ref) => {
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  const handleTabClick = (role, action) => {
    setAuthView({ role, action });
    setNotice(null);
  };

  const currentTarget = `${authView.role}-${authView.action}`;

  const getTabClass = (target) => {
    if (target === currentTarget) {
      return "px-3.5 py-1.5 rounded-md text-label-md font-label-md font-medium transition-all duration-300 bg-surface-container-lowest text-on-surface shadow-md border border-outline-variant scale-105 z-10";
    }
    return "px-3.5 py-1.5 rounded-md text-label-md font-label-md font-medium transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50";
  };

  const handleFormSubmit = (e, msg) => {
    e.preventDefault();
    showNotice(msg);
  };

  const formVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } }
  };

  return (
    <section ref={ref} className="max-w-max-width-content mx-auto px-6 md:px-12 py-20 relative" id="auth-forms-container">
      {/* Decorative blurred background blobs */}
      <div className="absolute top-10 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-secondary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <motion.div 
        className="bg-white/80 backdrop-blur-xl border border-outline-variant/50 rounded-2xl p-6 md:p-10 shadow-xl max-w-3xl mx-auto relative overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        
        {/* Status Notice */}
        <AnimatePresence>
          {notice && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-4 left-1/2 bg-surface-variant text-on-surface px-4 py-2 rounded-lg shadow-lg z-20 text-body-sm border border-outline-variant/50 flex items-center space-x-2"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
              <span>{notice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mb-8 relative z-10">
          <span className="text-label-sm font-label-sm text-primary tracking-wider uppercase font-semibold">Interactive Prototype</span>
          <h3 className="text-headline-lg font-headline-lg text-on-surface mt-1">Unified Authentication Hub</h3>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Preview each user flow directly below with instantaneous client-side role toggling.</p>
        </div>
        
        {/* Flow Route Switcher Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/50 rounded-xl mb-10 justify-center relative z-10 shadow-inner">
          <button
            className={getTabClass('patient-login')}
            onClick={() => handleTabClick('patient', 'login')}
          >
            Patient Log In
          </button>
          <button
            className={getTabClass('patient-register')}
            onClick={() => handleTabClick('patient', 'register')}
          >
            Patient Register
          </button>
          <button
            className={getTabClass('doctor-login')}
            onClick={() => handleTabClick('doctor', 'login')}
          >
            Doctor Log In
          </button>
          <button
            className={getTabClass('doctor-register')}
            onClick={() => handleTabClick('doctor', 'register')}
          >
            Doctor Register
          </button>
        </div>

        {/* FORM CONTAINER */}
        <div className="relative min-h-[350px]">
          <AnimatePresence mode="wait">
            {/* 1. Patient Login Form */}
            {currentTarget === 'patient-login' && (
              <motion.form 
                key="patient-login"
                variants={formVariants} initial="initial" animate="animate" exit="exit"
                className="space-y-5" 
                onSubmit={(e) => handleFormSubmit(e, 'Patient logged in successfully.')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Log in to Patient Portal</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Manage your clinical visits and records.</p>
                </div>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-login-email">Email address</label>
                  <input
                    className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all"
                    id="p-login-email" placeholder="name@example.com" required type="email"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-label-md font-label-md text-on-surface" htmlFor="p-login-pass">Password</label>
                    <a className="text-body-sm font-body-sm text-primary hover:underline" href="#">Forgot password?</a>
                  </div>
                  <input
                    className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all"
                    id="p-login-pass" placeholder="••••••••" required type="password"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" id="p-login-remember" type="checkbox" />
                  <label className="text-body-sm font-body-sm text-on-surface-variant" htmlFor="p-login-remember">Remember me for 30 days</label>
                </div>
                <button
                  className="w-full h-[46px] bg-primary-container hover:bg-primary text-on-primary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4"
                  type="submit"
                >
                  Log in to MedConnect
                </button>
              </motion.form>
            )}

            {/* 2. Patient Register Form */}
            {currentTarget === 'patient-register' && (
              <motion.form 
                key="patient-register"
                variants={formVariants} initial="initial" animate="animate" exit="exit"
                className="space-y-5" 
                onSubmit={(e) => handleFormSubmit(e, 'Patient account created successfully.')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Create your Patient Account</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Begin connecting with accredited providers.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">First Name</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="Elena" required type="text" />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Last Name</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="Rostova" required type="text" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Email</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="elena@example.com" required type="email" />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Phone Number</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="+1 (555) 019-2834" required type="tel" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Password</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="At least 8 characters" required type="password" />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Confirm Password</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="Re-type password" required type="password" />
                  </div>
                </div>
                <button className="w-full h-[46px] bg-primary-container hover:bg-primary text-on-primary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4" type="submit">
                  Create Patient Account
                </button>
              </motion.form>
            )}

            {/* 3. Doctor Login Form */}
            {currentTarget === 'doctor-login' && (
              <motion.form 
                key="doctor-login"
                variants={formVariants} initial="initial" animate="animate" exit="exit"
                className="space-y-5" 
                onSubmit={(e) => handleFormSubmit(e, 'Doctor authenticated successfully.')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Physician Clinical Portal</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Sign in with your clinical credentials.</p>
                </div>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface mb-1.5">Clinical Email</label>
                  <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="dr.smith@hospital.org" required type="email" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-label-md font-label-md text-on-surface">Password</label>
                    <a className="text-body-sm font-body-sm text-secondary hover:underline" href="#">Hospital SSO help?</a>
                  </div>
                  <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="••••••••" required type="password" />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary" id="d-login-remember" type="checkbox" />
                  <label className="text-body-sm font-body-sm text-on-surface-variant" htmlFor="d-login-remember">Keep clinical session alive</label>
                </div>
                <button className="w-full h-[46px] bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4" type="submit">
                  Log in to Clinical Workspace
                </button>
              </motion.form>
            )}

            {/* 4. Doctor Register Form */}
            {currentTarget === 'doctor-register' && (
              <motion.form 
                key="doctor-register"
                variants={formVariants} initial="initial" animate="animate" exit="exit"
                className="space-y-5" 
                onSubmit={(e) => handleFormSubmit(e, 'Physician application submitted for credentialing verification.')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Join the MedConnect Provider Network</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Credentialed onboarding for licensed medical doctors.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">First Name</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="Julian" required type="text" />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Last Name</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="Vance, M.D." required type="text" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">NPI Number</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="10-digit NPI" required type="text" />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Specialty</label>
                    <select className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" required defaultValue="">
                      <option value="" disabled>Select specialty...</option>
                      <option value="pcp">Primary Care</option>
                      <option value="cardio">Cardiology</option>
                      <option value="derm">Dermatology</option>
                      <option value="neuro">Neurology</option>
                      <option value="other">Other Specialist</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Clinical Email</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="dr.vance@hospital.org" required type="email" />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Direct Phone</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="+1 (555) 019-2834" required type="tel" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Password</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="High security required" required type="password" />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5">Confirm Password</label>
                    <input className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="Re-type password" required type="password" />
                  </div>
                </div>
                <button className="w-full h-[46px] bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4" type="submit">
                  Submit Physician Application
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
});

export default AuthModal;
