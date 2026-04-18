import React, { memo, useEffect, useState } from 'react';
import { ThumbsUp, MessageSquare, Send, Loader2, Star } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { UserFeedback } from './types';

function FeedbackPanelInner() {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ type: 'general', rating: 0, message: '' });

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
      <CollapsibleModule title="Share Your Feedback" icon={ThumbsUp}>
        <div className="-mx-6 -my-6 p-6 bg-surface-base">
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">
                  Type
                </label>
                <select
                  value={feedbackForm.type}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-surface-raised border border-surface-border text-white text-sm rounded-lg px-3 py-2 focus-app-field-indigo appearance-none"
                >
                  <option value="general">General Feedback</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="bug">Bug Report</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">
                  Rating (optional)
                </label>
                <div className="flex items-center gap-1.5 h-[38px]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackForm((f) => ({ ...f, rating: f.rating === star ? 0 : star }))}
                      className="text-content-muted hover:text-amber-400 transition-colors"
                    >
                      <Star className={`w-5 h-5 ${feedbackForm.rating >= star ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">
                Your Message
              </label>
              <textarea
                value={feedbackForm.message}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full bg-surface-raised border border-surface-border text-white text-sm font-mono rounded-lg px-3 py-2 focus-app-field-indigo h-28 resize-none placeholder:text-content-muted"
                placeholder="Tell us what's working, what's not, or what you'd like to see..."
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="flex items-center gap-2 px-6 py-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 text-black rounded-lg text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors"
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
        icon={MessageSquare}
        extraHeader={
          <span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">
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
              <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No feedback submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="p-5 hover:bg-surface-elevated transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-lg border ${
                        fb.type === 'bug'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : fb.type === 'feature_request'
                            ? 'bg-white/[0.05] border-surface-border text-content-primary'
                            : 'bg-surface-elevated border-surface-border text-content-tertiary'
                      }`}
                    >
                      {fb.type === 'feature_request' ? 'Feature Request' : fb.type === 'bug' ? 'Bug Report' : 'General'}
                    </span>
                    <div className="flex items-center gap-3">
                      {fb.rating ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= fb.rating! ? 'fill-amber-400 text-amber-400' : 'text-content-muted'}`} />
                          ))}
                        </div>
                      ) : null}
                      <span className="text-[10px] font-mono text-content-muted">{fb.created_at.split('T')[0]}</span>
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
