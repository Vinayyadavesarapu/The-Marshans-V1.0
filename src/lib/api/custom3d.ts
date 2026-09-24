/**
 * THE MARSHANS — Custom 3D Fabrication Service Layer
 */

import { apiClient } from './client';

export interface Custom3DQuoteRequest {
  fileName?: string;
  fileSize?: number;
  material: 'pla_plus' | 'petg' | 'resin' | 'carbon_fiber' | 'tpu';
  color: string;
  dimensionsMm: {
    x: number;
    y: number;
    z: number;
  };
  quantity: number;
  infillPercent: number;
  finishing: 'raw_satin' | 'vapor_smooth' | 'hand_buffed' | 'painted';
  notes?: string;
  contactEmail: string;
  contactPhone?: string;
}

export function calculateEstimatedQuote(req: Partial<Custom3DQuoteRequest>): number {
  const x = req.dimensionsMm?.x || 100;
  const y = req.dimensionsMm?.y || 100;
  const z = req.dimensionsMm?.z || 100;
  const volumeCm3 = (x * y * z) / 1000;

  // Approximate weight in grams with infill
  const infillFactor = ((req.infillPercent || 20) / 100) * 0.4 + 0.2;
  const estimatedGrams = Math.max(volumeCm3 * 1.25 * infillFactor, 15);

  // Material cost per gram (INR)
  const materialRates: Record<string, number> = {
    pla_plus: 6,
    petg: 8,
    resin: 14,
    carbon_fiber: 18,
    tpu: 12
  };
  const rate = materialRates[req.material || 'pla_plus'] || 6;

  // Finishing costs
  const finishCosts: Record<string, number> = {
    raw_satin: 0,
    vapor_smooth: 350,
    hand_buffed: 600,
    painted: 950
  };
  const finish = finishCosts[req.finishing || 'raw_satin'] || 0;

  const basePricePerUnit = Math.round((estimatedGrams * rate) + finish + 200); // 200 base machine setup
  const quantity = req.quantity || 1;

  return basePricePerUnit * quantity;
}

export async function submitCustom3DRequest(data: Custom3DQuoteRequest) {
  return await apiClient('/custom-3d/request', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
