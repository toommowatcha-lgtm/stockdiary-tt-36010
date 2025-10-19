/**
 * Utility functions for sorting financial periods chronologically
 */

interface ParsedPeriod {
  quarter: number;
  year: number;
  original: string;
}

/**
 * Parses a period string like "Q1 2022" or "FY 2023" into sortable components
 */
export const parsePeriod = (period: string): ParsedPeriod => {
  const parts = period.trim().split(/\s+/);
  
  if (parts.length !== 2) {
    return { quarter: 0, year: 0, original: period };
  }
  
  const [periodType, yearStr] = parts;
  const year = parseInt(yearStr);
  
  // Handle quarterly periods (Q1, Q2, Q3, Q4)
  if (periodType.startsWith('Q')) {
    const quarter = parseInt(periodType.substring(1));
    return { quarter, year, original: period };
  }
  
  // Handle fiscal year periods (FY)
  if (periodType === 'FY') {
    return { quarter: 0, year, original: period };
  }
  
  return { quarter: 0, year: 0, original: period };
};

/**
 * Sorts an array of period strings chronologically
 * Example: ["Q1 2022", "Q4 2022", "Q2 2023", "Q1 2023"] 
 * => ["Q1 2022", "Q4 2022", "Q1 2023", "Q2 2023"]
 */
export const sortPeriods = <T extends { period?: string; quarter?: string }>(
  items: T[],
  periodKey: 'period' | 'quarter' = 'period'
): T[] => {
  return [...items].sort((a, b) => {
    const periodA = (periodKey === 'period' ? a.period : a.quarter) || '';
    const periodB = (periodKey === 'period' ? b.period : b.quarter) || '';
    
    const parsedA = parsePeriod(periodA);
    const parsedB = parsePeriod(periodB);
    
    // Sort by year first
    if (parsedA.year !== parsedB.year) {
      return parsedA.year - parsedB.year;
    }
    
    // Then by quarter
    return parsedA.quarter - parsedB.quarter;
  });
};
