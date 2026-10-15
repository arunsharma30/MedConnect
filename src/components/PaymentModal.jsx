import React, { useState } from 'react';
import paymentService from '../services/paymentService';

const PaymentModal = ({
  isOpen,
  onClose,
  appointment,
  onPaymentSuccess,
  patientProfile,
}) => {
  const [loadingState, setLoadingState] = useState('idle'); // 'idle' | 'creating_order' | 'checkout_open' | 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  if (!isOpen || !appointment) return null;

  const doctor = appointment.doctors;
  const doctorName = doctor?.profiles
    ? `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}`
    : 'Doctor';
  const specialty = doctor?.specializations?.name || 'General Consultation';
  const feeInRupees = Number(doctor?.consultation_fee || 500);

  const handleStartPayment = async () => {
    setLoadingState('creating_order');
    setErrorMessage(null);

    try {
      // 1. Ask server to create an order
      const orderRes = await paymentService.createPaymentOrder(appointment.id);
      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.error || 'Failed to initialize payment order');
      }

      setLoadingState('checkout_open');

      // 2. Open Razorpay Checkout modal
      await paymentService.openCheckout({
        orderData: orderRes.data,
        patientProfile,
        appointmentId: appointment.id,
        onSuccess: (verifiedData) => {
          setLoadingState('success');
          setReceiptData({
            appointmentNumber: appointment.appointment_number,
            amount: feeInRupees,
            paymentId: verifiedData?.payment_id || `pay_${Date.now().toString().slice(-8)}`,
          });
          onPaymentSuccess?.(verifiedData);
        },
        onFailure: (err) => {
          console.error('Payment failure callback:', err);
          setLoadingState('error');
          setErrorMessage(err.description || err.message || 'Payment was unsuccessful or cancelled.');
        },
        onDismiss: () => {
          // If modal was dismissed without completing
          if (loadingState !== 'success') {
            setLoadingState('idle');
          }
        },
      });
    } catch (err) {
      console.error('Payment launch error:', err);
      setLoadingState('error');
      setErrorMessage(err.message || 'Could not initiate payment. Please try again.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-outline-variant/50 flex items-center justify-between bg-gradient-to-r from-primary/10 via-surface-container-lowest to-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
            <div>
              <h3 className="text-title-md font-bold text-on-surface">Consultation Payment</h3>
              <p className="text-body-xs text-on-surface-variant">Razorpay Secure Telemedicine Checkout</p>
            </div>
          </div>
          {loadingState !== 'checkout_open' && loadingState !== 'verifying' && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* SUCCESS STATE */}
          {loadingState === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h4 className="text-headline-sm font-bold text-on-surface">Payment Confirmed!</h4>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Your appointment #{receiptData?.appointmentNumber} with {doctorName} is fully secured.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/50 text-left space-y-2 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Amount Paid:</span>
                  <span className="font-bold text-on-surface">₹{feeInRupees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Payment Method:</span>
                  <span className="font-semibold text-primary">Razorpay (UPI / Cards / NetBanking)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Transaction ID:</span>
                  <span className="font-mono text-label-xs text-outline">{receiptData?.paymentId}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-xl transition-all shadow-md active:scale-[0.99]"
              >
                Done
              </button>
            </div>
          )}

          {/* ACTIVE / PENDING / ERROR STATE */}
          {loadingState !== 'success' && (
            <>
              {/* Doctor & Appointment Summary Card */}
              <div className="p-4 rounded-xl bg-surface-container-low/70 border border-outline-variant/50 flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-body-lg shrink-0 border border-primary/20">
                  {doctor?.profiles?.first_name?.[0] || 'D'}{doctor?.profiles?.last_name?.[0] || 'R'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-title-sm font-bold text-on-surface truncate">{doctorName}</h4>
                    <span className="text-label-xs px-2 py-0.5 rounded-full font-semibold uppercase bg-primary/10 text-primary border border-primary/20">
                      {appointment.mode === 'online' ? 'Video' : 'In-Person'}
                    </span>
                  </div>
                  <p className="text-body-xs text-primary font-semibold">{specialty}</p>
                  <p className="text-label-xs text-on-surface-variant mt-1">
                    {formatDate(appointment.appointment_date)} • {appointment.start_time?.substring(0, 5)} - {appointment.end_time?.substring(0, 5)}
                  </p>
                </div>
              </div>

              {/* Fee Breakdown Breakdown */}
              <div className="space-y-3 pt-2">
                <h5 className="text-label-xs font-bold uppercase tracking-wider text-outline">Payment Summary</h5>
                <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest space-y-2.5 text-body-sm">
                  <div className="flex justify-between items-center text-on-surface">
                    <span>Physician Consultation Fee</span>
                    <span className="font-medium">₹{feeInRupees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-on-surface-variant text-body-xs">
                    <span>Telehealth & Platform Technology Fee</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Included (₹0.00)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-on-surface-variant text-body-xs">
                    <span>Goods & Services Tax (GST 18%)</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Included
                    </span>
                  </div>
                  <div className="pt-2 border-t border-outline-variant/50 flex justify-between items-baseline">
                    <span className="text-title-sm font-bold text-on-surface">Total Amount Payable</span>
                    <span className="text-headline-sm font-extrabold text-primary">₹{feeInRupees.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Error Message if any */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-start gap-2 text-body-sm">
                  <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                  <div className="flex-1">
                    <p className="font-semibold">Payment Incomplete</p>
                    <p className="text-body-xs mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Loading Indicator during checkout or verifying */}
              {(loadingState === 'creating_order' || loadingState === 'checkout_open' || loadingState === 'verifying') && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-center space-y-2">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-primary border-t-transparent"></div>
                  <p className="text-body-sm font-semibold text-primary">
                    {loadingState === 'creating_order' && 'Connecting to secure payment gateway...'}
                    {loadingState === 'checkout_open' && 'Razorpay window is open. Please complete payment.'}
                    {loadingState === 'verifying' && 'Verifying transaction signature with server...'}
                  </p>
                  <p className="text-label-xs text-on-surface-variant">Do not refresh or close this window.</p>
                </div>
              )}

              {/* Trust & Gateway Security Badges */}
              <div className="flex items-center justify-center gap-4 text-label-xs text-outline pt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">lock</span>
                  256-bit SSL Secure
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
                  Razorpay Verified
                </span>
                <span>•</span>
                <span>UPI / Cards / NetBanking</span>
              </div>

              {/* Action Button */}
              {loadingState === 'idle' || loadingState === 'error' ? (
                <button
                  onClick={handleStartPayment}
                  className="w-full py-3.5 px-4 bg-primary hover:bg-secondary text-on-primary font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-body-md active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                  <span>Pay ₹{feeInRupees.toFixed(2)} with Razorpay</span>
                </button>
              ) : null}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
