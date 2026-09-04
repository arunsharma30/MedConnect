import React from 'react';
import { motion } from 'framer-motion';

const HowItWorks = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <section className="max-w-max-width-content mx-auto px-6 md:px-12 py-20" id="how-it-works">
      <motion.div 
        className="text-center max-w-2xl mx-auto mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-label-sm font-label-sm text-primary tracking-wider uppercase font-semibold">Workflow</span>
        <h2 className="text-display-sm font-display-sm text-on-surface tracking-tight mt-1">
          Care with complete clarity.
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant mt-2">
          A modern medical experience structured to minimize delays and maximize patient-doctor relationship quality.
        </p>
      </motion.div>
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Step 1 */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative hover:shadow-md transition-shadow duration-300">
          <div className="text-label-sm font-label-sm text-primary font-bold tracking-wider mb-3">01 / FIND</div>
          <h4 className="text-headline-sm font-headline-sm text-on-surface mb-2">Verified Physicians</h4>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Filter board-certified doctors by specialty, network, and real-time availability in your area.
          </p>
        </motion.div>
        {/* Step 2 */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative hover:shadow-md transition-shadow duration-300">
          <div className="text-label-sm font-label-sm text-primary font-bold tracking-wider mb-3">02 / BOOK</div>
          <h4 className="text-headline-sm font-headline-sm text-on-surface mb-2">Instant Confirmation</h4>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Select a confirmed slot in seconds without phone tag, calendar friction, or endless waiting rooms.
          </p>
        </motion.div>
        {/* Step 3 */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative hover:shadow-md transition-shadow duration-300">
          <div className="text-label-sm font-label-sm text-primary font-bold tracking-wider mb-3">03 / CONSULT</div>
          <h4 className="text-headline-sm font-headline-sm text-on-surface mb-2">Video or In-Clinic</h4>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Meet through secure HD telehealth video or visit in-clinic with full longitudinal medical context.
          </p>
        </motion.div>
        {/* Step 4 */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative hover:shadow-md transition-shadow duration-300">
          <div className="text-label-sm font-label-sm text-primary font-bold tracking-wider mb-3">04 / CONTINUE CARE</div>
          <h4 className="text-headline-sm font-headline-sm text-on-surface mb-2">Continuous Records</h4>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Access clinical notes, digital prescriptions, follow-up messages, and lab orders anytime.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HowItWorks;
