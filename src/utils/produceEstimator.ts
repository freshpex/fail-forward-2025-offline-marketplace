/**
 * Smart Produce Weight & Dimension Estimator
 * 
 * This module provides estimated weights and package dimensions for common
 * Nigerian agricultural products based on their package type.
 * 
 * Farmers don't need to know exact weights - the system estimates based on:
 * 1. Crop type (tomatoes, rice, yams, etc.)
 * 2. Package type (bags, crates, baskets, etc.)
 * 
 * These estimates help Terminal Africa calculate more accurate shipping costs.
 */

// Common Nigerian crops with their typical weight per kg or piece
interface CropData {
  name: string;
  category: 'grain' | 'tuber' | 'fruit' | 'vegetable' | 'legume' | 'oil' | 'other';
  // Typical weight per single unit (in kg)
  weightPerPiece?: number;
  // Density factor for bulk items (affects how heavy a bag is)
  densityFactor: number;
}

const CROP_DATABASE: Record<string, CropData> = {
  // Grains
  'rice': { name: 'Rice', category: 'grain', densityFactor: 0.85 },
  'maize': { name: 'Maize', category: 'grain', densityFactor: 0.75 },
  'corn': { name: 'Corn', category: 'grain', densityFactor: 0.75 },
  'millet': { name: 'Millet', category: 'grain', densityFactor: 0.78 },
  'sorghum': { name: 'Sorghum', category: 'grain', densityFactor: 0.77 },
  'wheat': { name: 'Wheat', category: 'grain', densityFactor: 0.80 },
  
  // Tubers
  'yam': { name: 'Yam', category: 'tuber', weightPerPiece: 3.5, densityFactor: 0.9 },
  'cassava': { name: 'Cassava', category: 'tuber', weightPerPiece: 2.0, densityFactor: 0.85 },
  'potato': { name: 'Potato', category: 'tuber', weightPerPiece: 0.2, densityFactor: 0.8 },
  'sweet potato': { name: 'Sweet Potato', category: 'tuber', weightPerPiece: 0.3, densityFactor: 0.8 },
  'cocoyam': { name: 'Cocoyam', category: 'tuber', weightPerPiece: 0.5, densityFactor: 0.85 },
  
  // Fruits
  'tomato': { name: 'Tomato', category: 'fruit', weightPerPiece: 0.15, densityFactor: 0.6 },
  'tomatoes': { name: 'Tomatoes', category: 'fruit', weightPerPiece: 0.15, densityFactor: 0.6 },
  'orange': { name: 'Orange', category: 'fruit', weightPerPiece: 0.2, densityFactor: 0.55 },
  'mango': { name: 'Mango', category: 'fruit', weightPerPiece: 0.3, densityFactor: 0.5 },
  'banana': { name: 'Banana', category: 'fruit', weightPerPiece: 0.12, densityFactor: 0.5 },
  'plantain': { name: 'Plantain', category: 'fruit', weightPerPiece: 0.25, densityFactor: 0.55 },
  'pineapple': { name: 'Pineapple', category: 'fruit', weightPerPiece: 1.5, densityFactor: 0.45 },
  'pawpaw': { name: 'Pawpaw', category: 'fruit', weightPerPiece: 1.2, densityFactor: 0.4 },
  'papaya': { name: 'Papaya', category: 'fruit', weightPerPiece: 1.2, densityFactor: 0.4 },
  'watermelon': { name: 'Watermelon', category: 'fruit', weightPerPiece: 5.0, densityFactor: 0.35 },
  'coconut': { name: 'Coconut', category: 'fruit', weightPerPiece: 1.0, densityFactor: 0.5 },
  'avocado': { name: 'Avocado', category: 'fruit', weightPerPiece: 0.2, densityFactor: 0.55 },
  
  // Vegetables
  'pepper': { name: 'Pepper', category: 'vegetable', weightPerPiece: 0.05, densityFactor: 0.4 },
  'onion': { name: 'Onion', category: 'vegetable', weightPerPiece: 0.15, densityFactor: 0.65 },
  'garlic': { name: 'Garlic', category: 'vegetable', weightPerPiece: 0.05, densityFactor: 0.6 },
  'ginger': { name: 'Ginger', category: 'vegetable', weightPerPiece: 0.1, densityFactor: 0.7 },
  'okra': { name: 'Okra', category: 'vegetable', weightPerPiece: 0.02, densityFactor: 0.35 },
  'spinach': { name: 'Spinach', category: 'vegetable', densityFactor: 0.25 },
  'ugwu': { name: 'Ugwu', category: 'vegetable', densityFactor: 0.3 },
  'bitter leaf': { name: 'Bitter Leaf', category: 'vegetable', densityFactor: 0.25 },
  'cabbage': { name: 'Cabbage', category: 'vegetable', weightPerPiece: 1.5, densityFactor: 0.4 },
  'carrot': { name: 'Carrot', category: 'vegetable', weightPerPiece: 0.1, densityFactor: 0.55 },
  'cucumber': { name: 'Cucumber', category: 'vegetable', weightPerPiece: 0.3, densityFactor: 0.45 },
  'lettuce': { name: 'Lettuce', category: 'vegetable', weightPerPiece: 0.3, densityFactor: 0.2 },
  'eggplant': { name: 'Eggplant', category: 'vegetable', weightPerPiece: 0.25, densityFactor: 0.45 },
  'garden egg': { name: 'Garden Egg', category: 'vegetable', weightPerPiece: 0.1, densityFactor: 0.5 },
  
  // Legumes
  'beans': { name: 'Beans', category: 'legume', densityFactor: 0.82 },
  'groundnut': { name: 'Groundnut', category: 'legume', densityFactor: 0.65 },
  'peanut': { name: 'Peanut', category: 'legume', densityFactor: 0.65 },
  'soybean': { name: 'Soybean', category: 'legume', densityFactor: 0.75 },
  'cowpea': { name: 'Cowpea', category: 'legume', densityFactor: 0.78 },
  'bambara nut': { name: 'Bambara Nut', category: 'legume', densityFactor: 0.72 },
  
  // Oil crops
  'palm oil': { name: 'Palm Oil', category: 'oil', densityFactor: 0.92 },
  'palm kernel': { name: 'Palm Kernel', category: 'oil', densityFactor: 0.6 },
  'shea butter': { name: 'Shea Butter', category: 'oil', densityFactor: 0.88 },
  
  // Others
  'fish': { name: 'Fish', category: 'other', weightPerPiece: 0.5, densityFactor: 0.7 },
  'crayfish': { name: 'Crayfish', category: 'other', densityFactor: 0.45 },
  'snail': { name: 'Snail', category: 'other', weightPerPiece: 0.1, densityFactor: 0.6 },
  'honey': { name: 'Honey', category: 'oil', densityFactor: 1.4 },
};

