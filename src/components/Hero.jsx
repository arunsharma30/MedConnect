import React from 'react';

const Hero = ({ onOpenAuth }) => {
  return (
    <section className="w-full pb-16">
      <div className="relative w-full min-h-[560px] md:min-h-[640px] overflow-hidden flex items-center bg-surface-container-lowest">
        {/* Full-Frame Editorial Background Image */}
        <img 
          src="/hero-image.png"
          alt="Doctor looking forward with warmth in modern healthcare clinic"
          className="absolute inset-0 w-full h-full object-cover object-right md:object-center"
        />

        {/* Directional Editorial Gradient Scrim (Left-to-Right and subtle bottom scrim) */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent/10 md:w-3/4 lg:w-3/5 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent md:hidden pointer-events-none"></div>

        {/* Foreground Hero Content Content Layer */}
        <div className="relative z-10 w-full max-w-max-width-content mx-auto px-6 md:px-12">
          <div className="py-12 md:py-16 max-w-2xl space-y-6">
            <div className="inline-flex items-center space-x-2 bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant px-3.5 py-1.5 rounded-full text-label-sm font-label-sm text-primary shadow-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>Healthcare, connected.</span>
            </div>

            <h1 className="text-display-lg font-display-lg text-on-surface tracking-tight text-[32px] md:text-[44px] leading-tight md:leading-[1.15]">
              Better care starts with a better connection.
            </h1>

            <p className="text-body-lg font-body-lg text-on-surface-variant max-w-xl leading-relaxed">
              MedConnect brings patients and doctors together for appointments, consultations, prescriptions, and medical records — all in one calm, connected platform.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
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
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-outline-variant/80 flex flex-wrap items-center gap-6 text-on-surface-variant text-body-sm font-body-sm">
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
