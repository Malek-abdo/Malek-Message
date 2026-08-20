import React, { useState } from 'react';
import { PhoneCall, Link as LinkIcon, Check, X, Video, Phone, Play } from 'lucide-react';
import { UserProfile, CallRecord } from '../types';
import { createCallRecord } from '../lib/firestoreService';

interface CallModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onLaunchInAppCall: (call: CallRecord) => void;
  showToast: (msg: string) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onLaunchInAppCall,
  showToast,
}) => {
  const [callTitle, setCallTitle] = useState('');
  const [callType, setCallType] = useState<'video' | 'audio' | 'group'>('video');
  const [createdCall, setCreatedCall] = useState<CallRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const call = await createCallRecord(
        currentUser,
        callTitle.trim() || `مكالمة ${currentUser.displayName}`,
        callType
      );
      setCreatedCall(call);
      showToast('تم إنشاء المكالمة بنجاح! يمكنك الدخول مباشرة أو مشاركة الرابط.');
    } catch (err) {
      console.error('Failed to create call:', err);
      showToast('حدث خطأ أثناء إنشاء المكالمة.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!createdCall) return;
    try {
      await navigator.clipboard.writeText(createdCall.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('تم نسخ رابط المكالمة إلى الحافظة!');
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinDirectly = () => {
    if (!createdCall) return;
    onLaunchInAppCall(createdCall);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-neutral-200/80 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#111827] text-[#b8f3df] flex items-center justify-center font-bold shadow-md">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-[#18181b]">مكالمة جديدة داخل التطبيق</h3>
              <p className="text-xs text-neutral-400">مكالمة فيديو أو صوت مشفرة وسريعة</p>
            </div>
          </div>
          <button
            onClick={() => {
              setCreatedCall(null);
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-[#f8f7f3] flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!createdCall ? (
          <form onSubmit={handleGenerateCall} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">عنوان المكالمة (اختياري)</label>
              <input
                value={callTitle}
                onChange={(e) => setCallTitle(e.target.value)}
                placeholder="مثال: نقاش المشروع، لقاء الأصدقاء..."
                className="w-full h-12 rounded-2xl bg-[#f8f7f3] px-4 outline-none text-xs md:text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">نوع المكالمة</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'video', label: 'فيديو HD', icon: Video },
                  { type: 'audio', label: 'صوتية', icon: Phone },
                  { type: 'group', label: 'غرفة جماعية', icon: PhoneCall },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCallType(item.type as any)}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1.5 border cursor-pointer ${
                        callType === item.type
                          ? 'bg-[#111827] text-white border-[#111827] shadow-md'
                          : 'bg-[#f8f7f3] text-neutral-600 border-transparent hover:bg-[#e9e5ff]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${callType === item.type ? 'text-emerald-400' : ''}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#111827] hover:bg-[#302c52] text-[#b8f3df] font-black text-xs md:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md mt-6"
            >
              <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              <span>{loading ? 'جارٍ التجهيز...' : 'بدء المكالمة الآن'}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-5 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-black text-neutral-900">{createdCall.title}</h4>
              <p className="text-xs text-neutral-400 mt-1">المكالمة جاهزة للبدء الآن داخل التطبيق</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f8f7f3] border border-neutral-200 break-all text-xs font-mono text-neutral-600 select-all text-left dir-ltr">
              {createdCall.link}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleJoinDirectly}
                className="flex-1 h-12 rounded-2xl bg-[#111827] hover:bg-[#302c52] text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <Video className="w-4 h-4 text-emerald-400" />
                <span>دخول المكالمة فوراً</span>
              </button>

              <button
                onClick={copyLink}
                className="h-12 px-5 rounded-2xl bg-[#f4f3ef] hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>

            <button
              onClick={() => setCreatedCall(null)}
              className="text-xs text-[#6d5dfc] font-bold hover:underline cursor-pointer pt-2 inline-block"
            >
              إنشاء مكالمة أخرى
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
