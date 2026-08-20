import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Share2,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Users,
  Copy,
  Check,
  SwitchCamera,
  Radio,
  Smile,
  Laptop,
} from 'lucide-react';
import { UserProfile, CallRecord } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';

interface ActiveInAppCallProps {
  callRecord: CallRecord;
  currentUser: UserProfile;
  isOpen: boolean;
  onEndCall: () => void;
  showToast: (msg: string) => void;
}

export const ActiveInAppCall: React.FC<ActiveInAppCallProps> = ({
  callRecord,
  currentUser,
  isOpen,
  onEndCall,
  showToast,
}) => {
  // Call Controls State
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callRecord.type !== 'audio');
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Connection & Duration State
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [inCallMessages, setInCallMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  const [inCallDraft, setInCallDraft] = useState('');

  // Media Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize Media Streams when Call Opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setCallStatus('connecting');
    setCallDuration(0);

    // Simulate connecting -> ringing -> connected
    const connectTimer = setTimeout(() => {
      if (mounted) setCallStatus('ringing');
    }, 1200);

    const connectedTimer = setTimeout(() => {
      if (mounted) {
        setCallStatus('connected');
        showToast('تم الاتصال بالمكالمة بنجاح!');
      }
    }, 2800);

    async function startMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: callRecord.type !== 'audio' ? { facingMode: 'user' } : false,
            audio: true,
          });

          if (mounted) {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          }
        }
      } catch (err: any) {
        console.warn('Camera/Mic permission warning:', err);
        // Fallback gracefully without throwing
        if (mounted && callRecord.type !== 'audio') {
          setVideoEnabled(false);
          showToast('تم بدء المكالمة بالصوت لتعذر تشغيل الكاميرا.');
        }
      }
    }

    startMedia();

    return () => {
      mounted = false;
      clearTimeout(connectTimer);
      clearTimeout(connectedTimer);
      stopAllMedia();
    };
  }, [isOpen, callRecord.id, callRecord.type]);

  // Duration Timer
  useEffect(() => {
    if (!isOpen || callStatus !== 'connected') return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, callStatus]);

  // Stop Media Tracks Cleanly
  const stopAllMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micEnabled;
      });
    }
    setMicEnabled(!micEnabled);
    showToast(!micEnabled ? 'تم تفعيل الميكروفون' : 'تم كتم الصوت');
  };

  // Toggle Video / Camera
  const toggleVideo = async () => {
    if (videoEnabled) {
      // Turn off video
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => track.stop());
      }
      setVideoEnabled(false);
      showToast('تم إيقاف الكاميرا');
    } else {
      // Turn on video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: micEnabled,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setVideoEnabled(true);
        showToast('تم تشغيل الكاميرا');
      } catch (err) {
        console.error('Camera toggle error:', err);
        showToast('تعذر تشغيل الكاميرا، يرجى مراجعة الصلاحيات.');
      }
    }
  };

  // Switch Camera (Front / Back)
  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);

    if (videoEnabled) {
      try {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newMode },
          audio: micEnabled,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        showToast('تم تبديل الكاميرا');
      } catch (err) {
        console.warn('Switch camera error:', err);
      }
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenSharing(false);
      // Restore camera if enabled
      if (videoEnabled && localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      showToast('تم إيقاف مشاركة الشاشة');
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = screenStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }
          setScreenSharing(true);
          showToast('جارٍ مشاركة الشاشة داخل المكالمة');

          screenStream.getVideoTracks()[0].onended = () => {
            setScreenSharing(false);
            if (videoEnabled && localStreamRef.current && localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          };
        }
      } catch (err) {
        console.warn('Screen share cancelled/error:', err);
      }
    }
  };

  // Send Floating Reaction
  const sendReaction = (emoji: string) => {
    const id = Math.random().toString();
    setActiveReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  // Send In-Call Quick Chat
  const handleSendInCallMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inCallDraft.trim()) return;
    const newMsg = {
      id: Math.random().toString(),
      sender: currentUser.displayName,
      text: inCallDraft.trim(),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    setInCallMessages((prev) => [...prev, newMsg]);
    setInCallDraft('');
  };

  // Copy Call Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(callRecord.link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast('تم نسخ رابط المكالمة إلى الحافظة!');
  };

  // Format Duration seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndCallInternal = () => {
    stopAllMedia();
    onEndCall();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#090b10] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200"
    >
      {/* 1. Top Bar: Call Info, Duration, Security Badge */}
      <div className="h-16 md:h-20 px-4 md:px-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-lg">
            {callRecord.type === 'audio' ? <Mic className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-black text-white truncate max-w-[180px] sm:max-w-xs">
                {callRecord.title}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>مشفر داخل التطبيق</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-0.5">
              {callStatus === 'connecting' ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>جارٍ الاتصال...</span>
                </span>
              ) : callStatus === 'ringing' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-ping" />
                  <span>يرن الآن...</span>
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{formatTime(callDuration)}</span>
                </span>
              )}
              <span>•</span>
              <span className="text-neutral-300">{callRecord.type === 'audio' ? 'مكالمة صوتية' : 'مكالمة فيديو HD'}</span>
            </div>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md border border-white/10"
            title="نسخ رابط الدعوة"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedLink ? 'تم النسخ' : 'دعوة آخرين'}</span>
          </button>

          {/* Quick In-Call Chat Drawer Toggle */}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer backdrop-blur-md border ${
              showChatDrawer ? 'bg-[#6d5dfc] text-white border-[#6d5dfc]' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
            title="الدردشة أثناء المكالمة"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Stage Area (Remote Video / Avatars + PiP Local Video) */}
      <div className="flex-1 relative flex items-center justify-center p-3 md:p-6 overflow-hidden">
        {/* Floating Reactions Container */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          {activeReactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 text-4xl animate-bounce"
              style={{
                left: `${40 + Math.random() * 20}%`,
                animationDuration: '1.2s',
              }}
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Grid or Single Stage */}
        <div className="w-full h-full max-w-5xl rounded-[32px] overflow-hidden bg-neutral-900/90 border border-white/10 relative flex items-center justify-center shadow-2xl">
          {/* Remote Feed Display */}
          {callRecord.type === 'audio' || !videoEnabled ? (
            /* Audio Avatar Layout */
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="relative">
                {/* Glowing Audio Pulse Circles */}
                {callStatus === 'connected' && (
                  <>
                    <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                    <div className="absolute -inset-8 rounded-full bg-indigo-500/10 animate-pulse" />
                  </>
                )}

                <div
                  className={`w-28 h-28 md:w-36 md:h-36 rounded-full ${getRandomTone(
                    callRecord.hostId
                  )} flex items-center justify-center font-black text-3xl md:text-4xl text-white shadow-2xl relative z-10 border-4 border-white/20`}
                >
                  {getInitials(callRecord.title || 'مستخدم')}
                </div>
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-black text-white">{callRecord.title}</h3>
                <p className="text-xs text-neutral-400 mt-1 font-sans">
                  {callStatus === 'connected'
                    ? micEnabled
                      ? 'الصوت قيد البث بجودة عالية'
                      : 'الميكروفون مكتوم'
                    : 'جارٍ انتظار الرد...'}
                </p>
              </div>

              {/* Live Audio Visualizer Bars */}
              {callStatus === 'connected' && (
                <div className="flex items-center gap-1.5 h-6">
                  {[40, 75, 100, 60, 90, 45, 80, 55, 95, 30].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-emerald-400 rounded-full transition-all duration-150"
                      style={{
                        height: micEnabled ? `${(h * (callDuration % 3 + 1)) % 24 + 6}px` : '4px',
                        opacity: micEnabled ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Video Mode - Main Feed */
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {/* Local / Remote Video Render */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-3xl"
              />

              {/* Status Badge */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>بث الفيديو المباشر</span>
              </div>
            </div>
          )}

          {/* Picture-In-Picture (PiP) Floating Box for Self or Partner */}
          {callRecord.type !== 'audio' && videoEnabled && (
            <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/20 bg-neutral-800 shadow-2xl z-20">
              <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-tr from-neutral-900 to-neutral-800">
                <div className="text-center p-2">
                  <div
                    className={`w-12 h-12 rounded-2xl ${getRandomTone(
                      currentUser.uid
                    )} flex items-center justify-center font-black text-sm text-white mx-auto mb-1 shadow-md`}
                  >
                    {getInitials(currentUser.displayName)}
                  </div>
                  <span className="text-[10px] font-bold text-white block truncate">{currentUser.displayName}</span>
                  <span className="text-[9px] text-emerald-400 block font-mono">أنت</span>
                </div>
              </div>
            </div>
          )}

          {/* In-Call Quick Chat Drawer (Slide in) */}
          {showChatDrawer && (
            <div className="absolute top-0 bottom-0 left-0 w-72 sm:w-80 bg-neutral-950/95 backdrop-blur-md border-r border-white/10 z-30 flex flex-col p-4 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">الدردشة أثناء المكالمة</span>
                </div>
                <button
                  onClick={() => setShowChatDrawer(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  إغلاق
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 text-xs">
                {inCallMessages.length === 0 ? (
                  <p className="text-neutral-500 text-center py-8">لا توجد رسائل بعد</p>
                ) : (
                  inCallMessages.map((m) => (
                    <div key={m.id} className="p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span className="font-bold text-[#b8f3df]">{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="text-neutral-200 text-right">{m.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendInCallMessage} className="mt-3 flex gap-1.5">
                <input
                  value={inCallDraft}
                  onChange={(e) => setInCallDraft(e.target.value)}
                  placeholder="اكتب رسالة سريعة..."
                  className="flex-1 h-9 rounded-xl bg-white/10 px-3 text-xs outline-none border border-white/10 text-right"
                />
                <button
                  type="submit"
                  className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  إرسال
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Control Bar: Mute, Video, Screen Share, Flip, Reactions, End Call */}
      <div className="px-4 py-4 md:py-6 bg-gradient-to-t from-black via-black/80 to-transparent z-30 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">
          {/* Microphone Toggle */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition cursor-pointer shadow-lg ${
              micEnabled
                ? 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
                : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
            title={micEnabled ? 'كتم الميكروفون' : 'تشغيل الميكروفون'}
          >
            {micEnabled ? <Mic className="w-5 h-5 md:w-6 md:h-6" /> : <MicOff className="w-5 h-5 md:w-6 md:h-6" />}
          </button>

          {/* Camera Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition cursor-pointer shadow-lg ${
              videoEnabled
                ? 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
                : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
            title={videoEnabled ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
          >
            {videoEnabled ? <VideoIcon className="w-5 h-5 md:w-6 md:h-6" /> : <VideoOff className="w-5 h-5 md:w-6 md:h-6" />}
          </button>

          {/* Switch Camera (if video on) */}
          {videoEnabled && (
            <button
              onClick={switchCamera}
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/10 flex items-center justify-center transition cursor-pointer shadow-lg"
              title="تبديل الكاميرا (أمامية / خلفية)"
            >
              <SwitchCamera className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          )}

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition cursor-pointer shadow-lg ${
              screenSharing
                ? 'bg-emerald-500 text-white'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
            }`}
            title={screenSharing ? 'إيقاف مشاركة الشاشة' : 'مشاركة الشاشة'}
          >
            <Laptop className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Floating Emoji Reactions */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            {['❤️', '👏', '🔥', '😂', '👍'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-9 h-9 rounded-xl hover:bg-white/20 flex items-center justify-center text-lg transition cursor-pointer"
                title={`تفاعل بـ ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* End Call Button (Big Red) */}
          <button
            onClick={handleEndCallInternal}
            className="h-12 md:h-14 px-6 md:px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-2xl transition cursor-pointer active:scale-95"
            title="إنهاء المكالمة"
          >
            <PhoneOff className="w-5 h-5 md:w-6 md:h-6" />
            <span>إنهاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
