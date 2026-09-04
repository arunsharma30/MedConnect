import React from 'react';
import { motion } from 'framer-motion';

const RoleSelection = ({ onOpenAuth }) => {
  return (
    <section className="bg-surface-container-low border-y border-outline-variant py-16" id="role-selection">
      <div className="max-w-max-width-content mx-auto px-6 md:px-12">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-label-sm font-label-sm text-primary tracking-wider uppercase font-semibold">Portals</span>
          <h2 className="text-display-sm font-display-sm text-on-surface tracking-tight mt-1">
            How would you like to use MedConnect?
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-2">
            Tailored portals designed for patients seeking care and physicians delivering it.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Patient Card */}
          <motion.div 
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-lg"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[28px]">person</span>
              </div>
              <h3 className="text-headline-lg font-headline-lg text-on-surface">For Patients</h3>
              <p className="text-body-md font-body-md text-on-surface-variant mt-3 leading-relaxed">
                Find verified physicians, schedule virtual or in-person visits, and keep your care records synchronized in a unified clinical dashboard.
              </p>
              <div className="mt-6 space-y-2.5 text-body-sm font-body-sm text-on-surface-variant">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                  <span>Instant slot confirmation with top specialists</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                  <span>Direct pharmacy electronic prescription routing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                  <span>Zero subscription fees for basic accounts</span>
                </div>
              </div>
            </div>
            <div className="pt-8 mt-6 border-t border-outline-variant flex items-center justify-between">
              <button 
                className="text-label-md font-label-md text-on-surface hover:text-primary transition-colors"
                onClick={() => onOpenAuth('patient', 'login')}
              >
                Patient Log In
              </button>
              <button 
                className="bg-primary-container hover:bg-primary text-on-primary text-label-md font-label-md font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95 shadow-sm"
                onClick={() => onOpenAuth('patient', 'register')}
              >
                Continue as Patient
              </button>
            </div>
          </motion.div>
          
          {/* Doctor Card */}
          <motion.div 
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-secondary hover:shadow-lg" 
            id="for-doctors"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-surface-container text-secondary flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[28px]">stethoscope</span>
              </div>
              <h3 className="text-headline-lg font-headline-lg text-on-surface">For Doctors</h3>
              <p className="text-body-md font-body-md text-on-surface-variant mt-3 leading-relaxed">
                Streamline consultations, manage clinical schedules, review longitudinal patient histories, and issue secure digital prescriptions with zero administrative bloat.
              </p>
              <div className="mt-6 space-y-2.5 text-body-sm font-body-sm text-on-surface-variant">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span>Integrated EHR sync and HIPAA clinical notes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span>Customizable availability and telehealth links</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span>Direct patient messaging and labs coordination</span>
                </div>
              </div>
            </div>
            <div className="pt-8 mt-6 border-t border-outline-variant flex items-center justify-between">
              <button 
                className="text-label-md font-label-md text-on-surface hover:text-secondary transition-colors"
                onClick={() => onOpenAuth('doctor', 'login')}
              >
                Doctor Log In
              </button>
              <button 
                className="bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary text-label-md font-label-md font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95 shadow-sm"
                onClick={() => onOpenAuth('doctor', 'register')}
              >
                Continue as Doctor
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default RoleSelection;
