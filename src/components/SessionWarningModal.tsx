import React from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  timeLeftSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export default function SessionWarningModal({ isOpen, timeLeftSeconds, onExtend, onLogout }: SessionWarningModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog 
          open={isOpen} 
          onClose={() => {}} // User must Explicitly choose
          className="relative z-[9999]"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80" 
            aria-hidden="true" 
          />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="w-full max-w-sm bg-surface-elevated border-2 border-amber-500/30 rounded shadow-2xl overflow-hidden"
            >
              <div className="bg-amber-500/10 p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 relative">
                  <Clock className="w-8 h-8 text-amber-500" />
                  <motion.div 
                    className="absolute inset-0 border-2 border-amber-500 rounded-full"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                </div>
                
                <h2 className="text-xl font-sans font-bold text-white mb-2 uppercase tracking-tight">
                  Session Expiring
                </h2>
                <div className="bg-black/40 px-3 py-1 border border-white/5 rounded-lg mb-4">
                  <span className="text-2xl font-mono font-bold text-amber-500 tabular-nums">
                    {Math.floor(timeLeftSeconds / 60)}:{String(timeLeftSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
                
                <p className="text-sm text-content-tertiary leading-relaxed mb-6">
                  For your security, Oweable will automatically sign you out due to inactivity. Do you want to stay logged in?
                </p>

                <div className="w-full space-y-3">
                  <button
                    onClick={onExtend}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-lg font-mono font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    Extend Session
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full bg-transparent border border-white/10 hover:border-content-muted text-content-tertiary hover:text-white py-2 rounded-lg font-mono font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    Logout Now
                  </button>
                </div>
              </div>

              <div className="bg-black/60 px-6 py-4 border-t border-white/5 flex items-center gap-3">
                <Shield className="w-4 h-4 text-content-muted" />
                <span className="text-[9px] font-mono text-content-muted uppercase tracking-widest">
                  Enterprise-grade session isolation active
                </span>
              </div>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
