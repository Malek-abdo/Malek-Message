import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Globe,
  Edit3,
  Copy,
  Check,
  LogOut,
  Sparkles,
  ShieldCheck,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UserProfile, APP_LOGO_URL } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';
import {
  playMessageSound,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationVolume,
  setNotificationVolume,
  SOUND_OPTIONS,
  SoundToneType,
} from '../lib/notifications';
import { Play, Music, Sliders } from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserProfile;
  onOpenEditProfile: () => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onOpenEditProfile,
  onLogout,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('malek_notif_sound_enabled') !== 'false';
  });
  const [volumeLevel, setVolumeLevel] = useState<number>(() => {
    return getNotificationVolume();
  });
  const [selectedTone, setSelectedTone] = useState<SoundToneType>(() => {
    return (localStorage.getItem('malek_notif_sound_type') as SoundToneType) || 'primary_custom';
  });
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    return getNotificationPermission();
  });

  const copyUsername = () => {
    navigator.clipboard.writeText(`@${currentUser.username}`);
    setCopied(true);
    showToast(`تم نسخ المعرف @${currentUser.username} إلى الحافظة!`);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('malek_notif_sound_enabled', String(next));
    if (next) {
      playMessageSound();
      showToast('تم تفعيل صوت إشعارات الرسائل');
    } else {
      showToast('تم كتم صوت إشعارات الرسائل');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolumeLevel(newVol);
    setNotificationVolume(newVol);
    playMessageSound(selectedTone, newVol);
  };

  const handleSelectTone = (toneId: SoundToneType) => {
    setSelectedTone(toneId);
    localStorage.setItem('malek_notif_sound_type', toneId);
    playMessageSound(toneId, volumeLevel);
    const opt = SOUND_OPTIONS.find((s) => s.id === toneId);
    showToast(`تم اختيار نغمة: ${opt?.name || ''}`);
  };

  const handleTestTone = (e: React.MouseEvent, toneId: SoundToneType) => {
    e.stopPropagation();
    playMessageSound(toneId, volumeLevel);
  };

  const handleRequestBrowserPermission = async () => {
    const res = await requestNotificationPermission();
    setBrowserPermission(res);
    if (res === 'granted') {
      showToast('تم تفعيل إشعارات المتصفح لسطح المكتب بنجاح!');
      playMessageSound();
    } else if (res === 'denied') {
      showToast('تم رفض إذن الإشعارات من إعدادات المتصفح.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-[#18181b]">الملف الشخصي والإعدادات</h2>
        <p className="text-xs text-neutral-400">إدارة حسابك، إشعارات الرسائل، ومعلومات التواصل</p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-[32px] p-6 md:p-8 border border-neutral-200/80 shadow-xs text-center relative overflow-hidden">
        {/* Avatar */}
        <div className="relative inline-block mx-auto mb-4">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName}
              className="w-24 h-24 rounded-3xl object-cover shadow-lg border-4 border-white"
            />
          ) : (
            <div
              className={`w-24 h-24 rounded-3xl ${getRandomTone(
                currentUser.uid
              )} flex items-center justify-center font-black text-2xl shadow-md border-4 border-white`}
            >
              {getInitials(currentUser.displayName)}
            </div>
          )}
          <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />
        </div>

        <h3 className="text-xl md:text-2xl font-black text-[#18181b] mb-1">
          {currentUser.displayName}
        </h3>

        {/* Username Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0efff] text-[#6d5dfc] text-xs font-mono font-bold mb-4 cursor-pointer hover:bg-[#e4e1ff] transition" onClick={copyUsername}>
          <span>@{currentUser.username}</span>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
        </div>

        {/* Bio */}
        {currentUser.bio && (
          <p className="text-xs text-neutral-600 max-w-md mx-auto mb-6 leading-relaxed bg-[#f8f7f3] p-3.5 rounded-2xl">
            {currentUser.bio}
          </p>
        )}

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right mb-6">
          <div className="p-4 rounded-2xl bg-[#f8f7f3] border border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-neutral-400 block font-sans">رقم الهاتف</span>
              <span className="text-xs font-bold text-neutral-800 font-mono dir-ltr block truncate">
                {currentUser.phoneNumber ? `${currentUser.countryCode || ''} ${currentUser.phoneNumber}` : 'غير محدد'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f8f7f3] border border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-neutral-400 block font-sans">الدولة</span>
              <span className="text-xs font-bold text-neutral-800 block truncate">
                {currentUser.countryName || 'مصر'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenEditProfile}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-[#111827] text-white hover:bg-[#302c52] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span>تعديل الملف الشخصي ورقم الهاتف</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Message Notification Settings Card */}
      <div className="bg-white rounded-[32px] p-6 border border-neutral-200/80 shadow-xs text-right space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-[#e9e5ff] text-[#6d5dfc] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#18181b]">إعدادات وتنبيهات الرسائل</h3>
            <p className="text-[11px] text-neutral-400">تحكم بالأصوات وإشعارات المتصفح الفورية</p>
          </div>
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f7f3]">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Volume2 className="w-4.5 h-4.5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-neutral-200 text-neutral-500 flex items-center justify-center shrink-0">
                <VolumeX className="w-4.5 h-4.5" />
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-neutral-800 block">نغمة وصول الرسائل</span>
              <span className="text-[10px] text-neutral-400 block">تشغيل نغمة لطيفة فور استقبال أي رسالة جديدة</span>
            </div>
          </div>

          <button
            onClick={toggleSound}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
            }`}
          >
            {soundEnabled ? 'مفعل' : 'معطل'}
          </button>
        </div>

        {/* Volume Level Slider (75% default) */}
        {soundEnabled && (
          <div className="p-4 rounded-2xl bg-[#f8f7f3] border border-neutral-200/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#6d5dfc]" />
                <span className="text-xs font-bold text-neutral-800">مستوى صوت الإشعار</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-white border border-neutral-200 text-[#6d5dfc]">
                {volumeLevel}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={volumeLevel}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#6d5dfc]"
              />
            </div>

            {/* Quick volume presets */}
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-400 ml-auto">نسب سريعة:</span>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleVolumeChange(pct)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition cursor-pointer ${
                    volumeLevel === pct
                      ? 'bg-[#6d5dfc] text-white shadow-2xs'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sound Tone Selection List (When sound is enabled) */}
        {soundEnabled && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 mb-2">
              <Music className="w-4 h-4 text-[#6d5dfc]" />
              <span className="text-xs font-bold text-neutral-700">اختر نغمة الإشعار المفضلة:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SOUND_OPTIONS.map((opt) => {
                const isSelected = selectedTone === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectTone(opt.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#f0edff] border-[#6d5dfc] text-[#18181b] shadow-xs'
                        : 'bg-[#f8f7f3] border-neutral-200/70 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#6d5dfc] bg-[#6d5dfc]'
                              : 'border-neutral-400 bg-transparent'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs font-bold truncate">{opt.name}</span>
                        {opt.isDefault && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 shrink-0">
                            الافتراضية
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 mr-5">
                        {opt.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTestTone(e, opt.id)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-[10px] font-bold text-neutral-700 flex items-center gap-1 shadow-2xs transition shrink-0 cursor-pointer"
                      title="استماع للنغمة"
                    >
                      <Play className="w-3 h-3 fill-current text-emerald-600" />
                      <span>تجربة</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Desktop notification permission */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f7f3]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e9e5ff] text-[#6d5dfc] flex items-center justify-center shrink-0">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-800 block">إشعارات المتصفح المنبثقة</span>
              <span className="text-[10px] text-neutral-400 block">
                {browserPermission === 'granted'
                  ? 'مفعلة، ستصلك التنبيهات حتى عند تصغير المتصفح'
                  : 'تنبيهك بالرسائل الجديدة عند استخدام تبويب آخر'}
              </span>
            </div>
          </div>

          {browserPermission === 'granted' ? (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              مفعّل بنجاح ✓
            </span>
          ) : (
            <button
              onClick={handleRequestBrowserPermission}
              className="px-3.5 py-1.5 rounded-xl bg-[#111827] text-white hover:bg-[#302c52] text-xs font-bold transition cursor-pointer shadow-xs"
            >
              تفعيل الإشعارات
            </button>
          )}
        </div>
      </div>

      {/* Security & Firebase Banner */}
      <div className="bg-[#f8f7f3] rounded-3xl p-5 border border-neutral-200/80 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-neutral-800">بياناتك مشفرة ومحفوظة في Firebase</h4>
          <p className="text-[11px] text-neutral-500">
            يتم تخزين الرسائل والملفات المرفوعة عبر ImageKit في بنية تحتية سحابية آمنة.
          </p>
        </div>
      </div>

      {/* App Branding & Version */}
      <div className="text-center py-4 space-y-2">
        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md mx-auto border border-neutral-200 bg-neutral-900 flex items-center justify-center">
          <img
            src={APP_LOGO_URL}
            alt="Malek Message"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <h5 className="text-xs font-black text-neutral-700">Malek Message</h5>
        <p className="text-[10px] text-neutral-400">الإصدار 2.4.0 • تطبيق تواصل اجتماعي آمن وموثوق</p>
      </div>
    </div>
  );
};
