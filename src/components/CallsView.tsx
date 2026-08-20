import React, { useState } from 'react';
import { Video, Phone, Plus, Copy, Check, Sparkles, PhoneCall, Play } from 'lucide-react';
import { CallRecord, UserProfile } from '../types';

interface CallsViewProps {
  calls: CallRecord[];
  currentUser: UserProfile;
  onStartCall: (title?: string, type?: 'video' | 'audio') => void;
  onJoinCall: (call: CallRecord) => void;
  showToast: (msg: string) => void;
}

export const CallsView: React.FC<CallsViewProps> = ({
  calls,
  currentUser,
  onStartCall,
  onJoinCall,
  showToast,
}) => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('تم نسخ رابط الاجتماع بنجاح!');
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    onStartCall(meetingTitle.trim() || undefined, 'video');
    setMeetingTitle('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#18181b]">المكالمات والاجتماعات</h2>
          <p className="text-xs text-neutral-400">مكالمات فيديو وصوت مشفرة ومباشرة داخل التطبيق</p>
        </div>
      </div>

      {/* Quick Meeting Launcher Card */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#18181b]">إنشاء مكالمة فيديو فورية</h3>
            <p className="text-xs text-neutral-400">ابدأ المكالمة الآن داخل التطبيق أو شارك الرابط</p>
          </div>
        </div>

        <form onSubmit={handleCreateMeeting} className="flex flex-col sm:flex-row items-center gap-2.5">
          <input
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="اسم أو موضوع المكالمة (اختياري)..."
            className="w-full sm:flex-1 h-12 rounded-2xl bg-[#f8f7f3] px-4 text-xs md:text-sm outline-none border border-transparent focus:border-[#6d5dfc]/40 text-right font-sans"
          />
          <button
            type="submit"
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-[#111827] text-white hover:bg-[#302c52] font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>بدء المكالمة فوراً</span>
          </button>
        </form>
      </div>

      {/* Recent Calls List */}
      <div>
        <h3 className="text-base font-black text-[#18181b] mb-3">سجل المكالمات والاجتماعات</h3>

        {calls.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-neutral-200/80 p-6">
            <div className="w-14 h-14 rounded-2xl bg-[#f8f7f3] text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-neutral-700 mb-1">لا توجد مكالمات سابقة</h4>
            <p className="text-xs text-neutral-400">
              أنشئ أول مكالمة أو ادخل غرفة فيديو بنقرة واحدة
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {calls.map((call) => (
              <div
                key={call.id}
                className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    {call.type === 'audio' ? <Phone className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs md:text-sm font-bold text-[#18181b] truncate">
                      {call.title}
                    </h4>
                    <span className="text-[11px] text-neutral-400 block font-mono">
                      بواسطة {call.hostName} • {new Date(call.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyLink(call.link, call.id)}
                    className="h-9 px-3 rounded-xl bg-[#f8f7f3] hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="نسخ الرابط"
                  >
                    {copiedId === call.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copiedId === call.id ? 'تم النسخ' : 'نسخ'}</span>
                  </button>

                  <button
                    onClick={() => onJoinCall(call)}
                    className="h-9 px-4 rounded-xl bg-[#111827] hover:bg-[#302c52] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                    <span>دخول المكالمة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
