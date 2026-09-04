import React from 'react';
import { motion } from 'framer-motion';
import heroImage from '../assets/hero-image.png';

const Hero = ({ onOpenAuth }) => {
  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center overflow-hidden">
      {/* Full-Frame Editorial Background Image */}
      <img
        src={heroImage}
        alt="Doctor looking forward with warmth in modern healthcare clinic"
        className="absolute inset-0 w-full h-full object-cover object-right md:object-center"
      />

      {/* Directional Editorial Gradient Scrim */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent/10 md:w-3/4 lg:w-3/5 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent md:hidden pointer-events-none"></div>

      {/* Foreground Hero Content Content Layer */}
      <div className="relative z-10 w-full max-w-max-width-content mx-auto px-6 md:px-12">
        <div className="max-w-2xl space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant px-3.5 py-1.5 rounded-full text-label-sm font-label-sm text-primary shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>Healthcare, connected.</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-display-lg font-display-lg text-on-surface tracking-tight text-[32px] md:text-[44px] leading-tight md:leading-[1.15]"
          >
            Better care starts with a better connection.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-body-lg font-body-lg text-on-surface-variant max-w-xl leading-relaxed"
          >
            MedConnect brings patients and doctors together for appointments, consultations, prescriptions, and medical records — all in one calm, connected platform.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center gap-3 pt-2"
          >
            <a
              className="inline-flex items-center justify-center bg-primary-container hover:bg-primary text-on-primary text-label-md font-label-md font-medium px-6 py-3 rounded-lg transition-all duration-150 shadow-sm active:scale-95"
              href="#role-selection"
            >
              Find a Doctor
            </a>
            <button
              className="inline-flex items-center justify-center bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant hover:bg-surface-container-low text-on-surface text-label-md font-label-md font-medium px-6 py-3 rounded-lg transition-all duration-150 active:scale-95 shadow-xs"
              onClick={() => onOpenAuth('patient', 'register')}
            >
              Get Started
            </button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="pt-6 border-t border-outline-variant/80 flex flex-wrap items-center gap-6 text-on-surface-variant text-body-sm font-body-sm"
          >
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              <span>HIPAA Certified</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-primary text-[18px]">medical_services</span>
              <span>Licensed MDs</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
              <span>256-bit Encrypted</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
