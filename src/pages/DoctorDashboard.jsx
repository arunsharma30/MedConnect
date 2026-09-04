import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

const DoctorDashboard = () => {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/50 max-w-3xl">
        <h1 className="text-headline-lg text-primary mb-2">Doctor Dashboard</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          Welcome back, Dr. {profile?.last_name}!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
            <h3 className="text-title-md text-on-surface mb-1">Today's Consultations</h3>
            <p className="text-headline-md text-primary font-bold">0</p>
          </div>
          <div className="p-6 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
            <h3 className="text-title-md text-on-surface mb-1">Pending Reviews</h3>
            <p className="text-headline-md text-primary font-bold">0</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;
