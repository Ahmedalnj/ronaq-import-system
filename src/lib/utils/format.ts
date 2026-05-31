import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Number and Currency Formatting

export function formatCurrency(amount: number, currency: string = 'LYD'): string {
  return new Intl.NumberFormat('ar-LY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-LY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatArabicNumber(num: number | string): string {
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = String(num);
  
  englishNumbers.forEach((eng, idx) => {
    result = result.replace(new RegExp(eng, 'g'), arabicNumbers[idx]);
  });
  
  return result;
}

export function parseArabicNumber(arabicNum: string): number {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let result = arabicNum;
  
  arabicNumbers.forEach((ar, idx) => {
    result = result.replace(new RegExp(ar, 'g'), englishNumbers[idx]);
  });
  
  return parseFloat(result);
}

// Date Formatting
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Calculations

export function calculateCarCost(
  purchasePriceUSD: number,
  exchangeRate: number,
  shippingAllocation: number,
  customsAllocation: number,
  expenseAllocation: number
): number {
  const purchasePriceLYD = purchasePriceUSD * exchangeRate;
  return purchasePriceLYD + shippingAllocation + customsAllocation + expenseAllocation;
}

export function calculateProfit(
  sellingPrice: number,
  finalCost: number,
  remainingLiabilities: number = 0
): number {
  return sellingPrice - finalCost - remainingLiabilities;
}

export function calculateRemainingLiability(
  totalAmount: number,
  paidAmount: number
): number {
  return Math.max(0, totalAmount - paidAmount);
}

export function calculateNetProfit(
  totalSales: number,
  totalCosts: number,
  remainingLiabilities: number
): number {
  return totalSales - totalCosts - remainingLiabilities;
}

// VIN Validation
export function isValidVIN(vin: string): boolean {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin);
}

// Phone Validation
export function isValidLibyanPhone(phone: string): boolean {
  const libyanPhoneRegex = /^(?:\+218|0)[0-9]{9}$/;
  return libyanPhoneRegex.test(phone.replace(/\s/g, ''));
}
