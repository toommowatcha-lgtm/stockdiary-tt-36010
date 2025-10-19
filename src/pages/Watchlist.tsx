import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStocks } from "@/contexts/StockContext";
import { Stock } from "@/types/stock";
import { Layout } from "@/components/Layout";

export default function Watchlist() {
  const navigate = useNavigate();
  const { stocks, addStock } = useStocks();
  const [open, setOpen] = useState(false);
  const [newStock, setNewStock] = useState({
    symbol: "",
    companyName: "",
    currentPrice: "",
  });

  const handleAddStock = () => {
    if (!newStock.symbol || !newStock.companyName || !newStock.currentPrice) return;

    const stock: Stock = {
      id: Date.now().toString(),
      symbol: newStock.symbol.toUpperCase(),
      companyName: newStock.companyName,
      currentPrice: parseFloat(newStock.currentPrice),
      dayChange: 0,
    };

    addStock(stock);
    setNewStock({ symbol: "", companyName: "", currentPrice: "" });
    setOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Watchlist</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your favorite stocks
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Add New Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Stock Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., AAPL"
                  value={newStock.symbol}
                  onChange={(e) =>
                    setNewStock({ ...newStock, symbol: e.target.value })
                  }
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="e.g., Apple Inc."
                  value={newStock.companyName}
                  onChange={(e) =>
                    setNewStock({ ...newStock, companyName: e.target.value })
                  }
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Current Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 178.45"
                  value={newStock.currentPrice}
                  onChange={(e) =>
                    setNewStock({ ...newStock, currentPrice: e.target.value })
                  }
                  className="bg-background"
                />
              </div>
              <Button onClick={handleAddStock} className="w-full">
                Add Stock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-card to-card/50 border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold">Symbol</th>
                <th className="text-left p-4 font-semibold">Company Name</th>
                <th className="text-right p-4 font-semibold">Current Price</th>
                <th className="text-right p-4 font-semibold">1D Change</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr
                  key={stock.id}
                  onClick={() => navigate(`/stock/${stock.id}`)}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <div className="font-bold text-primary">{stock.symbol}</div>
                  </td>
                  <td className="p-4">{stock.companyName}</td>
                  <td className="p-4 text-right font-mono">
                    ${stock.currentPrice.toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <div
                      className={`flex items-center justify-end gap-1 ${
                        stock.dayChange >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {stock.dayChange >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-semibold">
                        {stock.dayChange >= 0 ? "+" : ""}
                        {stock.dayChange.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
    </Layout>
  );
}