// Package types with their typical dimensions and capacity
interface PackageData {
  // Typical dimensions in cm
  length: number;
  width: number;
  height: number;
  // Typical weight capacity in kg
  capacityKg: number;
  // Volume in liters (for liquid measurements)
  volumeLiters?: number;
}

const PACKAGE_DATABASE: Record<string, PackageData> = {
  // Standard bags
  'bags': { length: 70, width: 45, height: 20, capacityKg: 50 },
  'sacks': { length: 90, width: 55, height: 25, capacityKg: 100 },
  
  // Containers
  'crates': { length: 60, width: 40, height: 30, capacityKg: 25 },
  'baskets': { length: 50, width: 50, height: 40, capacityKg: 20 },
  'buckets': { length: 35, width: 35, height: 40, capacityKg: 20, volumeLiters: 20 },
  'drums': { length: 60, width: 60, height: 90, capacityKg: 200, volumeLiters: 200 },
  'jerry cans': { length: 25, width: 25, height: 40, capacityKg: 25, volumeLiters: 25 },
  
  // Bundles
  'bundles': { length: 50, width: 30, height: 30, capacityKg: 10 },
  'bunches': { length: 40, width: 30, height: 40, capacityKg: 15 },
  
  // By weight/volume
  'kg': { length: 30, width: 20, height: 15, capacityKg: 1 },
  'tons': { length: 120, width: 100, height: 100, capacityKg: 1000 },
  'liters': { length: 15, width: 15, height: 30, capacityKg: 1, volumeLiters: 1 },
  
  // Individual items
  'pieces': { length: 25, width: 20, height: 15, capacityKg: 2 },
  
  // Custom/default
  'custom': { length: 40, width: 30, height: 25, capacityKg: 15 },
};

