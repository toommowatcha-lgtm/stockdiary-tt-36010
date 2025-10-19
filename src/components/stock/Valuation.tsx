import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Stock } from "@/types/stock";
import { useStocks } from "@/contexts/StockContext";
import { Button } from "@/components/ui/button";
import { Save, Download, RotateCcw } from "lucide-react";

interface ValuationProps {
  stock: Stock;
}

export const Valuation: React.FC<ValuationProps> = ({ stock }) => {
  const { updateStock } = useStocks();
  const [editing, setEditing] = useState(false);

  const defaultValuation = {
    currentPrice: stock.currentPrice || 0,
    investmentHorizon: 5,
    currentSales: 0,
    salesGrowthCAGR: 15,
    netProfitMargin: 20,
    sharesOutstanding: 1000000,
    expectedPEAtYearEnd: 25,
    shareRepurchaseDividendIssue: 2,
    expectedReturn: 15,
    marginOfSafetyPercent: 25,
    tam: stock.tam?.tam || 0,
    sam: stock.tam?.sam || 0,
  };

  const [valuation, setValuation] = useState({
    ...defaultValuation,
    ...stock.valuation,
  });

  // Auto-calculated fields
  const calculations = useMemo(() => {
    // 1. Normalized Net Profit Margin
    const normalizedNetProfitMargin = valuation.currentSales * (valuation.netProfitMargin / 100);
    
    // 2. Normalized EPS
    const normalizedEPS = valuation.sharesOutstanding > 0 
      ? normalizedNetProfitMargin / valuation.sharesOutstanding 
      : 0;
    
    // 3. Normalized Current P/E
    const normalizedCurrentPE = normalizedEPS > 0 
      ? valuation.currentPrice / normalizedEPS 
      : 0;
    
    // 4. %P/E Expansion
    const peExpansionPercent = (normalizedCurrentPE > 0 && valuation.investmentHorizon > 0)
      ? (Math.pow(valuation.expectedPEAtYearEnd / normalizedCurrentPE, 1 / valuation.investmentHorizon) - 1) * 100
      : 0;
    
    // 5. Sales @Year End
    const salesAtYearEnd = valuation.currentSales * Math.pow(1 + valuation.salesGrowthCAGR / 100, valuation.investmentHorizon);
    
    // 6. %Penetration Rate
    const penetrationRate = valuation.sam > 0 
      ? (valuation.tam / valuation.sam) * 100 
      : 0;
    
    // 7. %Market Share
    const marketShare = valuation.sam > 0 
      ? (salesAtYearEnd / valuation.sam) * 100 
      : 0;
    
    // 8. Net Profit @Year End
    const netProfitAtYearEnd = salesAtYearEnd * (valuation.netProfitMargin / 100);
    
    // 9. EPS @Year End
    const adjustedShares = valuation.sharesOutstanding * Math.pow(
      1 - valuation.shareRepurchaseDividendIssue / 100, 
      valuation.investmentHorizon
    );
    const epsAtYearEnd = adjustedShares > 0 
      ? (salesAtYearEnd * (valuation.netProfitMargin / 100)) / adjustedShares 
      : 0;
    
    // 10. %EPS Expansion
    const epsExpansionPercent = (normalizedEPS > 0 && valuation.investmentHorizon > 0)
      ? (Math.pow(epsAtYearEnd / normalizedEPS, 1 / valuation.investmentHorizon) - 1) * 100
      : 0;
    
    // 11. Total Return
    const totalReturn = valuation.salesGrowthCAGR + peExpansionPercent + 
      (peExpansionPercent * epsExpansionPercent / 100) + 
      valuation.shareRepurchaseDividendIssue;
    
    // 12. Dif.
    const dif = totalReturn - valuation.expectedReturn;
    
    // 13. Fair Price
    const fairPrice = valuation.investmentHorizon > 0
      ? (epsAtYearEnd * valuation.expectedPEAtYearEnd) / 
        Math.pow(1 + valuation.expectedReturn / 100, valuation.investmentHorizon)
      : 0;
    
    // 14. Fair Price (Include MOS)
    const fairPriceWithMOS = fairPrice * (1 - valuation.marginOfSafetyPercent / 100);
    
    return {
      normalizedNetProfitMargin,
      normalizedEPS,
      normalizedCurrentPE,
      peExpansionPercent,
      salesAtYearEnd,
      penetrationRate,
      marketShare,
      netProfitAtYearEnd,
      epsAtYearEnd,
      epsExpansionPercent,
      totalReturn,
      dif,
      fairPrice,
      fairPriceWithMOS,
    };
  }, [valuation]);

  const handleSave = () => {
    updateStock(stock.id, { valuation });
    setEditing(false);
  };

  const handleReset = () => {
    setValuation({ ...defaultValuation, ...stock.valuation });
  };

  const exportToCSV = () => {
    const data = [
      ['Valuation Analysis', stock.symbol],
      [''],
      ['EDITABLE INPUTS', ''],
      ['Current Price', valuation.currentPrice],
      ['Investment Horizon (Years)', valuation.investmentHorizon],
      ['Current Sales (MB)', valuation.currentSales],
      ['%Sales Growth (CAGR)', valuation.salesGrowthCAGR],
      ['%Net Profit Margin', valuation.netProfitMargin],
      ['No. of Shares (Include Warrant)', valuation.sharesOutstanding],
      ['P/E @Year End', valuation.expectedPEAtYearEnd],
      ['Share Repurchase / Dividend Paid / Share Issue', valuation.shareRepurchaseDividendIssue],
      ['Expected Return', valuation.expectedReturn],
      ['Margin of Safety', valuation.marginOfSafetyPercent],
      ['TAM', valuation.tam],
      ['SAM', valuation.sam],
      [''],
      ['AUTO-CALCULATED OUTPUTS', ''],
      ['Normalized Net Profit Margin', calculations.normalizedNetProfitMargin.toFixed(2)],
      ['Normalized EPS', calculations.normalizedEPS.toFixed(2)],
      ['Normalized Current P/E', calculations.normalizedCurrentPE.toFixed(2)],
      ['%P/E Expansion', calculations.peExpansionPercent.toFixed(2)],
      ['Sales @Year End', calculations.salesAtYearEnd.toFixed(2)],
      ['%Penetration Rate', calculations.penetrationRate.toFixed(2)],
      ['%Market Share', calculations.marketShare.toFixed(2)],
      ['Net Profit @Year End', calculations.netProfitAtYearEnd.toFixed(2)],
      ['EPS @Year End', calculations.epsAtYearEnd.toFixed(2)],
      ['%EPS Expansion', calculations.epsExpansionPercent.toFixed(2)],
      ['Total Return', calculations.totalReturn.toFixed(2)],
      ['Dif.', calculations.dif.toFixed(2)],
      ['Fair Price', calculations.fairPrice.toFixed(2)],
      ['Fair Price (Include MOS)', calculations.fairPriceWithMOS.toFixed(2)],
    ];
    
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stock.symbol}_valuation.csv`;
    a.click();
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        {editing ? (
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        ) : (
          <Button onClick={() => setEditing(true)} variant="outline">
            Edit
          </Button>
        )}
      </div>

      {/* Core Valuation Section */}
      <Card className="bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-xl">Core Valuation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* KPI Display */}
            <div className="lg:col-span-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Fair Price</div>
                  <div className="text-2xl font-bold">${formatNumber(calculations.fairPrice)}</div>
                </CardContent>
              </Card>
              <Card className="bg-success/5 border-success/20">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Fair Price (Include MOS)</div>
                  <div className="text-2xl font-bold text-success">${formatNumber(calculations.fairPriceWithMOS)}</div>
                </CardContent>
              </Card>
              <Card className="bg-chart-1/5 border-chart-1/20">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Normalized EPS</div>
                  <div className="text-2xl font-bold">${formatNumber(calculations.normalizedEPS)}</div>
                </CardContent>
              </Card>
              <Card className="bg-chart-2/5 border-chart-2/20">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Normalized Current P/E</div>
                  <div className="text-2xl font-bold">{formatNumber(calculations.normalizedCurrentPE)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Calculated Fields (read-only) */}
            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">Normalized Net Profit Margin</Label>
              <div className="text-lg font-semibold">${formatNumber(calculations.normalizedNetProfitMargin)}M</div>
              <div className="text-xs text-muted-foreground">= Current Sales × Net Profit Margin %</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">Normalized EPS</Label>
              <div className="text-lg font-semibold">${formatNumber(calculations.normalizedEPS)}</div>
              <div className="text-xs text-muted-foreground">= Normalized Net Profit / Shares</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">Normalized Current P/E</Label>
              <div className="text-lg font-semibold">{formatNumber(calculations.normalizedCurrentPE)}</div>
              <div className="text-xs text-muted-foreground">= Current Price / Normalized EPS</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Input Fields */}
      <Card className="bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-xl">Editable Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Current Price ($)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.currentPrice}
                onChange={(e) => setValuation({ ...valuation, currentPrice: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Investment Horizon (Years)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.investmentHorizon}
                onChange={(e) => setValuation({ ...valuation, investmentHorizon: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Current Sales (MB)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.currentSales}
                onChange={(e) => setValuation({ ...valuation, currentSales: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>%Sales Growth (CAGR)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.salesGrowthCAGR}
                onChange={(e) => setValuation({ ...valuation, salesGrowthCAGR: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>%Net Profit Margin</Label>
              <Input
                type="number"
                step="any"
                value={valuation.netProfitMargin}
                onChange={(e) => setValuation({ ...valuation, netProfitMargin: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>No. of Shares (Include Warrant)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.sharesOutstanding}
                onChange={(e) => setValuation({ ...valuation, sharesOutstanding: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>P/E @Year End</Label>
              <Input
                type="number"
                step="any"
                value={valuation.expectedPEAtYearEnd}
                onChange={(e) => setValuation({ ...valuation, expectedPEAtYearEnd: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Share Repurchase / Dividend / Issue (%)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.shareRepurchaseDividendIssue}
                onChange={(e) => setValuation({ ...valuation, shareRepurchaseDividendIssue: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Return (%)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.expectedReturn}
                onChange={(e) => setValuation({ ...valuation, expectedReturn: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Margin of Safety (%)</Label>
              <Input
                type="number"
                step="any"
                value={valuation.marginOfSafetyPercent}
                onChange={(e) => setValuation({ ...valuation, marginOfSafetyPercent: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>TAM</Label>
              <Input
                type="number"
                step="any"
                value={valuation.tam}
                onChange={(e) => setValuation({ ...valuation, tam: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>SAM</Label>
              <Input
                type="number"
                step="any"
                value={valuation.sam}
                onChange={(e) => setValuation({ ...valuation, sam: parseFloat(e.target.value) || 0 })}
                disabled={!editing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Projection Section */}
      <Card className="bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-xl">Return Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">%P/E Expansion</Label>
              <div className="text-lg font-semibold">{formatNumber(calculations.peExpansionPercent)}%</div>
              <div className="text-xs text-muted-foreground">Annualized P/E growth rate</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">%EPS Expansion</Label>
              <div className="text-lg font-semibold">{formatNumber(calculations.epsExpansionPercent)}%</div>
              <div className="text-xs text-muted-foreground">Annualized EPS growth rate</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">Total Return</Label>
              <div className={`text-lg font-semibold ${calculations.totalReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatNumber(calculations.totalReturn)}%
              </div>
              <div className="text-xs text-muted-foreground">Expected total return</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">Difference</Label>
              <div className={`text-lg font-semibold ${calculations.dif >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatNumber(calculations.dif)}%
              </div>
              <div className="text-xs text-muted-foreground">vs Expected Return</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">EPS @Year End</Label>
              <div className="text-lg font-semibold">${formatNumber(calculations.epsAtYearEnd)}</div>
              <div className="text-xs text-muted-foreground">Projected EPS at horizon</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">Net Profit @Year End</Label>
              <div className="text-lg font-semibold">${formatNumber(calculations.netProfitAtYearEnd)}M</div>
              <div className="text-xs text-muted-foreground">Projected net profit</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">Sales @Year End</Label>
              <div className="text-lg font-semibold">${formatNumber(calculations.salesAtYearEnd)}M</div>
              <div className="text-xs text-muted-foreground">Projected sales at horizon</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check Assumptions Section */}
      <Card className="bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-xl">Check Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">TAM</Label>
              <div className="text-lg font-semibold">${formatNumber(valuation.tam, 0)}M</div>
              <div className="text-xs text-muted-foreground">Total Addressable Market</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">SAM</Label>
              <div className="text-lg font-semibold">${formatNumber(valuation.sam, 0)}M</div>
              <div className="text-xs text-muted-foreground">Serviceable Addressable Market</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">%Penetration Rate</Label>
              <div className="text-lg font-semibold">{formatNumber(calculations.penetrationRate)}%</div>
              <div className="text-xs text-muted-foreground">TAM / SAM</div>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <Label className="text-xs text-muted-foreground">%Market Share</Label>
              <div className="text-lg font-semibold">{formatNumber(calculations.marketShare)}%</div>
              <div className="text-xs text-muted-foreground">Sales @Year End / SAM</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formula Summary */}
      <Card className="bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle>Formula Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid gap-2">
            <div className="border-b pb-2"><strong>Normalized Net Profit Margin</strong> = Current Sales × (Net Profit Margin / 100)</div>
            <div className="border-b pb-2"><strong>Normalized EPS</strong> = Normalized Net Profit Margin / No. of Shares</div>
            <div className="border-b pb-2"><strong>Normalized Current P/E</strong> = Current Price / Normalized EPS</div>
            <div className="border-b pb-2"><strong>%P/E Expansion</strong> = ((P/E @Year End / Normalized Current P/E) ^ (1 / Investment Horizon)) - 1</div>
            <div className="border-b pb-2"><strong>Sales @Year End</strong> = Current Sales × ((1 + Sales Growth / 100) ^ Investment Horizon)</div>
            <div className="border-b pb-2"><strong>%Penetration Rate</strong> = TAM / SAM</div>
            <div className="border-b pb-2"><strong>%Market Share</strong> = Sales @Year End / SAM</div>
            <div className="border-b pb-2"><strong>Net Profit @Year End</strong> = Sales @Year End × (Net Profit Margin / 100)</div>
            <div className="border-b pb-2"><strong>EPS @Year End</strong> = Net Profit @Year End / (Shares × ((1 - Share Repurchase/Dividend/Issue / 100) ^ Investment Horizon))</div>
            <div className="border-b pb-2"><strong>%EPS Expansion</strong> = ((EPS @Year End / Normalized EPS) ^ (1 / Investment Horizon)) - 1</div>
            <div className="border-b pb-2"><strong>Total Return</strong> = Sales Growth + P/E Expansion + (P/E Expansion × EPS Expansion) + Share Repurchase/Dividend/Issue</div>
            <div className="border-b pb-2"><strong>Dif.</strong> = Total Return - Expected Return</div>
            <div className="border-b pb-2"><strong>Fair Price</strong> = (EPS @Year End × P/E @Year End) / ((1 + Expected Return / 100) ^ Investment Horizon)</div>
            <div><strong>Fair Price (Include MOS)</strong> = Fair Price × (1 - Margin of Safety / 100)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
