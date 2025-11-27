export const IMAGE_CONSTANTS = {
  MAX_SIZE_MB: 5,
  MAX_DIMENSION: 1200,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'] as const,
  COMPRESSION_QUALITY: 0.85,
  MIN_QUALITY: 0.1,
};

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes: string[] = [...IMAGE_CONSTANTS.ALLOWED_TYPES];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a JPEG or PNG image',
    };
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > IMAGE_CONSTANTS.MAX_SIZE_MB) {
    return {
      valid: false,
      error: `Image size must be less than ${IMAGE_CONSTANTS.MAX_SIZE_MB}MB (current: ${fileSizeMB.toFixed(2)}MB)`,
    };
  }

  return { valid: true };
}

export async function compressImage(file: File, maxSizeMB: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > IMAGE_CONSTANTS.MAX_DIMENSION || height > IMAGE_CONSTANTS.MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * IMAGE_CONSTANTS.MAX_DIMENSION;
            width = IMAGE_CONSTANTS.MAX_DIMENSION;
          } else {
            width = (width / height) * IMAGE_CONSTANTS.MAX_DIMENSION;
            height = IMAGE_CONSTANTS.MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = IMAGE_CONSTANTS.COMPRESSION_QUALITY;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        const targetSize = maxSizeMB * 1024 * 1024 * 1.37;

        while (dataUrl.length > targetSize && quality > IMAGE_CONSTANTS.MIN_QUALITY) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;

  try {
    if (url.startsWith('data:image/')) {
      return true;
    }

    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const CROP_ICONS: Record<string, string> = {
  maize: '🌽',
  corn: '🌽',
  tomato: '🍅',
  tomatoes: '🍅',
  rice: '🌾',
  cassava: '🥔',
  yam: '🍠',
  potato: '🥔',
  potatoes: '🥔',
  pepper: '🌶️',
  peppers: '🌶️',
  onion: '🧅',
  onions: '🧅',
  banana: '🍌',
  bananas: '🍌',
  plantain: '🍌',
  plantains: '🍌',
  orange: '🍊',
  oranges: '🍊',
  mango: '🥭',
  mangoes: '🥭',
  pineapple: '🍍',
  pineapples: '🍍',
  watermelon: '🍉',
  watermelons: '🍉',
  coconut: '🥥',
  coconuts: '🥥',
  carrot: '🥕',
  carrots: '🥕',
  cabbage: '🥬',
  lettuce: '🥬',
  cucumber: '🥒',
  cucumbers: '🥒',
  beans: '🫘',
  soya: '🫘',
  soybean: '🫘',
  wheat: '🌾',
  barley: '🌾',
  peanut: '🥜',
  peanuts: '🥜',
  groundnut: '🥜',
  groundnuts: '🥜',
  avocado: '🥑',
  avocados: '🥑',
  eggplant: '🍆',
  eggplants: '🍆',
  broccoli: '🥦',
  spinach: '🥬',
  kale: '🥬',
  apple: '🍎',
  apples: '🍎',
  grape: '🍇',
  grapes: '🍇',
  strawberry: '🍓',
  strawberries: '🍓',
  lemon: '🍋',
  lemons: '🍋',
  lime: '🍋',
  limes: '🍋',
  peach: '🍑',
  peaches: '🍑',
  cherry: '🍒',
  cherries: '🍒',
  kiwi: '🥝',
  kiwis: '🥝',
  papaya: '🫐',
  papayas: '🫐',
};

export function getCropIcon(crop: string): string {
  const normalized = crop.toLowerCase().trim();
  return CROP_ICONS[normalized] || '🌱';
}
