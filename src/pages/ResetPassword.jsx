import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      alert("Password updated successfully. You can now log in.");
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-headline-md text-on-surface mb-2">Reset Password</h1>
        <p className="text-body-sm text-on-surface-variant mb-6">Enter your new password below.</p>
        
        {error && (
          <div className="bg-error/10 text-error p-3 rounded-lg mb-4 text-body-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface mb-1.5">New Password</label>
            <input 
              type="password" 
              required 
              className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-label-md text-on-surface mb-1.5">Confirm New Password</label>
            <input 
              type="password" 
              required 
              className="w-full h-[46px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 text-on-surface focus:border-primary outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-[46px] bg-primary text-on-primary rounded-xl font-medium shadow disabled:opacity-50 mt-2"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
