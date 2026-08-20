import React, { useState, useRef } from 'react';
import { Sparkles, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { createQuickNote } from '../lib/firestoreService';
import { uploadToImageKit } from '../lib/imagekit';

interface NewNoteModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  showToast,
}) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setUploadProgress(10);
      showToast('جارٍ رفع الصورة عبر ImageKit...');

      const result = await uploadToImageKit(file, (p) => setUploadProgress(p));
      setImageUrl(result.url);
      showToast('تم إرفاق الصورة بنجاح!');
    } catch (err: any) {
      console.error('Failed to upload note image:', err);
      showToast(err.message || 'فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;

    try {
      setLoading(true);
      await createQuickNote(currentUser, content, imageUrl || undefined);
      showToast('تم نشر ملاحظتك السريعة بنجاح!');
      setContent('');
      setImageUrl('');
      onClose();
    } catch (err) {
      console.error('Failed to post quick note:', err);
      showToast('حدث خطأ أثناء نشر الملاحظة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-white/80 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#e9e5ff] text-[#6d5dfc] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#18181b]">ملاحظة سريعة</h3>
              <p className="text-xs text-neutral-400">شارك فكرة أو صورة مع الجميع</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#f8f7f3] flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="اكتب فكرة سريعة، تجربة، أو تحية لطيفة..."
              className="w-full rounded-2xl bg-[#f8f7f3] p-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right resize-none"
              required={!imageUrl}
            />
          </div>

          {/* Attached Image Preview */}
          {imageUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 group">
              <img src={imageUrl} alt="Attached" className="w-full h-36 object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Photo Button */}
          <div className="flex items-center justify-between pt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="px-3.5 py-2 rounded-xl bg-[#f8f7f3] hover:bg-[#e9e5ff] text-neutral-700 hover:text-[#6d5dfc] text-xs font-bold flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#6d5dfc]" />
                  <span>جارٍ الرفع ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-[#6d5dfc]" />
                  <span>إرفاق صورة عبر ImageKit</span>
                </>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={(!content.trim() && !imageUrl) || loading || uploadingImage}
            className="w-full h-12 rounded-2xl bg-[#111827] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#302c52] transition disabled:opacity-50 cursor-pointer shadow-md mt-4"
          >
            <Send className="w-4 h-4 rotate-180 text-emerald-400" />
            <span>{loading ? 'جارٍ النشر...' : 'نشر الملاحظة'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
