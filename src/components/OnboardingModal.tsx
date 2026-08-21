import React, { useState, useRef } from 'react';
import { User, Phone, Globe, Check, Sparkles, ChevronDown, Search, Camera, Loader2 } from 'lucide-react';
import { UserProfile, CountryInfo } from '../types';
import { COUNTRIES, DEFAULT_COUNTRY } from '../data/countries';
import { completeUserOnboarding, getInitials, getRandomTone } from '../lib/firestoreService';
import { uploadToImageKit } from '../lib/imagekit';

interface OnboardingModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onComplete: (updatedProfile: Partial<UserProfile>) => void;
  showToast: (msg: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  currentUser,
  isOpen,
  onComplete,
  showToast,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [username, setUsername] = useState(
    currentUser.username?.startsWith('user_') ? '' : currentUser.username || ''
  );
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    if (currentUser.countryCode) {
      const match = COUNTRIES.find((c) => c.dialCode === currentUser.countryCode);
      if (match) return match;
    }
    return DEFAULT_COUNTRY;
  });
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber || '');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.includes(countrySearch) ||
      c.dialCode.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setUploadProgress(10);
      showToast('جارٍ رفع الصورة الشخصية عبر ImageKit...');

      const result = await uploadToImageKit(file, (p) => setUploadProgress(p));
      setPhotoURL(result.url);
      showToast('تم رفع الصورة بنجاح!');
    } catch (err: any) {
      console.error('Failed to upload onboarding photo:', err);
      showToast(err.message || 'فشل رفع الصورة');
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('يرجى كتابة اسم مستخدم (Username) لا يقل عن 3 أحرف.');
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ونقاط فقط.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 6) {
      setError('يرجى إدخال رقم هاتف صحيح مخصص للدولة المختارة.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await completeUserOnboarding(currentUser.uid, {
        username: cleanUsername,
        phoneNumber: cleanPhone,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        displayName: displayName.trim() || currentUser.displayName || cleanUsername,
        photoURL: photoURL || currentUser.photoURL || '',
      });

      onComplete({
        username: cleanUsername,
        phoneNumber: cleanPhone,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        displayName: displayName.trim() || currentUser.displayName || cleanUsername,
        photoURL: photoURL || currentUser.photoURL,
        onboardingCompleted: true,
      });

      showToast(`أهلاً بك @${cleanUsername}! تم حفظ بياناتك بنجاح.`);
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('permission') || errMsg.includes('Missing or insufficient permissions')) {
        setError('يرجى التحقق من صلاحيات Firestore في الكونسول (Firestore Rules) أو تحديث الصفحة وإعادة المحاولة.');
      } else if (errMsg.includes('offline') || errMsg.includes('network')) {
        setError('تعذر الاتصال بقاعدة البيانات، يرجى التحقق من اتصالك بالإنترنت.');
      } else {
        setError(`حدث خطأ أثناء حفظ البيانات (${err?.code || err?.message || 'يرجى المحاولة مجدداً'}).`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-[32px] md:rounded-[36px] p-6 md:p-8 max-w-lg w-full shadow-2xl border border-white/80 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#111827] text-[#b8f3df] flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Sparkles className="w-7 h-7" />
          </div>
          <span className="text-[#6d5dfc] text-xs font-bold uppercase tracking-wider">خطوة البداية</span>
          <h2 className="text-2xl md:text-3xl font-black text-[#18181b] tracking-tight mt-1">
            إعداد حسابك ومعلوماتك
          </h2>
          <p className="text-xs md:text-sm text-neutral-400 mt-1">
            حدد معرفك الفريد ورقم هاتفك وصورتك الشخصية لبدء التواصل الحقيقي
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* Photo Upload with ImageKit */}
        <div className="flex flex-col items-center justify-center mb-5">
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
            accept="image/*"
          />

          <div
            className="relative group cursor-pointer"
            onClick={() => photoInputRef.current?.click()}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-3xl object-cover border-2 border-neutral-200 shadow-md"
              />
            ) : (
              <div
                className={`w-20 h-20 rounded-3xl ${getRandomTone(
                  currentUser.uid
                )} flex items-center justify-center font-black text-xl shadow-md`}
              >
                {getInitials(displayName || 'مستخدم')}
              </div>
            )}

            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white">
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">رفع صورة</span>
            </div>

            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center text-white">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold">{uploadProgress}%</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="mt-1.5 text-xs font-bold text-[#6d5dfc] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{uploadingPhoto ? 'جارٍ الرفع...' : 'رفع صورة الحساب عبر ImageKit (اختياري)'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 text-right">
              الاسم الكامل
            </label>
            <div className="relative">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثال: مالك أحمد"
                className="w-full h-12 rounded-2xl bg-[#f8f7f3] px-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/40 text-right font-semibold"
                required
              />
              <User className="w-4 h-4 absolute left-4 top-4 text-neutral-400" />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 text-right flex justify-between items-center">
              <span>اسم المستخدم (Username)</span>
              <span className="text-[10px] text-[#6d5dfc] font-normal">معرفك الفريد للبحث</span>
            </label>
            <div className="relative">
              <span className="absolute right-4 top-3 text-neutral-400 text-sm font-bold">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="malek_2026"
                dir="ltr"
                className="w-full h-12 rounded-2xl bg-[#f8f7f3] pr-9 pl-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/40 font-mono text-left"
                required
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 text-right">
              مثال: ahmed_dev أو malek_vip (أحرف إنجليزية، أرقام، ونقاط)
            </p>
          </div>

          {/* Country Selection & Phone Number */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 text-right">
              الدولة ورقم الهاتف
            </label>

            <div className="space-y-2">
              {/* Country Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                  className="w-full h-12 rounded-2xl bg-[#f8f7f3] px-4 flex items-center justify-between border border-transparent hover:border-neutral-200 transition text-sm cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="font-bold text-neutral-800">{selectedCountry.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-500 font-mono text-xs">
                    <span>({selectedCountry.dialCode})</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Country Dropdown */}
                {countryDropdownOpen && (
                  <div className="absolute top-14 left-0 right-0 z-30 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 max-h-56 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-neutral-400" />
                      <input
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="ابحث عن الدولة أو الرمز..."
                        className="w-full h-9 rounded-xl bg-[#f8f7f3] pr-8 pl-3 text-xs outline-none text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      {filteredCountries.map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setCountryDropdownOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs transition cursor-pointer ${
                            selectedCountry.code === country.code
                              ? 'bg-[#e9e5ff] text-[#6d5dfc] font-bold'
                              : 'hover:bg-[#f8f7f3] text-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{country.flag}</span>
                            <span>{country.name}</span>
                          </div>
                          <span className="font-mono text-neutral-500 text-[11px]">{country.dialCode}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Input */}
              <div className="relative flex items-center">
                <div className="absolute right-3.5 flex items-center gap-1.5 text-neutral-600 font-mono text-xs font-bold pointer-events-none" dir="ltr">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.dialCode}</span>
                </div>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1012345678"
                  type="tel"
                  dir="ltr"
                  className="w-full h-12 rounded-2xl bg-[#f8f7f3] pr-20 pl-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/40 font-mono text-left"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploadingPhoto}
            className="w-full h-13 rounded-2xl bg-[#111827] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#302c52] transition disabled:opacity-50 cursor-pointer shadow-lg mt-6"
          >
            <Check className="w-5 h-5 text-emerald-400" />
            <span>{loading ? 'جارٍ حفظ الحساب في Firebase...' : 'إكمال الإعداد والبدء'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
