const IMAGE_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.7,
};

export interface CompressedImage {
  dataUrl: string;
  size: number;
  width: number;
  height: number;
  originalName: string;
}

export function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const { maxWidth, maxHeight } = IMAGE_CONFIG;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_CONFIG.quality);
        const base64Length = dataUrl.split(',')[1].length;
        const size = Math.round((base64Length * 3) / 4);
        resolve({ dataUrl, size, width, height, originalName: file.name });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
