/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Downloads any remote file (Image, Video, Audio, Document) to the user's device.
 * Ensures an actual file download (save to Downloads) rather than merely viewing it.
 */
export async function downloadRemoteFile(
  url: string,
  suggestedFileName: string = 'download'
): Promise<boolean> {
  if (!url) return false;

  try {
    // 1. Fetch the file data as Blob to force a real binary download
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = sanitizeFileName(suggestedFileName);
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);
      
      return true;
    }
  } catch (err) {
    console.warn('Fetch blob download error, trying direct download link with fallback:', err);
  }

  // 2. Direct Anchor trigger with download attribute
  try {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = sanitizeFileName(suggestedFileName);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2000);
    return true;
  } catch (err) {
    console.error('Download link trigger failed:', err);
    window.open(url, '_blank');
    return false;
  }
}

function sanitizeFileName(name: string): string {
  if (!name) return `file-${Date.now()}`;
  return name.replace(/[/\\?%*:|"<>]/g, '-');
}