export interface PackageEstimate {
  weightKg: number;
  length: number;
  width: number;
  height: number;
  volumetricWeight: number;
  chargeableWeight: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

/**
 * Find crop data by name (case-insensitive, partial match)
 */
function findCrop(cropName: string): CropData | null {
  const normalized = cropName.toLowerCase().trim();
  
  // Exact match
  if (CROP_DATABASE[normalized]) {
    return CROP_DATABASE[normalized];
  }
  
  // Partial match
  for (const [key, data] of Object.entries(CROP_DATABASE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return data;
    }
  }
  
  return null;
}

/**
 * Find package data by type (case-insensitive)
 */
function findPackage(packageType: string): PackageData {
  const normalized = packageType.toLowerCase().trim();
  return PACKAGE_DATABASE[normalized] || PACKAGE_DATABASE['custom'];
}

/**
 * Estimate package weight and dimensions for shipping
 * 
 * @param cropName - Name of the crop (e.g., "Tomatoes", "Rice")
 * @param packageType - Type of package (e.g., "bags", "crates")
 * @param quantity - Number of packages
 * @param measurementValue - Optional: weight per package if known (in kg)
 * @returns PackageEstimate with weight, dimensions, and confidence level
 */
export function estimatePackage(
  cropName: string,
  packageType: string,
  quantity: number,
  measurementValue?: number | null
): PackageEstimate {
  const crop = findCrop(cropName);
  const pkg = findPackage(packageType);
  
  let weightPerPackage: number;
  let confidence: 'high' | 'medium' | 'low';
  let notes: string;
  
  // If farmer provided measurement value (weight per package), use it
  if (measurementValue && measurementValue > 0) {
    weightPerPackage = measurementValue;
    confidence = 'high';
    notes = 'Weight provided by seller';
  }
  // If we know the crop, estimate based on package capacity and density
  else if (crop) {
    weightPerPackage = pkg.capacityKg * crop.densityFactor;
    confidence = 'medium';
    notes = `Estimated based on ${crop.name} in ${packageType}`;
  }
  // Fallback: use package capacity with default density
  else {
    weightPerPackage = pkg.capacityKg * 0.6; // Default 60% fill
    confidence = 'low';
    notes = 'Generic estimate - crop type not recognized';
  }
  
  const totalWeight = weightPerPackage * quantity;
  
  // Scale dimensions based on quantity (for shipping calculation)
  // If more than 1 package, increase dimensions proportionally
  const scaleFactor = Math.cbrt(quantity); // Cube root for 3D scaling
  const scaledLength = Math.min(pkg.length * Math.max(1, scaleFactor), 200);
  const scaledWidth = Math.min(pkg.width * Math.max(1, scaleFactor), 150);
  const scaledHeight = Math.min(pkg.height * quantity, 200); // Stack vertically
  
  // Volumetric weight (shipping industry standard: L × W × H / 5000)
  const volumetricWeight = (scaledLength * scaledWidth * scaledHeight) / 5000;
  
  // Chargeable weight is the greater of actual and volumetric weight
  const chargeableWeight = Math.max(totalWeight, volumetricWeight);
  
  return {
    weightKg: Math.round(totalWeight * 10) / 10,
    length: Math.round(scaledLength),
    width: Math.round(scaledWidth),
    height: Math.round(scaledHeight),
    volumetricWeight: Math.round(volumetricWeight * 10) / 10,
    chargeableWeight: Math.round(chargeableWeight * 10) / 10,
    confidence,
    notes,
  };
}

/**
 * Get quick weight estimate for a single unit
 */
export function getUnitWeight(cropName: string, packageType: string): number {
  const estimate = estimatePackage(cropName, packageType, 1);
  return estimate.weightKg;
}

/**
 * Get package dimensions for a single unit
 */
export function getPackageDimensions(packageType: string): { length: number; width: number; height: number } {
  const pkg = findPackage(packageType);
  return {
    length: pkg.length,
    width: pkg.width,
    height: pkg.height,
  };
}

/**
 * Format weight for display
 */
export function formatWeight(weightKg: number): string {
  if (weightKg >= 1000) {
    return `${(weightKg / 1000).toFixed(1)} tons`;
  }
  return `${weightKg.toFixed(1)} kg`;
}

// Export database for reference
export { CROP_DATABASE, PACKAGE_DATABASE };
