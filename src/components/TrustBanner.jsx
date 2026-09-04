import React from 'react';
import { motion } from 'framer-motion';

const TrustBanner = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="bg-surface-container-lowest border-y border-outline-variant py-14">
      <div className="max-w-max-width-content mx-auto px-6 md:px-12">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.div variants={itemVariants} className="flex items-start space-x-3.5 group">
            <div className="w-10 h-10 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary-container group-hover:border-primary">
              <span className="material-symbols-outlined text-[22px]">lock</span>
            </div>
            <div>
              <div className="text-headline-sm font-headline-sm text-on-surface text-[15px]">HIPAA Compliant</div>
              <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">End-to-end encrypted clinical messaging and records storage.</div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="flex items-start space-x-3.5 group">
            <div className="w-10 h-10 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary-container group-hover:border-primary">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <div>
              <div className="text-headline-sm font-headline-sm text-on-surface text-[15px]">Board Certified</div>
              <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Every doctor is credentialed and state-license verified.</div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="flex items-start space-x-3.5 group">
            <div className="w-10 h-10 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary-container group-hover:border-primary">
              <span className="material-symbols-outlined text-[22px]">prescriptions</span>
            </div>
            <div>
              <div className="text-headline-sm font-headline-sm text-on-surface text-[15px]">Digital Prescriptions</div>
              <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Direct transmission to your preferred local or mail pharmacy.</div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="flex items-start space-x-3.5 group">
            <div className="w-10 h-10 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary-container group-hover:border-primary">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <div>
              <div className="text-headline-sm font-headline-sm text-on-surface text-[15px]">Transparent Pricing</div>
              <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Clear out-of-pocket costs and accepted insurance plans upfront.</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustBanner;
