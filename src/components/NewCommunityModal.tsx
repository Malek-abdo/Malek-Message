import React, { useState, useRef } from 'react';
import { Users, X, Plus, Image as ImageIcon, Camera, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { createCommunity } from '../lib/firestoreService';
import { uploadToImageKit } from '../lib/imagekit';

interface NewCommunityModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
  showToast: (msg: string) => void;
}

export const NewCommunityModal: React.FC<NewCommunityModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      setUploadProgress(10);
      showToast('جارٍ رفع صورة الدائرة عبر ImageKit...');

      const result = await uploadToImageKit(file, (p) => setUploadProgress(p));
      setCoverUrl(result.url);
      showToast('تم رفع صورة غلاف الدائرة بنجاح!');
    } catch (err: any) {
      console.error('Failed to upload community cover:', err);
      showToast(err.message || 'فشل رفع صورة الغلاف');
    } finally {
      setUploadingCover(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      const id = await createCommunity(currentUser, title, description, coverUrl);
      showToast(`تم إنشاء دائرة "${title}" بنجاح!`);
      setTitle('');
      setDescription('');
      setCoverUrl('');
      onSuccess(id);
      onClose();
    } catch (err) {
      console.error('Failed to create community:', err);
      showToast('حدث خطأ أثناء إنشاء الدائرة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-white/80 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#b8f3df] text-[#065f46] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#18181b]">إنشاء دائرة جديدة</h3>
              <p className="text-xs text-neutral-400">اجمع المهتمين بموضوع تحبه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#f8f7f3] flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cover Photo Upload with ImageKit */}
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCoverUpload}
            className="hidden"
            accept="image/*"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-28 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-[#6d5dfc] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group bg-[#f8f7f3] transition"
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Community Cover"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3">
                <div className="w-8 h-8 rounded-xl bg-[#e9e5ff] text-[#6d5dfc] flex items-center justify-center mx-auto mb-1">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-neutral-700 block">
                  رفع صورة غلاف عبر ImageKit (اختياري)
                </span>
                <span className="text-[10px] text-neutral-400">انقر لاختيار صورة من جهازك</span>
              </div>
            )}

            {uploadingCover && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-1" />
                <span className="text-xs font-bold">{uploadProgress}%</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">اسم الدائرة</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مطورو الويب العرب، كتب وفلسفة..."
              className="w-full h-12 rounded-2xl bg-[#f8f7f3] px-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">وصف الدائرة</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="عن ماذا تدور هذه الدائرة ومن هم الأشخاص المدعوون؟"
              className="w-full rounded-2xl bg-[#f8f7f3] p-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim() || loading || uploadingCover}
            className="w-full h-12 rounded-2xl bg-[#111827] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#302c52] transition disabled:opacity-50 cursor-pointer shadow-md mt-6"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'جارٍ الإنشاء...' : 'إنشاء الدائرة الآن'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
