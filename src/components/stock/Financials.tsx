import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Stock, FinancialData, CustomMetric } from "@/types/stock";
import { useStocks } from "@/contexts/StockContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Save, TrendingUp, TrendingDown, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sortPeriods } from "@/lib/periodSort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FinancialsProps {
  stock: Stock;
}

export const Financials: React.FC<FinancialsProps> = ({ stock }) => {
  const { updateStock } = useStocks();
  const [viewMode, setViewMode] = useState<"quarterly" | "annual">("quarterly");
  const [editing, setEditing] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["revenue", "netIncome"]);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [newMetricLabel, setNewMetricLabel] = useState("");

  const defaultFinancials: FinancialData[] = [
    { period: "Q1 2024", revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0, rdExpense: 0, smExpense: 0, gaExpense: 0, freeCashFlow: 0, sharesOutstanding: 0, capex: 0 },
  ];

  const [financials, setFinancials] = useState<FinancialData[]>(stock.financials || defaultFinancials);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>(
    stock.customMetrics || []
  );

  const allFinancialKeys = useMemo(() => [
    "revenue",
    "grossProfit",
    "operatingIncome",
    "netIncome",
    "rdExpense",
    "smExpense",
    "gaExpense",
    "freeCashFlow",
    "capex",
    "sharesOutstanding",
    ...customMetrics.map(m => m.key),
  ], [customMetrics]);

  // Auto-calculate annual data from quarterly
  const calculateAnnualData = useMemo((): FinancialData[] => {
    const quarterlyData = financials.filter(f => f.period.startsWith("Q"));
    const yearMap: { [year: string]: FinancialData[] } = {};
    
    quarterlyData.forEach(q => {
      const year = q.period.split(" ")[1];
      if (!yearMap[year]) yearMap[year] = [];
      yearMap[year].push(q);
    });

    const annualData = Object.entries(yearMap)
      .filter(([_, quarters]) => quarters.length === 4)
      .map(([year, quarters]) => {
        const annual: FinancialData = { period: `FY ${year}`, revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0, rdExpense: 0, smExpense: 0, gaExpense: 0, freeCashFlow: 0, sharesOutstanding: 0, capex: 0 };
        
        allFinancialKeys.forEach(key => {
          if (key === "sharesOutstanding") {
            annual[key] = quarters[quarters.length - 1][key] as number || 0;
          } else {
            annual[key] = quarters.reduce((sum, q) => sum + ((q[key] as number) || 0), 0);
          }
        });
        
        return annual;
      });
    
    return sortPeriods(annualData);
  }, [financials, allFinancialKeys]);

  const displayData = useMemo(() => viewMode === "quarterly" 
    ? sortPeriods(financials.filter(f => f.period.startsWith("Q")))
    : calculateAnnualData, [viewMode, financials, calculateAnnualData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (displayData.length < 2) return null;
    
    const latest = displayData[displayData.length - 1];
    const previous = displayData[displayData.length - 2];
    
    const revenueGrowth = previous.revenue ? 
      (((latest.revenue - previous.revenue) / previous.revenue) * 100) : 0;
    
    const netProfitMargin = latest.revenue ? 
      ((latest.netIncome / latest.revenue) * 100) : 0;
    
    const fcfMargin = latest.revenue ? 
      ((latest.freeCashFlow / latest.revenue) * 100) : 0;
    
    return { revenueGrowth, netProfitMargin, fcfMargin };
  }, [displayData]);

  const handleSave = () => {
    updateStock(stock.id, { financials, customMetrics });
    setEditing(false);
  };

  const addPeriod = () => {
    const quarters = financials.filter(f => f.period.startsWith("Q"));
    const latestQuarter = quarters.length > 0 ? quarters[quarters.length - 1].period : "Q4 2023";
    const [q, year] = latestQuarter.split(" ");
    const quarterNum = parseInt(q.substring(1));
    
    let newQuarter: string;
    let newYear: string;
    
    if (quarterNum === 4) {
      newQuarter = "Q1";
      newYear = String(parseInt(year) + 1);
    } else {
      newQuarter = `Q${quarterNum + 1}`;
      newYear = year;
    }
    
    const newPeriod: FinancialData = {
      period: `${newQuarter} ${newYear}`,
      revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0,
      rdExpense: 0, smExpense: 0, gaExpense: 0, freeCashFlow: 0,
      sharesOutstanding: 0, capex: 0,
    };
    
    customMetrics.forEach(m => {
      newPeriod[m.key] = 0;
    });
    
    setFinancials([...financials, newPeriod]);
  };

  const addCustomMetric = () => {
    if (!newMetricLabel.trim()) return;
    
    const key = newMetricLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
    const colors = ["hsl(var(--chart-5))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];
    const color = colors[customMetrics.length % colors.length];
    
    const newMetric: CustomMetric = { key, label: newMetricLabel, color };
    setCustomMetrics([...customMetrics, newMetric]);
    
    const updatedFinancials = financials.map(fin => ({ ...fin, [key]: 0 }));
    setFinancials(updatedFinancials);
    
    setNewMetricLabel("");
    setShowAddMetric(false);
  };

  const removeCustomMetric = (key: string) => {
    setCustomMetrics(customMetrics.filter(m => m.key !== key));
    setSelectedMetrics(selectedMetrics.filter(m => m !== key));
    
    // Remove from financials data
    const updatedFinancials = financials.map(fin => {
      const { [key]: removed, ...rest } = fin;
      return rest as FinancialData;
    });
    setFinancials(updatedFinancials);
  };

  const updateFinancial = (index: number, field: string, value: string) => {
    const updated = [...financials];
    if (field === "period") {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      const numValue = parseFloat(value);
      updated[index] = { ...updated[index], [field]: isNaN(numValue) ? 0 : numValue };
    }
    setFinancials(updated);
  };

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const defaultMetrics = [
    { key: "revenue", label: "Revenue", color: "hsl(var(--chart-1))" },
    { key: "grossProfit", label: "Gross Profit", color: "hsl(var(--chart-2))" },
    { key: "netIncome", label: "Net Income", color: "hsl(var(--chart-3))" },
    { key: "freeCashFlow", label: "Free Cash Flow", color: "hsl(var(--chart-4))" },
  ];

  const allMetrics = [...defaultMetrics, ...customMetrics];

  const exportToCSV = () => {
    const headers = ["Period", ...allFinancialKeys];
    const rows = displayData.map(d => [
      d.period,
      ...allFinancialKeys.map(key => d[key] || 0)
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stock.symbol}_financials_${viewMode}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "quarterly" | "annual")}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {editing && (
            <Button onClick={addPeriod} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Period
            </Button>
          )}
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
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground mb-1">Revenue Growth (YoY)</div>
            <div className={`text-2xl font-bold ${kpis.revenueGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
              {kpis.revenueGrowth >= 0 ? '+' : ''}{kpis.revenueGrowth.toFixed(1)}%
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground mb-1">Net Profit Margin</div>
            <div className="text-2xl font-bold text-foreground">
              {kpis.netProfitMargin.toFixed(1)}%
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground mb-1">Free Cash Flow Margin</div>
            <div className="text-2xl font-bold text-foreground">
              {kpis.fcfMargin.toFixed(1)}%
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6 bg-card border-border overflow-x-auto">
        {viewMode === "annual" && (
          <div className="mb-4 p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
            💡 Annual data is automatically calculated from quarterly data when all 4 quarters are available.
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-semibold">Metric</th>
              {displayData.map((fin, idx) => (
                <th key={idx} className="text-right p-3 font-semibold">
                  {editing && viewMode === "quarterly" ? (
                    <Input
                      value={fin.period}
                      onChange={(e) => {
                        const realIdx = financials.findIndex(f => f.period === fin.period);
                        if (realIdx !== -1) updateFinancial(realIdx, "period", e.target.value);
                      }}
                      className="w-24 text-right bg-background"
                    />
                  ) : (
                    fin.period
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allFinancialKeys.map((key) => {
              const customMetric = customMetrics.find(m => m.key === key);
              return (
                <tr key={key} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3 font-medium capitalize flex items-center gap-2">
                    {customMetric ? customMetric.label : key.replace(/([A-Z])/g, " $1").trim()}
                    {customMetric && editing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCustomMetric(key)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                  {displayData.map((fin, idx) => {
                    const value = (fin[key] as number) || 0;
                    const prevValue = idx > 0 ? ((displayData[idx - 1][key] as number) || 0) : 0;
                    const change = calculateChange(value, prevValue);

                    return (
                      <td key={idx} className="p-3 text-right">
                        {editing && viewMode === "quarterly" ? (
                          <Input
                            type="number"
                            step="any"
                            value={value}
                            onChange={(e) => {
                              const realIdx = financials.findIndex(f => f.period === fin.period);
                              if (realIdx !== -1) updateFinancial(realIdx, key, e.target.value);
                            }}
                            className="w-32 text-right bg-background"
                            placeholder="0"
                          />
                        ) : (
                          <div className="space-y-1">
                            <div className={`font-mono ${value < 0 ? "text-destructive" : ""}`}>
                              {value < 0 ? "-" : ""}${Math.abs(value).toLocaleString()}M
                            </div>
                            {idx > 0 && (
                              <div
                                className={`text-xs flex items-center justify-end gap-1 ${
                                  change >= 0 ? "text-success" : "text-destructive"
                                }`}
                              >
                                {change >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {change.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {editing && (
          <div className="mt-4 pt-4 border-t border-border">
            <Dialog open={showAddMetric} onOpenChange={setShowAddMetric}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Custom Metric
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Metric</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="metric-name">Metric Name</Label>
                    <Input
                      id="metric-name"
                      placeholder="e.g., ARPU, DAU, Operating Margin"
                      value={newMetricLabel}
                      onChange={(e) => setNewMetricLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomMetric()}
                    />
                  </div>
                  <Button onClick={addCustomMetric} className="w-full">
                    Add Metric
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-card border-border">
        <div className="mb-6">
          <Label className="text-sm font-semibold mb-3 block">Select Metrics to Compare</Label>
          <div className="flex flex-wrap gap-2">
            {allMetrics.map((metric) => (
              <Button
                key={metric.key}
                variant={selectedMetrics.includes(metric.key) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMetric(metric.key)}
                className="transition-all"
              >
                {metric.label}
              </Button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {selectedMetrics.map((metricKey) => {
              const metric = allMetrics.find((m) => m.key === metricKey);
              return metric ? (
                <Line
                  key={metricKey}
                  type="monotone"
                  dataKey={metricKey}
                  stroke={metric.color}
                  strokeWidth={2}
                  name={metric.label}
                  dot={{ fill: metric.color, r: 4 }}
                />
              ) : null;
            })}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
