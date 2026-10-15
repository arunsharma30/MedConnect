import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const AuthModal = forwardRef(({ authView, setAuthView }, ref) => {
  const [notice, setNotice] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [npi, setNpi] = useState('');
  const [specialty, setSpecialty] = useState('');

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setNpi('');
    setSpecialty('');
  };

  const showNotice = (msg) => {
    setNotice(msg);
    setErrorNotice(null);
    setTimeout(() => setNotice(null), 5000);
  };

  const showError = (msg) => {
    setErrorNotice(msg);
    setNotice(null);
    setTimeout(() => setErrorNotice(null), 5000);
  };

  const handleSwitchAction = (action) => {
    setAuthView(prev => ({ ...prev, action }));
    setNotice(null);
    setErrorNotice(null);
  };

  const handleRoleSwitch = (role) => {
    setAuthView(prev => ({ role, action: prev.action || 'login' }));
    setNotice(null);
    setErrorNotice(null);
  };

  const handleTabClick = (role, action) => {
    setAuthView({ role, action });
    setNotice(null);
    setErrorNotice(null);
  };

  const currentRole = authView?.role || 'patient';
  const currentAction = authView?.action || 'login';
  const currentTarget = `${currentRole}-${currentAction}`;

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      showError("Please enter your email first to reset your password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showNotice("Password reset link sent! Check your email.");
    }
  };

  const handleLogin = async (e, expectedRole) => {
    e.preventDefault();
    setLoading(true);
    setErrorNotice(null);
    setNotice(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      setLoading(false);
      return;
    }

    // Verify role
    if (data?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_id', data.user.id)
        .single();

      if (profileError) {
        showError("Unable to verify user profile.");
        await supabase.auth.signOut();
      } else if (profile.role !== expectedRole) {
        showError(`This account is registered as a ${profile.role}. Please use ${profile.role === 'patient' ? 'Patient' : 'Doctor'} Login.`);
        await supabase.auth.signOut();
      } else {
        // Success
        navigate(`/${expectedRole}/dashboard`);
      }
    }
    setLoading(false);
  };

  const handleRegister = async (e, role) => {
    e.preventDefault();
    setLoading(true);
    setErrorNotice(null);
    setNotice(null);

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      showError("Your password does not meet the required security requirements (minimum 8 characters).");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      showError(error.message);
      setLoading(false);
      return;
    }

    // If role is doctor, we must also insert into doctors table when profile triggers creation
    // However, the trigger on auth.users creates public.profiles asynchronously.
    // It's safer to let the user login later and complete their profile, or we handle the doctor insert here if the profile exists.
    // For now, we wait to see if the session is created. If email confirmation is enabled, session is null.
    
    if (data?.user && data.session === null) {
      showNotice("Account created. Please check your email to verify your account.");
      clearForm();
    } else if (data?.user && data.session) {
      
      // Attempt to wait briefly for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (role === 'doctor' && npi) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', data.user.id).single();
        if (profile) {
          await supabase.from('doctors').insert({ profile_id: profile.id, license_number: npi, consultation_fee: 0 });
        }
      }
      
      if (role === 'patient' && phone) {
        // Phone is in profiles, we can update it
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', data.user.id).single();
        if (profile) {
          await supabase.from('profiles').update({ phone }).eq('id', profile.id);
          await supabase.from('patients').insert({ profile_id: profile.id });
        }
      }

      navigate(`/${role}/dashboard`);
    }

    setLoading(false);
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
          {errorNotice && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-4 left-1/2 bg-error/10 text-error px-4 py-2 rounded-lg shadow-lg z-20 text-body-sm border border-error/20 flex items-center space-x-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorNotice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mb-6 relative z-10">
          <span className="text-label-sm font-label-sm text-primary tracking-wider uppercase font-semibold">Secure Authentication</span>
          <h3 className="text-headline-lg font-headline-lg text-on-surface mt-1">
            {currentRole === 'doctor' ? 'Clinical Provider Workspace' : 'Patient Portal'}
          </h3>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
            {currentRole === 'doctor' 
              ? 'Secure access for verified medical doctors and healthcare providers.'
              : 'Sign in or register to access appointments, prescriptions, and records.'}
          </p>
        </div>
        
        {/* Role Segmented Selector: Patient vs Doctor */}
        <div className="flex p-1 bg-surface-container-low/60 backdrop-blur-sm border border-outline-variant/50 rounded-xl mb-8 max-w-sm mx-auto shadow-inner relative z-10">
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-lg text-label-md font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              currentRole === 'patient'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold border border-outline-variant/60'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/40'
            }`}
            onClick={() => handleRoleSwitch('patient')}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Patient Portal</span>
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-lg text-label-md font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              currentRole === 'doctor'
                ? 'bg-surface-container-lowest text-secondary shadow-sm font-semibold border border-outline-variant/60'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/40'
            }`}
            onClick={() => handleRoleSwitch('doctor')}
          >
            <span className="material-symbols-outlined text-[18px]">stethoscope</span>
            <span>Doctor Portal</span>
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
                onSubmit={(e) => handleLogin(e, 'patient')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Sign in to Patient Portal</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Manage your clinical visits and records.</p>
                </div>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-login-email">Email address</label>
                  <input
                    className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all"
                    id="p-login-email" placeholder="name@example.com" required type="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-label-md font-label-md text-on-surface" htmlFor="p-login-pass">Password</label>
                    <button type="button" onClick={handleForgotPassword} className="text-body-sm font-body-sm text-primary hover:underline">Forgot password?</button>
                  </div>
                  <input
                    className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all"
                    id="p-login-pass" placeholder="••••••••" required type="password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  className="w-full h-[46px] bg-primary-container hover:bg-primary text-on-primary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4 disabled:opacity-50"
                  type="submit" disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Alternate Action: Switch to Sign Up */}
                <div className="pt-3 text-center text-body-sm font-body-sm text-on-surface-variant">
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => handleSwitchAction('register')}
                    className="text-primary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 transition-colors"
                  >
                    Sign up
                  </button>
                </div>

                {/* Cross-role Helper Link */}
                <div className="pt-4 mt-2 border-t border-outline-variant/40 text-center">
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('doctor')}
                    className="inline-flex items-center gap-1.5 text-body-xs font-medium text-on-surface-variant hover:text-secondary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                    <span>Are you a healthcare provider? Doctor Sign In →</span>
                  </button>
                </div>
              </motion.form>
            )}

            {/* 2. Patient Register Form */}
            {currentTarget === 'patient-register' && (
              <motion.form 
                key="patient-register"
                variants={formVariants} initial="initial" animate="animate" exit="exit"
                className="space-y-5" 
                onSubmit={(e) => handleRegister(e, 'patient')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Create your Patient Account</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Begin connecting with accredited providers.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-reg-firstname">First Name</label>
                    <input id="p-reg-firstname" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="Elena" required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-reg-lastname">Last Name</label>
                    <input id="p-reg-lastname" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="Rostova" required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-reg-email">Email</label>
                    <input id="p-reg-email" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="elena@example.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-reg-phone">Phone Number</label>
                    <input id="p-reg-phone" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="+1 (555) 019-2834" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-reg-pass">Password</label>
                    <input id="p-reg-pass" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="At least 8 characters" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="p-reg-confirm">Confirm Password</label>
                    <input id="p-reg-confirm" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 text-body-md outline-none transition-all" placeholder="Re-type password" required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
                <button className="w-full h-[46px] bg-primary-container hover:bg-primary text-on-primary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4 disabled:opacity-50" type="submit" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                {/* Alternate Action: Switch to Sign In */}
                <div className="pt-3 text-center text-body-sm font-body-sm text-on-surface-variant">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => handleSwitchAction('login')}
                    className="text-primary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 transition-colors"
                  >
                    Sign in
                  </button>
                </div>

                {/* Cross-role Helper Link */}
                <div className="pt-4 mt-2 border-t border-outline-variant/40 text-center">
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('doctor')}
                    className="inline-flex items-center gap-1.5 text-body-xs font-medium text-on-surface-variant hover:text-secondary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                    <span>Are you a licensed physician? Register as a doctor →</span>
                  </button>
                </div>
              </motion.form>
            )}

            {/* 3. Doctor Login Form */}
            {currentTarget === 'doctor-login' && (
              <motion.form 
                key="doctor-login"
                variants={formVariants} initial="initial" animate="animate" exit="exit"
                className="space-y-5" 
                onSubmit={(e) => handleLogin(e, 'doctor')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Sign in to Clinical Portal</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Sign in with your clinical credentials.</p>
                </div>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-login-email">Clinical Email</label>
                  <input id="d-login-email" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="dr.smith@hospital.org" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-label-md font-label-md text-on-surface" htmlFor="d-login-pass">Password</label>
                    <button type="button" onClick={handleForgotPassword} className="text-body-sm font-body-sm text-secondary hover:underline">Forgot password?</button>
                  </div>
                  <input id="d-login-pass" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="••••••••" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button className="w-full h-[46px] bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4 disabled:opacity-50" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Alternate Action: Switch to Doctor Registration */}
                <div className="pt-3 text-center text-body-sm font-body-sm text-on-surface-variant">
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => handleSwitchAction('register')}
                    className="text-secondary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-secondary/20 rounded px-1 transition-colors"
                  >
                    Register as a doctor
                  </button>
                </div>

                {/* Cross-role Helper Link */}
                <div className="pt-4 mt-2 border-t border-outline-variant/40 text-center">
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('patient')}
                    className="inline-flex items-center gap-1.5 text-body-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>Are you a patient? Go to Patient Portal →</span>
                  </button>
                </div>
              </motion.form>
            )}

            {/* 4. Doctor Register Form */}
            {currentTarget === 'doctor-register' && (
              <motion.form 
                key="doctor-register"
                variants={formVariants} initial="initial" animate="animate" exit="exit"
                className="space-y-5" 
                onSubmit={(e) => handleRegister(e, 'doctor')}
              >
                <div className="border-b border-outline-variant/50 pb-4 mb-5">
                  <h4 className="text-headline-md font-headline-md text-on-surface">Join the MedConnect Provider Network</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Credentialed onboarding for licensed medical doctors.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-firstname">First Name</label>
                    <input id="d-reg-firstname" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="Julian" required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-lastname">Last Name</label>
                    <input id="d-reg-lastname" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="Vance, M.D." required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-npi">License Number (NPI)</label>
                    <input id="d-reg-npi" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="10-digit NPI" required type="text" value={npi} onChange={(e) => setNpi(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-specialty">Specialty</label>
                    <select id="d-reg-specialty" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" required value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
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
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-email">Clinical Email</label>
                    <input id="d-reg-email" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="dr.vance@hospital.org" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-phone">Direct Phone</label>
                    <input id="d-reg-phone" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="+1 (555) 019-2834" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-pass">Password</label>
                    <input id="d-reg-pass" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="High security required" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="d-reg-confirm">Confirm Password</label>
                    <input id="d-reg-confirm" className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-body-md outline-none transition-all" placeholder="Re-type password" required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
                <button className="w-full h-[46px] bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary rounded-xl text-label-md font-label-md font-medium transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-4 disabled:opacity-50" type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Physician Application'}
                </button>

                {/* Alternate Action: Switch to Doctor Sign In */}
                <div className="pt-3 text-center text-body-sm font-body-sm text-on-surface-variant">
                  <span>Already registered? </span>
                  <button
                    type="button"
                    onClick={() => handleSwitchAction('login')}
                    className="text-secondary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-secondary/20 rounded px-1 transition-colors"
                  >
                    Sign in
                  </button>
                </div>

                {/* Cross-role Helper Link */}
                <div className="pt-4 mt-2 border-t border-outline-variant/40 text-center">
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('patient')}
                    className="inline-flex items-center gap-1.5 text-body-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>Looking for patient care? Go to Patient Portal →</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
});

export default AuthModal;