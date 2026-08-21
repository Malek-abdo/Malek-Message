import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, PhoneOff, Check, User } from 'lucide-react';
import { CallRecord } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';

interface IncomingCallModalProps {
  incomingCall: CallRecord | null;
  onAccept: (call: CallRecord) => void;
  onDecline: (call: CallRecord) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onDecline,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Play realistic ringing tone sound
  useEffect(() => {
    if (!incomingCall) {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
        audioContextRef.current = null;
      }
      return;
    }

    const playRingtoneBeep = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // Standard ringback tone frequencies (440Hz + 480Hz)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.6);
        osc2.stop(ctx.currentTime + 1.6);
      } catch (e) {
        console.warn('Ringtone sound error:', e);
      }
    };

    // Play immediately and repeat every 3 seconds
    playRingtoneBeep();
    ringIntervalRef.current = setInterval(playRingtoneBeep, 3000);

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, [incomingCall?.id]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === 'video';
  const callerName = incomingCall.hostName || 'مستخدم';
  const callerPhoto = incomingCall.hostPhoto;
  const callerInitials = getInitials(callerName);
  const tone = getRandomTone(incomingCall.hostId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm bg-neutral-900 text-white rounded-[36px] p-6 sm:p-8 shadow-2xl border border-neutral-800 text-center overflow-hidden"
        >
          {/* Animated Background Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#6d5dfc]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

          {/* Caller Avatar with Pulse Ring */}
          <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 mb-5 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full border-2 border-emerald-500/50 animate-pulse" />
            
            {callerPhoto ? (
              <img
                src={callerPhoto}
                alt={callerName}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover shadow-xl border-4 border-neutral-800 relative z-10"
              />
            ) : (
              <div
                className={`w-full h-full rounded-full ${tone} flex items-center justify-center text-3xl font-black shadow-xl border-4 border-neutral-800 relative z-10`}
              >
                {callerInitials}
              </div>
            )}

            {/* Call Type Badge */}
            <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-neutral-900">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </div>
          </div>

          {/* Caller Info */}
          <h3 className="text-xl sm:text-2xl font-black text-white mb-1 truncate">
            {callerName}
          </h3>
          <p className="text-xs sm:text-sm text-emerald-400 font-medium mb-6 flex items-center justify-center gap-1.5 animate-pulse">
            <span>يتصل بك الآن ({isVideo ? 'مكالمة فيديو' : 'مكالمة صوتية'})...</span>
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 pt-2">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onDecline(incomingCall)}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition cursor-pointer"
                title="رفض المكالمة"
              >
                <PhoneOff className="w-7 h-7" />
              </motion.button>
              <span className="text-xs text-neutral-400 font-medium">رفض</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onAccept(incomingCall)}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition cursor-pointer animate-bounce"
                title="قبول المكالمة"
              >
                {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
              </motion.button>
              <span className="text-xs text-emerald-400 font-medium">قبول</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
