/**
 * Image compression utility for mobile upload optimization
 * 모바일 업로드 최적화를 위한 이미지 압축 유틸리티
 */

import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  /** Maximum file size in MB (default: 1) */
  maxSizeMB?: number;
  /** Maximum width or height in pixels (default: 1920) */
  maxWidthOrHeight?: number;
  /** Use web worker to avoid blocking main thread (default: true) */
  useWebWorker?: boolean;
  /** Preserve EXIF orientation data (default: true) */
  preserveExif?: boolean;
  /** Progress callback for compression (0-100) */
  onProgress?: (progress: number) => void;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasConverted: boolean;
  wasCompressed: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<CompressionOptions, 'onProgress'>> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: true,
};

/**
 * Check if a file is HEIC/HEIF format (iOS)
 */
export const isHeicFile = (file: File): boolean => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
};

/**
 * Convert HEIC/HEIF to JPEG
 * iOS에서 촬영한 HEIC/HEIF 이미지를 JPEG로 변환
 */
export const convertHeicToJpeg = async (file: File): Promise<File> => {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    // Dynamic import to avoid loading heic2any on non-iOS devices
    const heic2any = (await import('heic2any')).default;

    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    // heic2any can return an array of blobs for multi-image HEIC files
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;

    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([resultBlob], newFileName, { type: 'image/jpeg' });
  } catch (error) {
    console.warn('HEIC conversion failed, returning original file:', error);
    return file;
  }
};

/**
 * Get image dimensions from a file
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Check if compression is needed
 */
const needsCompression = (file: File, options: Required<Omit<CompressionOptions, 'onProgress'>>): boolean => {
  // Always compress if file is larger than target
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > options.maxSizeMB) {
    return true;
  }

  // Also compress large images even if file size is small
  // (will be checked by dimensions in compressImage)
  return fileSizeMB > options.maxSizeMB * 0.8; // Compress if within 80% of limit
};

/**
 * Compress an image file
 * 이미지 파일 압축
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compression result with file and metadata
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;
  let processedFile = file;
  let wasConverted = false;
  let wasCompressed = false;

  // Step 1: Convert HEIC/HEIF to JPEG if needed
  if (isHeicFile(file)) {
    processedFile = await convertHeicToJpeg(file);
    wasConverted = processedFile !== file;
  }

  // Step 2: Check if compression is needed
  const fileSizeMB = processedFile.size / (1024 * 1024);

  if (fileSizeMB <= opts.maxSizeMB * 0.5) {
    // File is already small enough, skip compression
    return {
      file: processedFile,
      originalSize,
      compressedSize: processedFile.size,
      compressionRatio: originalSize / processedFile.size,
      wasConverted,
      wasCompressed: false,
    };
  }

  // Step 3: Compress the image
  try {
    const compressedFile = await imageCompression(processedFile, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: opts.useWebWorker,
      preserveExif: opts.preserveExif,
      onProgress: opts.onProgress,
      fileType: 'image/jpeg', // Always output JPEG for consistent compression
    });

    wasCompressed = true;

    // Ensure the file has a proper name
    const finalFile = new File(
      [compressedFile],
      processedFile.name.replace(/\.\w+$/, '.jpg'),
      { type: 'image/jpeg' }
    );

    return {
      file: finalFile,
      originalSize,
      compressedSize: finalFile.size,
      compressionRatio: originalSize / finalFile.size,
      wasConverted,
      wasCompressed,
    };
  } catch (error) {
    console.warn('Image compression failed, returning original file:', error);
    return {
      file: processedFile,
      originalSize,
      compressedSize: processedFile.size,
      compressionRatio: 1,
      wasConverted,
      wasCompressed: false,
    };
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

/**
 * Calculate compression percentage
 */
export const getCompressionPercentage = (result: CompressionResult): number => {
  if (result.originalSize === 0) return 0;
  return Math.round((1 - result.compressedSize / result.originalSize) * 100);
};
