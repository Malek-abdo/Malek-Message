import React, { useState } from 'react';
import { X, Download, ExternalLink, Check, Loader2 } from 'lucide-react';
import { downloadRemoteFile } from '../lib/downloader';

interface MediaLightboxProps {
  url: string | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ url, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!url) return null;

  const handleDownload = async () => {
    setDownloading(true);
    const fileName = `image-${Date.now()}.jpg`;
    await downloadRemoteFile(url, fileName);
    setDownloading(false);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={`px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold transition shadow-lg cursor-pointer ${
              downloaded
                ? 'bg-emerald-600 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title="تحميل الصورة بجودتها الأصلية"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : downloaded ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloaded ? 'تم التحميل' : 'تحميل الصورة'}</span>
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
            title="فتح الرابط الأصلي"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          title="إغلاق"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center p-2">
        <img
          src={url}
          alt="Full preview"
          referrerPolicy="no-referrer"
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
        />
      </div>
    </div>
  );
};
