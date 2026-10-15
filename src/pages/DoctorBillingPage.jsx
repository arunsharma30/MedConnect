import React, { useEffect, useState } from 'react';
import DoctorLayout from '../components/DoctorLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import paymentService from '../services/paymentService';

const DoctorBillingPage = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorId, setDoctorId] = useState(null);
  const [kpis, setKpis] = useState({
    totalGrossRupees: 0,
    totalEarningsRupees: 0,
    releasedPayoutsRupees: 0,
    pendingHoldRupees: 0,
    totalCommissionRupees: 0,
    totalConsultationsCount: 0,
  });
  const [transfers, setTransfers] = useState([]);
  const [releasingId, setReleasingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (profile) {
      loadDoctorAndBilling();
    }
  }, [profile]);

  const loadDoctorAndBilling = async () => {
    setLoading(true);
    try {
      const { data: docData, error: docErr } = await supabase
        .from('doctors')
        .select('id, consultation_fee')
        .eq('profile_id', profile.id)
        .single();

      if (docErr || !docData) {
        console.error('Doctor record not found:', docErr);
        setLoading(false);
        return;
      }

      setDoctorId(docData.id);
      await fetchBillingData(docData.id);
    } catch (err) {
      console.error('Error loading billing page:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingData = async (docId) => {
    setRefreshing(true);
    const result = await paymentService.getDoctorBillingLedger(docId);
    if (result.success) {
      setKpis(result.kpis);
      setTransfers(result.transfers);
    }
    setRefreshing(false);
  };

  const handleManualRelease = async (appointmentId) => {
    setReleasingId(appointmentId);
    try {
      const res = await paymentService.releaseDoctorPayout(appointmentId);
      if (res.success) {
        setToastMessage({ type: 'success', text: 'Payout released successfully to your balance!' });
        if (doctorId) fetchBillingData(doctorId);
      } else {
        setToastMessage({ type: 'error', text: res.error || 'Failed to release payout' });
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message || 'Error triggering payout release' });
    } finally {
      setReleasingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <DoctorLayout pageTitle="Billing & Payouts">
      <div className="space-y-6">

        {/* Toast Notification */}
        {toastMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-body-sm shadow-md animate-fade-in ${
            toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-error/10 text-error border border-error/20'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {toastMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* Top Banner / Route Test Mode Disclosure */}
        <div className="bg-gradient-to-r from-primary/10 via-purple-50 to-surface-container-lowest border border-primary/20 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-title-lg font-bold text-on-surface">Physician Earnings & Route Escrow</h2>
                <span className="px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                  Razorpay Route Enabled
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  College Demo Mode
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                Patient consultation fees are securely routed via Razorpay. MedConnect retains a 10% platform service fee, and your 90% share is held in escrow until consultation completion is verified.
              </p>
            </div>
          </div>
          <button
            onClick={() => doctorId && fetchBillingData(doctorId)}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl border border-outline-variant hover:border-primary text-on-surface hover:text-primary bg-white text-label-md font-semibold transition-colors flex items-center gap-2 self-start md:self-auto shrink-0 shadow-2xs"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Net Doctor Earnings */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-outline text-label-sm font-semibold uppercase mb-2">
              <span>Total Doctor Earnings</span>
              <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
            </div>
            <div className="text-headline-md font-extrabold text-on-surface">
              {formatCurrency(kpis.totalEarningsRupees)}
            </div>
            <p className="text-body-xs text-on-surface-variant mt-1.5 flex items-center gap-1">
              <span>From {kpis.totalConsultationsCount} online transaction{kpis.totalConsultationsCount !== 1 ? 's' : ''}</span>
            </p>
          </div>

          {/* Card 2: Released Payouts */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-emerald-700 text-label-sm font-semibold uppercase mb-2">
              <span>Released Payouts</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            </div>
            <div className="text-headline-md font-extrabold text-emerald-700">
              {formatCurrency(kpis.releasedPayoutsRupees)}
            </div>
            <p className="text-body-xs text-emerald-800/80 mt-1.5 flex items-center gap-1">
              <span>Settlement confirmed / eligible</span>
            </p>
          </div>

          {/* Card 3: Payouts On Hold */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-amber-700 text-label-sm font-semibold uppercase mb-2">
              <span>Pending Escrow Hold</span>
              <span className="material-symbols-outlined text-amber-600 text-[20px]">hourglass_top</span>
            </div>
            <div className="text-headline-md font-extrabold text-amber-700">
              {formatCurrency(kpis.pendingHoldRupees)}
            </div>
            <p className="text-body-xs text-amber-800/80 mt-1.5 flex items-center gap-1">
              <span>Released upon consultation completion</span>
            </p>
          </div>

          {/* Card 4: Platform Fee Contribution */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-outline text-label-sm font-semibold uppercase mb-2">
              <span>Platform Fee (10%)</span>
              <span className="material-symbols-outlined text-outline text-[20px]">pie_chart</span>
            </div>
            <div className="text-headline-md font-extrabold text-on-surface">
              {formatCurrency(kpis.totalCommissionRupees)}
            </div>
            <p className="text-body-xs text-on-surface-variant mt-1.5">
              <span>Gross Total: {formatCurrency(kpis.totalGrossRupees)}</span>
            </p>
          </div>
        </div>

        {/* Payout & Transfer Ledger Table */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-title-md font-bold text-on-surface">Consultation Payout Ledger</h3>
              <p className="text-body-xs text-on-surface-variant">
                Itemized breakdown of patient payments, platform split, and Route settlement holds.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-label-sm text-outline font-medium">
                {transfers.length} record{transfers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3 animate-pulse">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              <p className="text-body-sm text-on-surface-variant">Loading payment records...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-16 px-4 bg-surface-container-lowest">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">receipt_long</span>
              </div>
              <h4 className="text-title-sm font-bold text-on-surface">No Payment Transfers Found</h4>
              <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1">
                When patients pay consultation fees for their appointments, your itemized payouts and Route settlement holds will be logged here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F7F8FC] text-label-xs font-bold text-outline uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Appointment</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Gross Paid</th>
                    <th className="py-3 px-4">Platform (10%)</th>
                    <th className="py-3 px-4">Doctor Net</th>
                    <th className="py-3 px-4">Settlement Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-body-sm text-on-surface">
                  {transfers.map((t) => {
                    const apt = t.appointments;
                    const patient = apt?.patients?.profiles;
                    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
                    const grossRupees = (t.gross_amount_paise || 0) / 100;
                    const platformRupees = (t.platform_commission_paise || 0) / 100;
                    const doctorRupees = (t.doctor_amount_paise || 0) / 100;
                    const isReleased = !t.on_hold && (t.settlement_status === 'released' || t.settlement_status === 'settled');
                    const canManualRelease = !isReleased && apt?.status === 'completed';

                    return (
                      <tr key={t.id} className="hover:bg-[#F7F8FC]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-body-xs text-on-surface-variant whitespace-nowrap">
                          {formatDate(t.created_at)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold text-primary">#{apt?.appointment_number || 'APT'}</span>
                          <span className="block text-label-xs text-outline capitalize">{apt?.mode || 'online'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-on-surface">
                          {patientName}
                        </td>
                        <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                          {formatCurrency(grossRupees)}
                        </td>
                        <td className="py-3.5 px-4 text-outline whitespace-nowrap">
                          - {formatCurrency(platformRupees)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-on-surface whitespace-nowrap">
                          {formatCurrency(doctorRupees)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isReleased ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              Released
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                              Escrow Held
                            </span>
                          )}
                          {t.is_simulated && (
                            <span className="ml-1.5 text-[10px] uppercase font-bold text-outline px-1.5 py-0.5 rounded bg-surface-container-low border border-outline-variant/40">
                              Demo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {canManualRelease ? (
                            <button
                              onClick={() => handleManualRelease(apt.id)}
                              disabled={releasingId === apt.id}
                              className="px-3 py-1 bg-primary text-on-primary text-label-xs font-semibold rounded-lg hover:bg-secondary transition-colors inline-flex items-center gap-1 shadow-2xs"
                            >
                              {releasingId === apt.id ? (
                                <span className="inline-block animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                              ) : (
                                <span className="material-symbols-outlined text-[14px]">lock_open</span>
                              )}
                              <span>Release Payout</span>
                            </button>
                          ) : isReleased ? (
                            <span className="text-label-xs text-outline font-medium">Released</span>
                          ) : (
                            <span className="text-label-xs text-amber-700 font-medium">Awaiting Consultation</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DoctorLayout>
  );
};

export default DoctorBillingPage;
