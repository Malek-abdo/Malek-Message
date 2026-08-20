import React, { useState, useRef } from 'react';
import { User, X, Check, Phone, Globe, ChevronDown, Search, Camera, Loader2 } from 'lucide-react';
import { UserProfile, CountryInfo } from '../types';
import { COUNTRIES, DEFAULT_COUNTRY } from '../data/countries';
import { updateUserProfile, getInitials, getRandomTone } from '../lib/firestoreService';
import { uploadToImageKit } from '../lib/imagekit';

interface EditProfileModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updated: Partial<UserProfile>) => void;
  showToast: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
  showToast,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [username, setUsername] = useState(currentUser.username || '');
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
  const [bio, setBio] = useState(currentUser.bio || '');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      showToast('جارٍ رفع صورتك الشخصية عبر ImageKit...');

      const result = await uploadToImageKit(file, (p) => setUploadProgress(p));
      setPhotoURL(result.url);
      showToast('تم رفع الصورة بنجاح! احفظ التعديلات لتطبيقها.');
    } catch (err: any) {
      console.error('Failed to upload profile photo:', err);
      showToast(err.message || 'فشل رفع الصورة عبر ImageKit');
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

    if (cleanUsername.length < 3) {
      setError('اسم المستخدم يجب ألا يقل عن 3 أحرف.');
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ونقاط فقط.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const updatedData: Partial<UserProfile> = {
        displayName: displayName.trim() || currentUser.displayName,
        username: cleanUsername,
        phoneNumber: cleanPhone,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        photoURL: photoURL || currentUser.photoURL,
        bio: bio.trim(),
      };

      await updateUserProfile(currentUser.uid, updatedData);
      onProfileUpdated(updatedData);

      showToast('تم تحديث الملف الشخصي ورقم الهاتف بنجاح!');
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('تعذر تحديث البيانات، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-white/80 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#e9e5ff] text-[#6d5dfc] flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#18181b]">تعديل الملف الشخصي</h3>
              <p className="text-xs text-neutral-400">تحديث صورتك وبياناتك في Firebase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#f8f7f3] flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Profile Avatar Upload with ImageKit */}
        <div className="flex flex-col items-center justify-center mb-6">
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
            accept="image/*"
          />

          <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
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
                {getInitials(displayName || currentUser.displayName)}
              </div>
            )}

            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white">
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">تغيير الصورة</span>
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
            className="mt-2 text-xs font-bold text-[#6d5dfc] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{uploadingPhoto ? 'جارٍ الرفع عبر ImageKit...' : 'رفع صورة شخصية جديدة عبر ImageKit'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">الاسم المعروض</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك الكامل"
              className="w-full h-12 rounded-2xl bg-[#f8f7f3] px-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">اسم المستخدم (المعرف)</label>
            <div className="relative">
              <span className="absolute right-4 top-3.5 text-neutral-400 text-sm font-bold">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                dir="ltr"
                className="w-full h-12 rounded-2xl bg-[#f8f7f3] pr-9 pl-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 font-mono text-left"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">الدولة ورقم الهاتف</label>
            <div className="space-y-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                  className="w-full h-12 rounded-2xl bg-[#f8f7f3] px-4 flex items-center justify-between border border-transparent text-sm cursor-pointer"
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

                {countryDropdownOpen && (
                  <div className="absolute top-14 left-0 right-0 z-30 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 max-h-48 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-neutral-400" />
                      <input
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="بحث بالدولة أو الرمز..."
                        className="w-full h-8 rounded-xl bg-[#f8f7f3] pr-8 pl-3 text-xs outline-none text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(c);
                            setCountryDropdownOpen(false);
                          }}
                          className="w-full p-2 rounded-xl flex items-center justify-between text-xs hover:bg-[#f8f7f3] cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                          </div>
                          <span className="font-mono text-neutral-400 text-[11px]">{c.dialCode}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative flex items-center">
                <div className="absolute right-3.5 flex items-center gap-1 text-neutral-500 font-mono text-xs font-bold pointer-events-none" dir="ltr">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.dialCode}</span>
                </div>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1012345678"
                  type="tel"
                  dir="ltr"
                  className="w-full h-12 rounded-2xl bg-[#f8f7f3] pr-20 pl-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 font-mono text-left"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">نبذة عنك (Bio)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="اكتب نبذة قصيرة عن اهتماماتك..."
              className="w-full rounded-2xl bg-[#f8f7f3] p-3 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || uploadingPhoto}
            className="w-full h-12 rounded-2xl bg-[#111827] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#302c52] transition disabled:opacity-50 cursor-pointer shadow-md mt-6"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات في Firebase'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
