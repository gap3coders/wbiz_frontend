
export const MEDIA_LIBRARY_TYPES = ['image', 'video', 'document', 'audio'];

export const detectMediaAssetType = (fileOrMime, fallbackName = '') => {
  const mimeType =
    typeof fileOrMime === 'string'
      ? fileOrMime
      : String(fileOrMime?.type || '');
  const fileName =
    typeof fileOrMime === 'string'
      ? fallbackName
      : String(fileOrMime?.name || fallbackName || '');

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType || /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip)$/i.test(fileName)) return 'document';
  return 'document';
};

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read file ${file?.name || ''}`));
    reader.readAsDataURL(file);
  });

export const formatFileSize = (value) => {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
