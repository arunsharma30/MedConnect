import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const RATING_LABELS = {
  1: 'Poor — Needs significant improvement',
  2: 'Fair — Below expectations',
  3: 'Good — Satisfactory consultation',
  4: 'Very Good — Highly thorough & communicative',
  5: 'Excellent — Outstanding care & consultation'
};

const QUICK_TAGS = [
  'Clear explanation',
  'Great bedside manner',
  'Listened attentively',
  'Helpful diagnosis',
  'Minimal wait time',
  'Compassionate care',
  'Professional & polite'
];

const ReviewModal = ({
  isOpen,
  onClose,
  doctor,
  patientId: propPatientId,
  appointments = [],
  selectedAppointmentId: initialAppointmentId = null,
  onSuccess
}) => {
  const { profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedAptId, setSelectedAptId] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [patientId, setPatientId] = useState(propPatientId || null);

  // Initialize selected appointment and patient ID
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSubmitting(false);
      setRating(5);
      setHoverRating(0);
      setReviewText('');
      setSelectedTags([]);

      // Choose appointment
      if (initialAppointmentId) {
        setSelectedAptId(initialAppointmentId);
      } else if (appointments && appointments.length > 0) {
        setSelectedAptId(appointments[0].id);
      } else {
        setSelectedAptId('');
      }

      // Ensure patientId is available
      if (!propPatientId && profile?.id) {
        supabase
          .from('patients')
          .select('id')
          .eq('profile_id', profile.id)
          .single()
          .then(({ data }) => {
            if (data?.id) setPatientId(data.id);
          });
      } else if (propPatientId) {
        setPatientId(propPatientId);
      }
    }
  }, [isOpen, initialAppointmentId, appointments, propPatientId, profile]);

  if (!isOpen) return null;

  const currentAppointment = appointments.find(a => a.id === selectedAptId) || appointments[0];

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
      // Also optionally append tag into reviewText if not already mentioned
      if (!reviewText.toLowerCase().includes(tag.toLowerCase())) {
        setReviewText(prev => (prev.trim() ? `${prev.trim()} • ${tag}` : tag));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg('Please select a star rating between 1 and 5.');
      return;
    }

    if (!selectedAptId) {
      setErrorMsg('Please select the consultation you are reviewing.');
      return;
    }

    if (!reviewText.trim()) {
      setErrorMsg('Please write a brief review about your consultation experience.');
      return;
    }

    let finalPatientId = patientId;
    if (!finalPatientId) {
      const { data: pData, error: pErr } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (pErr || !pData) {
        setErrorMsg('Unable to verify patient credentials. Please try signing in again.');
        return;
      }
      finalPatientId = pData.id;
    }

    setSubmitting(true);
    try {
      const doctorId = doctor?.id || currentAppointment?.doctor_id;

      // 1. Insert review into Supabase reviews table
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          patient_id: finalPatientId,
          doctor_id: doctorId,
          appointment_id: selectedAptId,
          rating: Number(rating),
          review: reviewText.trim()
        })
        .select(`
          id,
          rating,
          review,
          created_at,
          appointment_id,
          patient_id,
          patients ( profiles ( first_name, last_name ) )
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already submitted a review for this consultation.');
        }
        throw error;
      }

      // 2. Try updating doctors aggregate rating if permitted
      try {
        const { data: allRevs } = await supabase
          .from('reviews')
          .select('rating')
          .eq('doctor_id', doctorId);

        if (allRevs && allRevs.length > 0) {
          const avg = allRevs.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / allRevs.length;
          await supabase
            .from('doctors')
            .update({
              rating: Number(avg.toFixed(2)),
              total_reviews: allRevs.length
            })
            .eq('id', doctorId);
        }
      } catch (docUpdateErr) {
        // Silently continue if patient cannot update doctor table directly due to RLS
      }

      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      setErrorMsg(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const doctorName = doctor?.profiles
    ? `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}`
    : doctor?.name || 'Doctor';

  const specialty = doctor?.specializations?.name || 'General Practice';

  const activeStarCount = hoverRating || rating;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-outline-variant/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <span className="material-symbols-outlined text-[24px]">rate_review</span>
            </div>
            <div>
              <h3 className="text-title-lg font-bold text-on-surface">Rate & Review Consultation</h3>
              <p className="text-body-sm text-on-surface-variant">Verified Patient Feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Doctor Info Card */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/50 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-body-md shrink-0">
                {doctor?.profiles?.first_name?.[0] || 'D'}
                {doctor?.profiles?.last_name?.[0] || ''}
              </div>
              <div className="min-w-0">
                <h4 className="text-title-sm font-semibold text-on-surface truncate">{doctorName}</h4>
                <p className="text-body-xs text-primary font-medium truncate">{specialty}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-label-xs font-medium flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              Verified Visit
            </span>
          </div>

          {/* Consultation Selection (if multiple appointments) */}
          {appointments.length > 1 ? (
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">
                Select Consultation to Review
              </label>
              <select
                value={selectedAptId}
                onChange={(e) => setSelectedAptId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {appointments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {formatDate(apt.appointment_date)} • {apt.start_time?.substring(0, 5)} ({apt.mode === 'online' ? 'Video Visit' : 'In-Person'}) — #{apt.appointment_number}
                  </option>
                ))}
              </select>
            </div>
          ) : currentAppointment ? (
            <div className="text-body-xs text-on-surface-variant flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
              <span>
                Consultation on <strong>{formatDate(currentAppointment.appointment_date)}</strong> at <strong>{currentAppointment.start_time?.substring(0, 5)}</strong> ({currentAppointment.mode === 'online' ? 'Telehealth' : 'Clinic'})
              </span>
            </div>
          ) : null}

          {/* Star Rating Section */}
          <div className="text-center py-2">
            <label className="block text-label-md font-semibold text-on-surface mb-2">
              Overall Clinical Experience
            </label>
            <div className="flex justify-center items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-amber-500 hover:scale-115 active:scale-95 transition-transform focus:outline-none"
                  aria-label={`${star} star`}
                >
                  <span
                    className="material-symbols-outlined text-[36px]"
                    style={{
                      fontVariationSettings: star <= activeStarCount ? "'FILL' 1" : "'FILL' 0"
                    }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            <p className="text-body-sm font-medium text-amber-700 min-h-[20px]">
              {RATING_LABELS[activeStarCount] || 'Select your rating'}
            </p>
          </div>

          {/* Quick Review Tag Chips */}
          <div>
            <label className="block text-label-sm font-medium text-on-surface-variant mb-2">
              What went particularly well? (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-label-xs font-medium transition-colors border ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary/50'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-label-md font-semibold text-on-surface mb-1.5">
              Your Review & Comments
            </label>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe your consultation: communication, clarity of diagnosis, listening to concerns, wait time, or follow-up guidance..."
              className="w-full p-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed placeholder:text-outline"
              maxLength={1000}
            />
            <div className="flex justify-between items-center text-label-xs text-outline mt-1 px-1">
              <span>Minimum 5 characters</span>
              <span>{reviewText.length} / 1000</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low text-label-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reviewText.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-label-md font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Submit Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
