
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseAccountCodeDetails(code: string): { priceLevel: string; zone: string } {
  if (!code) return { priceLevel: 'N/A', zone: 'N/A' };

  const priceLevel = code; // Price level is the account code itself
  const upperCode = code.toUpperCase();
  const parts = upperCode.split(/[-/]/);
  
  let zone = 'N/A';

  const specificZoneKeywords = ['Z1', 'Z2', 'Z3', 'B1', 'B3', 'AZ'];

  // Check specific overrides first
  if (upperCode.includes('B1-EX')) { zone = 'B1'; }
  else if (upperCode.includes('RETAILER-Z1')) { zone = 'Z1'; }
  else if (upperCode.includes('DISTRIZ2')) { zone = 'Z2'; } // Assuming DISTRIZ2 implies zone Z2
  else if (upperCode.includes('B3-Z3')) { zone = 'Z3'; } 
  else if (upperCode.includes('AZ-Z1')) { zone = 'Z1'; }
  
  // If not found by specific overrides, try general keyword matching
  if (zone === 'N/A') {
    for (const part of parts) {
      if (specificZoneKeywords.includes(part)) {
        zone = part;
        break;
      }
    }
  }
  
  // Fallback: if still N/A, check if first part is a zone keyword or starts with Z/B
  if (zone === 'N/A' && parts.length > 0) {
    if (specificZoneKeywords.includes(parts[0])) {
      zone = parts[0];
    } else if (parts[0].match(/^(Z|B)\d*$/) || parts[0] === 'AZ') { // Z, B, Z1, B2, AZ etc.
      zone = parts[0];
    }
  }

  // If zone is still N/A after all checks, keep it as 'N/A'
  return { priceLevel, zone };
}
