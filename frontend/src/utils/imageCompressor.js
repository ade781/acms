/**
 * Client-side image compressor utility
 * Converts any input image file (JPEG, PNG, HEIC, etc.) to image/webp
 * with max dimension of 1280px and quality 0.8 using HTML5 Canvas.
 *
 * @param {File|Blob} file - The original image file
 * @param {Object} options - Optional compression configuration
 * @param {number} [options.maxWidth=1280] - Maximum width in px
 * @param {number} [options.maxHeight=1280] - Maximum height in px
 * @param {number} [options.quality=0.8] - WebP quality (0.0 to 1.0)
 * @returns {Promise<File>} Compressed File in image/webp format
 */
export async function compressImageToWebP(file, options = {}) {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = options;

  if (!file || !file.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan berkas gambar yang valid.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scale
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
          reject(new Error('Gagal menginisialisasi canvas 2D context.'));
          return;
        }

        // Draw and compress to WebP
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengonversi gambar ke format WebP.'));
              return;
            }

            // Generate clean webp filename
            const originalName = file.name || 'image';
            const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            const webpFile = new File([blob], `${baseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat data gambar untuk diproses.'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca berkas gambar.'));
    };

    reader.readAsDataURL(file);
  });
}
