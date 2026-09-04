import React from 'react';

const Header = ({ onOpenAuth }) => {
  return (
    <header className="border-b border-outline-variant bg-surface sticky top-0 z-50 shadow-sm w-full">
      <div className="max-w-max-width-content mx-auto h-16 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <a className="flex items-center space-x-2.5 text-on-surface" href="#">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
            </div>
            <span className="text-headline-md font-headline-md font-bold tracking-tight text-on-surface">MedConnect</span>
          </a>
          <nav className="hidden md:flex items-center space-x-6">
            <a className="text-on-surface-variant font-body-md hover:text-primary transition-colors duration-150" href="#find-doctor">Find a Doctor</a>
            <a className="text-on-surface-variant font-body-md hover:text-primary transition-colors duration-150" href="#how-it-works">How It Works</a>
            <a className="text-on-surface-variant font-body-md hover:text-primary transition-colors duration-150" href="#for-doctors">For Doctors</a>
          </nav>
        </div>
        <div className="flex items-center space-x-3">
          <button
            className="text-headline-sm font-headline-sm text-on-surface-variant hover:text-primary px-3 py-2 rounded-lg transition-all duration-150 active:scale-95"
            onClick={() => onOpenAuth('patient', 'login')}
          >
            Log in
          </button>
          <button
            className="bg-primary-container hover:bg-primary text-on-primary text-label-md font-label-md font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95 shadow-sm"
            onClick={() => onOpenAuth('patient', 'register')}
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
