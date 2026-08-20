/**
 * ImageKit Client Upload Utility
 * Multi-strategy robust upload for Images, Videos, Audio, and Documents.
 */

export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  fileId?: string;
  name: string;
  fileType: 'image' | 'video' | 'audio' | 'file';
  size?: number;
}

export const IMAGEKIT_PUBLIC_KEY = 'public_+zeLkm1+EQPgROSL0v3Fp/UlHfs=';
export const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/titl32n0d';

/**
 * Categorizes a file by MIME type or extension
 */
export function getFileCategory(file: File | { name: string; type?: string }): 'image' | 'video' | 'audio' | 'file' {
  const mime = file.type || '';
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
    return 'audio';
  }
  return 'file';
}

/**
 * Format bytes to readable Arabic/English size string (KB, MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'حجم غير معروف';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitizes filename to prevent upload errors with special characters
 */
function sanitizeFileName(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
  const safeName = (baseName.slice(0, 50) || 'file') + (ext ? `.${ext}` : '');
  return safeName;
}

/**
 * Direct Upload to ImageKit REST API with real progress monitoring via XMLHttpRequest
 */
async function uploadDirectViaFormData(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // 1. Fetch authentication parameters from server
  const authRes = await fetch('/api/imagekit/auth');
  if (!authRes.ok) {
    throw new Error('تعذر الحصول على رموز المصادقة من الخادم');
  }
  const authData = await authRes.json();
  const { token, expire, signature } = authData;

  if (!token || !signature || !expire) {
    throw new Error('رموز مصادقة ImageKit غير صالحة');
  }

  const category = getFileCategory(file);
  const cleanName = sanitizeFileName(file.name);

  // 2. Prepare FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', cleanName);
  formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
  formData.append('signature', signature);
  formData.append('expire', expire.toString());
  formData.append('token', token);
  formData.append('folder', '/malek_messages');
  formData.append('useUniqueFileName', 'true');

  // 3. Upload using XMLHttpRequest to get accurate real-time progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 95);
        onProgress(Math.max(5, percent));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          onProgress?.(100);
          resolve({
            url: res.url,
            thumbnailUrl: res.thumbnailUrl || res.url,
            fileId: res.fileId,
            name: file.name,
            fileType: category,
            size: res.size || file.size,
          });
        } catch (e) {
          reject(new Error('فشل قراءة رد ImageKit'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.message || errRes.error || `فشل الرفع برمز الحالة ${xhr.status}`));
        } catch {
          reject(new Error(`فشل الرفع المباشر إلى ImageKit (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('خطأ في الاتصال أثناء الرفع المباشر إلى ImageKit'));
    xhr.ontimeout = () => reject(new Error('انتهت مهلة الرفع، يرجى المحاولة مرة أخرى'));

    xhr.send(formData);
  });
}

/**
 * Fallback Upload via Backend Server Proxy Endpoint
 */
async function uploadViaServerProxy(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  onProgress?.(20);
  const category = getFileCategory(file);

  // Convert to base64 Data URL
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  onProgress?.(50);

  const response = await fetch('/api/imagekit/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: base64Data,
      fileName: sanitizeFileName(file.name),
      folder: '/malek_messages',
    }),
  });

  onProgress?.(85);

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `فشل الرفع عبر الخادم (${response.status})`);
  }

  const data = await response.json();
  onProgress?.(100);

  return {
    url: data.url,
    thumbnailUrl: data.thumbnailUrl || data.url,
    fileId: data.fileId,
    name: file.name,
    fileType: category,
    size: data.size || file.size,
  };
}

/**
 * Main Upload Function with Automatic Multi-Strategy Fallback
 */
export async function uploadToImageKit(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Check file size (limit to 35MB for stability)
  const maxBytes = 35 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('حجم الملف كبير جداً، الحد الأقصى المسموح به هو 35 ميجابايت.');
  }

  onProgress?.(5);

  // Attempt Strategy 1: Direct browser upload via FormData
  try {
    const result = await uploadDirectViaFormData(file, onProgress);
    return result;
  } catch (directErr: any) {
    console.warn('Direct ImageKit upload failed, trying server proxy fallback:', directErr);
    
    // Attempt Strategy 2: Server proxy endpoint
    try {
      const result = await uploadViaServerProxy(file, onProgress);
      return result;
    } catch (serverErr: any) {
      console.error('All ImageKit upload strategies failed:', { directErr, serverErr });
      throw new Error(
        serverErr.message || directErr.message || 'فشل رفع الملف عبر ImageKit، يرجى المحاولة لاحقاً.'
      );
    }
  }
}
