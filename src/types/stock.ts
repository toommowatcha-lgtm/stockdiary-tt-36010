export interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  currentPrice: number;
  dayChange: number;
  businessOverview?: {
    whatTheyDo: string;
    customers: string;
    revenueBreakdown: RevenueSegment[];
    moat: MoatPower[];
    growthEngine: string;
  };
  tam?: {
    tam: number;
    sam: number;
    som: number;
  };
  thinkForMarket?: {
    tam: string;
    marketShare: string;
    unitEconomics: string;
  };
  tippingPoint?: string;
  financials?: FinancialData[];
  customMetrics?: CustomMetric[];
  valuation?: ValuationData;
  story?: StoryData;
  riskAssessment?: RiskAssessment;
}

export interface RevenueSegment {
  segment: string;
  percentage: number;
  revenue: number;
}

export interface MoatPower {
  name: string;
  strength: "Weak" | "Normal" | "High" | null;
  explanation?: string;
}

export interface RiskAssessment {
  keyBusinessRisks: string;
  financialRisks: string;
  managementRisks: string;
  macroRisks: string;
}

export interface FinancialData {
  period: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  rdExpense: number;
  smExpense: number;
  gaExpense: number;
  freeCashFlow: number;
  sharesOutstanding: number;
  capex: number;
  [key: string]: number | string;
}

export interface CustomMetric {
  key: string;
  label: string;
  color: string;
}

export interface ValuationData {
  // Editable inputs
  currentPrice: number;
  investmentHorizon: number;
  currentSales: number;
  salesGrowthCAGR: number;
  netProfitMargin: number;
  sharesOutstanding: number;
  expectedPEAtYearEnd: number;
  shareRepurchaseDividendIssue: number; // Combined field
  expectedReturn: number;
  marginOfSafetyPercent: number;
  tam: number;
  sam: number;
}

export interface QuarterlyNote {
  quarter: string;
  content: string;
}

export interface StoryData {
  quarters: QuarterlyNote[];
  guidanceTone: "Bullish" | "Neutral" | "Bearish";
}
