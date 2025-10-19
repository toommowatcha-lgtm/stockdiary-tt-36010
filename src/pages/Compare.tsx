import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useStocks } from "@/contexts/StockContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/Layout";
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

export default function Compare() {
  const { stocks } = useStocks();
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [metric, setMetric] = useState<"revenue" | "netIncome" | "freeCashFlow">("revenue");

  const toggleStock = (id: string) => {
    setSelectedStocks((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getChartData = () => {
    const periods: Record<string, any> = {};


    selectedStocks.forEach((stockId) => {
      const stock = stocks.find((s) => s.id === stockId);
      if (stock?.financials) {
        stock.financials.forEach((fin) => {
          if (!periods[fin.period]) {
            periods[fin.period] = { period: fin.period };
          }
          periods[fin.period][stock.symbol] = fin[metric];
        });
      }
    });

    return Object.values(periods);
  };

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  return (
    <Layout>
      <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Compare Stocks</h1>
        <p className="text-muted-foreground mt-2">
          Select stocks to compare their financial performance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 bg-gradient-to-br from-card to-card/50">
          <h2 className="text-lg font-semibold mb-4">Select Stocks</h2>
          <div className="space-y-3">
            {stocks.map((stock) => (
              <div key={stock.id} className="flex items-center gap-3">
                <Checkbox
                  id={stock.id}
                  checked={selectedStocks.includes(stock.id)}
                  onCheckedChange={() => toggleStock(stock.id)}
                />
                <Label htmlFor={stock.id} className="cursor-pointer flex-1">
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-xs text-muted-foreground">{stock.companyName}</div>
                </Label>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Financial Comparison</h2>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-background border border-border"
            >
              <option value="revenue">Revenue</option>
              <option value="netIncome">Net Income</option>
              <option value="freeCashFlow">Free Cash Flow</option>
            </select>
          </div>

          {selectedStocks.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={getChartData()}>
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
                {selectedStocks.map((stockId, idx) => {
                  const stock = stocks.find((s) => s.id === stockId);
                  return stock ? (
                    <Line
                      key={stockId}
                      type="monotone"
                      dataKey={stock.symbol}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: COLORS[idx % COLORS.length], r: 4 }}
                    />
                  ) : null;
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Select stocks to compare
            </div>
          )}
        </Card>
      </div>

      {selectedStocks.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-card to-card/50 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Key Metrics Comparison</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-semibold">Stock</th>
                <th className="text-right p-3 font-semibold">Current Price</th>
                <th className="text-right p-3 font-semibold">1D Change</th>
                <th className="text-right p-3 font-semibold">P/E Ratio</th>
                <th className="text-right p-3 font-semibold">P/S Ratio</th>
              </tr>
            </thead>
            <tbody>
              {selectedStocks.map((stockId) => {
                const stock = stocks.find((s) => s.id === stockId);
                if (!stock) return null;

                return (
                  <tr key={stockId} className="border-b border-border">
                    <td className="p-3">
                      <div className="font-semibold">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground">{stock.companyName}</div>
                    </td>
                    <td className="p-3 text-right font-mono">${stock.currentPrice.toFixed(2)}</td>
                    <td
                      className={`p-3 text-right font-semibold ${
                        stock.dayChange >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {stock.dayChange >= 0 ? "+" : ""}
                      {stock.dayChange.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right">
                      {stock.valuation?.currentSales && stock.valuation?.sharesOutstanding && stock.valuation?.netProfitMargin ? (() => {
                        const normalizedNetProfit = stock.valuation.currentSales * (stock.valuation.netProfitMargin / 100);
                        const normalizedEPS = normalizedNetProfit / stock.valuation.sharesOutstanding;
                        const pe = normalizedEPS > 0 ? stock.currentPrice / normalizedEPS : 0;
                        return pe > 0 ? pe.toFixed(2) : "—";
                      })() : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {stock.valuation?.currentSales && stock.valuation?.sharesOutstanding && stock.valuation.currentSales > 0 
                        ? ((stock.currentPrice * stock.valuation.sharesOutstanding) / stock.valuation.currentSales).toFixed(2) 
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </Card>
      )}
    </div>
    </Layout>
  );
}
