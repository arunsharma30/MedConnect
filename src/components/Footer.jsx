import React from 'react';

const Footer = ({ onOpenAuth }) => {
  return (
    <footer className="bg-surface-container border-t border-outline-variant pt-16 pb-8">
      <div className="max-w-max-width-content mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <a className="flex items-center space-x-2.5 text-on-surface mb-4" href="#">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
              </div>
              <span className="text-headline-md font-headline-md font-bold tracking-tight text-on-surface">MedConnect</span>
            </a>
            <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
              Transforming the doctor-patient relationship through connected, calm, and transparent technology.
            </p>
          </div>
          <div>
            <h5 className="text-label-md font-label-md font-semibold text-on-surface mb-3">Explore</h5>
            <ul className="space-y-2 text-body-sm font-body-sm text-on-surface-variant">
              <li><a className="hover:text-primary transition-colors duration-150" href="#find-doctor">Find a Doctor</a></li>
              <li><a className="hover:text-primary transition-colors duration-150" href="#how-it-works">How It Works</a></li>
              <li><a className="hover:text-primary transition-colors duration-150" href="#for-doctors">For Doctors</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-label-md font-label-md font-semibold text-on-surface mb-3">Portals</h5>
            <ul className="space-y-2 text-body-sm font-body-sm text-on-surface-variant">
              <li>
                <button className="hover:text-primary transition-colors duration-150" onClick={() => onOpenAuth('patient', 'login')}>
                  Patient Portal
                </button>
              </li>
              <li>
                <button className="hover:text-primary transition-colors duration-150" onClick={() => onOpenAuth('doctor', 'login')}>
                  Doctor Portal
                </button>
              </li>
              <li><a className="hover:text-primary transition-colors duration-150" href="#">Clinical Standards</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-label-md font-label-md font-semibold text-on-surface mb-3">Legal & Compliance</h5>
            <ul className="space-y-2 text-body-sm font-body-sm text-on-surface-variant">
              <li><a className="hover:text-primary transition-colors duration-150" href="#">Privacy Policy</a></li>
              <li><a className="hover:text-primary transition-colors duration-150" href="#">Terms of Service</a></li>
              <li><a className="hover:text-primary transition-colors duration-150" href="#">HIPAA Compliance</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-outline-variant text-center md:text-left text-body-sm font-body-sm text-on-surface-variant flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© 2024 MedConnect Inc. All rights reserved. HIPAA Compliant & Certified.</div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center text-label-sm font-label-sm text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
