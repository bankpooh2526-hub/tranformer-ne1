/**
 * Client-side image compression and watermark utility
 * Optimizes field photos for high speed & bandwidth efficiency on mobile networks
 */

export interface WatermarkInfo {
  transformerId?: string;
  dateTime?: string;
  coordinates?: string;
  inspector?: string;
}

export async function compressAndWatermarkImage(
  file: File | Blob,
  fileName: string,
  watermark?: WatermarkInfo,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<{ blob: Blob; previewUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas 2D context is not available'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Draw watermark overlay if provided
        if (watermark) {
          const fontSize = Math.max(14, Math.floor(width / 45));
          ctx.font = `600 ${fontSize}px sans-serif`;

          const lines: string[] = [];
          if (watermark.transformerId) {
            lines.push(`หม้อแปลง: ${watermark.transformerId}`);
          }
          if (watermark.dateTime) {
            lines.push(`วันที่/เวลา: ${watermark.dateTime}`);
          }
          if (watermark.coordinates) {
            lines.push(`พิกัด: ${watermark.coordinates}`);
          }
          if (watermark.inspector) {
            lines.push(`ผู้ตรวจ: ${watermark.inspector}`);
          }

          if (lines.length > 0) {
            const padding = Math.floor(fontSize * 0.8);
            const lineHeight = Math.floor(fontSize * 1.35);
            const boxHeight = lines.length * lineHeight + padding * 2;
            let maxTextWidth = 0;
            lines.forEach((line) => {
              const metrics = ctx.measureText(line);
              if (metrics.width > maxTextWidth) maxTextWidth = metrics.width;
            });
            const boxWidth = maxTextWidth + padding * 2;

            // Semi-transparent dark banner in bottom right
            const boxX = width - boxWidth - padding;
            const boxY = height - boxHeight - padding;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
            ctx.fill();

            // Text rendering
            ctx.fillStyle = '#ffffff';
            lines.forEach((line, index) => {
              ctx.fillText(
                line,
                boxX + padding,
                boxY + padding + (index + 1) * lineHeight - (lineHeight - fontSize) / 2
              );
            });
          }
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate compressed image blob'));
              return;
            }
            const previewUrl = URL.createObjectURL(blob);
            resolve({
              blob,
              previewUrl,
              size: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
