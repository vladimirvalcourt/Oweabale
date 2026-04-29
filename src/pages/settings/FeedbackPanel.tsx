import React, { memo, useEffect, useState } from 'react';
import { ThumbsUp, MessageSquare, Send, Loader2, Star } from 'lucide-react';
import { CollapsibleModule } from '../../components/common';
import { supabase } from '../../lib/api/supabase';
import { toast } from 'sonner';
import type { UserFeedback } from './types';
import { yieldForPaint } from "../../lib/api/services";
import { getCustomIcon } from '../../lib/utils/customIcons';

function FeedbackPanelInner() {
  const SupportIcon = getCustomIcon('support');
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<{
    type: 'general' | 'feature_request' | 'bug';
    rating: number;
    message: string;
  }>({ type: 'general', rating: 0, message: '' });

  const FEEDBACK_TYPES: { id: typeof feedbackForm.type; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'feature_request', label: 'Feature' },
    { id: 'bug', label: 'Bug' },
  ];

  useEffect(() => {
    setFeedbacksLoading(true);
    const load = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;
        const { data, error } = await supabase
          .from('user_feedback')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });
        if (!error && data) setFeedbacks(data as UserFeedback[]);
      } finally {
        setFeedbacksLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.message.trim()) {
      toast.error('Message is required');
      return;
    }
    setIsSubmittingFeedback(true);
    await yieldForPaint();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error('Not authenticated');
      setIsSubmittingFeedback(false);
      return;
    }
    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: authUser.id,
        type: feedbackForm.type,
        rating: feedbackForm.rating > 0 ? feedbackForm.rating : null,
        message: feedbackForm.message.trim(),
      })
      .select()
      .single();
    setIsSubmittingFeedback(false);
    if (error) {
      toast.error('Failed to submit feedback. Please try again.');
      return;
    }
    setFeedbacks((prev) => [data as UserFeedback, ...prev]);
    setFeedbackForm({ type: 'general', rating: 0, message: '' });
    toast.success('Feedback submitted — thank you!');
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Share Your Feedback" icon={SupportIcon}>
        <div className="-mx-6 -my-6 p-6 bg-surface-base">
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-content-secondary">Type</label>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFeedbackForm((f) => ({ ...f, type: t.id }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        feedbackForm.type === t.id
                          ? 'border-content-primary/25 bg-content-primary/[0.08] text-content-primary'
                          : 'border-surface-border bg-surface-raised text-content-tertiary hover:text-content-secondary'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-content-secondary">
                  Rating (optional)
                </label>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 h-[38px]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        title={star === 1 ? 'Poor' : star === 5 ? 'Excellent' : `Rating ${star}`}
                        onClick={() => setFeedbackForm((f) => ({ ...f, rating: f.rating === star ? 0 : star }))}
                        className="text-content-muted hover:text-[var(--color-status-amber-text)] transition-colors"
                      >
                        <Star className={`w-5 h-5 ${feedbackForm.rating >= star ? 'fill-[var(--color-status-amber-text)] text-[var(--color-status-amber-text)]' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-medium text-content-muted px-0.5">
                    <span>1 = Poor</span>
                    <span>5 = Excellent</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-content-secondary">
                Your message
              </label>
              <textarea
                value={feedbackForm.message}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, message: e.target.value }))}
                className="focus-app-field h-28 w-full resize-none rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary placeholder:text-content-muted"
                placeholder="Tell us what's working, what's not, or what you'd like to see..."
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="flex items-center gap-2 rounded-md bg-content-primary px-6 py-2.5 text-sm font-semibold text-surface-base transition-[background-color,transform] hover:bg-content-secondary active:translate-y-px disabled:opacity-50"
              >
                {isSubmittingFeedback ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {isSubmittingFeedback ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </form>
        </div>
      </CollapsibleModule>

      <CollapsibleModule
        title="My Feedback History"
        icon={SupportIcon}
        extraHeader={
          <span className="text-xs font-medium text-content-tertiary">
            {feedbacks.length} submission{feedbacks.length !== 1 ? 's' : ''}
          </span>
        }
        defaultOpen={false}
      >
        <div className="-mx-6 -my-6 bg-surface-base">
          {feedbacksLoading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-5 h-5 text-content-tertiary animate-spin" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-10 text-center">
              <ThumbsUp className="w-7 h-7 text-content-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-content-secondary">No feedback submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="p-5 hover:bg-surface-elevated transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                        fb.type === 'bug'
                          ? 'border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)]'
                          : fb.type === 'feature_request'
                            ? 'border-surface-border bg-content-primary/[0.05] text-content-primary'
                            : 'border-surface-border bg-surface-elevated text-content-secondary'
                      }`}
                    >
                      {fb.type === 'feature_request' ? 'Feature Request' : fb.type === 'bug' ? 'Bug Report' : 'General'}
                    </span>
                    <div className="flex items-center gap-3">
                      {fb.rating ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= fb.rating! ? 'fill-[var(--color-status-amber-text)] text-[var(--color-status-amber-text)]' : 'text-content-muted'}`} />
                          ))}
                        </div>
                      ) : null}
                      <span className="text-xs font-medium text-content-muted">{fb.created_at.split('T')[0]}</span>
                    </div>
                  </div>
                  <p className="text-sm text-content-secondary leading-relaxed">{fb.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const FeedbackPanel = memo(FeedbackPanelInner);
