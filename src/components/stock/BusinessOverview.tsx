import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stock } from "@/types/stock";
import { useStocks } from "@/contexts/StockContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Plus, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const MOAT_POWERS = [
  "Scale Economies",
  "Network Economies",
  "Counter Positioning",
  "Switching Costs",
  "Branding",
  "Cornered Resource",
  "Process Power",
];

interface BusinessOverviewProps {
  stock: Stock;
}

export const BusinessOverview: React.FC<BusinessOverviewProps> = ({ stock }) => {
  const { updateStock } = useStocks();
  const [editing, setEditing] = useState(false);

  const [businessData, setBusinessData] = useState({
    whatTheyDo: stock.businessOverview?.whatTheyDo || "",
    customers: stock.businessOverview?.customers || "",
    revenueBreakdown: stock.businessOverview?.revenueBreakdown || [],
    moat: stock.businessOverview?.moat || MOAT_POWERS.map((name) => ({ name, strength: null, explanation: "" })),
    growthEngine: stock.businessOverview?.growthEngine || "",
  });

  const [tam, setTam] = useState({
    tam: stock.tam?.tam || 0,
    sam: stock.tam?.sam || 0,
    som: stock.tam?.som || 0,
  });

  const [thinkForMarket, setThinkForMarket] = useState({
    tam: stock.thinkForMarket?.tam || "",
    marketShare: stock.thinkForMarket?.marketShare || "",
    unitEconomics: stock.thinkForMarket?.unitEconomics || "",
  });

  const [tippingPoint, setTippingPoint] = useState(stock.tippingPoint || "");

  const handleSave = () => {
    updateStock(stock.id, {
      businessOverview: businessData,
      tam,
      thinkForMarket,
      tippingPoint,
    });
    setEditing(false);
  };

  const addRevenueSegment = () => {
    setBusinessData({
      ...businessData,
      revenueBreakdown: [
        ...businessData.revenueBreakdown,
        { segment: "New Segment", percentage: 0, revenue: 0 },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {editing ? (
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        ) : (
          <Button onClick={() => setEditing(true)} variant="outline">
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 bg-gradient-to-br from-card to-card/50">
          <Label className="text-lg font-semibold">What does this company do?</Label>
          <Textarea
            value={businessData.whatTheyDo}
            onChange={(e) =>
              setBusinessData({ ...businessData, whatTheyDo: e.target.value })
            }
            disabled={!editing}
            className="mt-3 min-h-[120px] bg-background"
            placeholder="Describe the company's business model..."
          />
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-card/50">
          <Label className="text-lg font-semibold">Who are their customers?</Label>
          <Textarea
            value={businessData.customers}
            onChange={(e) =>
              setBusinessData({ ...businessData, customers: e.target.value })
            }
            disabled={!editing}
            className="mt-3 min-h-[120px] bg-background"
            placeholder="Describe their target customers..."
          />
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-lg font-semibold">Revenue Breakdown by Segment</Label>
          {editing && (
            <Button onClick={addRevenueSegment} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Segment
            </Button>
          )}
        </div>

        {businessData.revenueBreakdown.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-3">
              {businessData.revenueBreakdown.map((segment, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={segment.segment}
                    onChange={(e) => {
                      const updated = [...businessData.revenueBreakdown];
                      updated[idx].segment = e.target.value;
                      setBusinessData({ ...businessData, revenueBreakdown: updated });
                    }}
                    disabled={!editing}
                    placeholder="Segment name"
                    className="bg-background"
                  />
                  <Input
                    type="number"
                    value={segment.percentage}
                    onChange={(e) => {
                      const updated = [...businessData.revenueBreakdown];
                      updated[idx].percentage = parseFloat(e.target.value);
                      setBusinessData({ ...businessData, revenueBreakdown: updated });
                    }}
                    disabled={!editing}
                    placeholder="%"
                    className="w-24 bg-background"
                  />
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={businessData.revenueBreakdown}
                  dataKey="percentage"
                  nameKey="segment"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {businessData.revenueBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-lg font-semibold">Moat (7 Powers)</Label>
          {businessData.moat.some(p => p.strength) && (
            <div className="text-sm text-muted-foreground">
              Score: {businessData.moat.filter(p => p.strength === "High").length * 3 + 
                      businessData.moat.filter(p => p.strength === "Normal").length * 2 + 
                      businessData.moat.filter(p => p.strength === "Weak").length} / 21
            </div>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businessData.moat.map((power, idx) => (
            <div key={idx} className="space-y-2 p-4 rounded-lg border bg-card">
              <Label className="text-sm font-medium">{power.name}</Label>
              <ToggleGroup
                type="single"
                value={power.strength || ""}
                onValueChange={(value) => {
                  if (!editing) return;
                  const updated = [...businessData.moat];
                  updated[idx].strength = value as "Weak" | "Normal" | "High" | null;
                  setBusinessData({ ...businessData, moat: updated });
                }}
                className="justify-start gap-1"
              >
                <ToggleGroupItem 
                  value="Weak" 
                  className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
                  disabled={!editing}
                >
                  Weak
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="Normal" 
                  className="data-[state=on]:bg-yellow-500 data-[state=on]:text-yellow-950"
                  disabled={!editing}
                >
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="High" 
                  className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
                  disabled={!editing}
                >
                  High
                </ToggleGroupItem>
              </ToggleGroup>
              <Textarea
                value={power.explanation || ""}
                onChange={(e) => {
                  const updated = [...businessData.moat];
                  updated[idx].explanation = e.target.value;
                  setBusinessData({ ...businessData, moat: updated });
                }}
                disabled={!editing}
                className="mt-2 min-h-[80px] bg-background text-xs"
                placeholder="Why does this stock have this power?..."
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <Label className="text-lg font-semibold">Growth Engine</Label>
        <Textarea
          value={businessData.growthEngine}
          onChange={(e) =>
            setBusinessData({ ...businessData, growthEngine: e.target.value })
          }
          disabled={!editing}
          className="mt-3 min-h-[120px] bg-background"
          placeholder="What drives this company's growth..."
        />
      </Card>

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <Label className="text-lg font-semibold mb-4 block">TAM / SAM / SOM</Label>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Total Addressable Market</Label>
            <Input
              type="number"
              value={tam.tam}
              onChange={(e) => setTam({ ...tam, tam: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="bg-background"
              placeholder="$B"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Serviceable Addressable Market</Label>
            <Input
              type="number"
              value={tam.sam}
              onChange={(e) => setTam({ ...tam, sam: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="bg-background"
              placeholder="$B"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Serviceable Obtainable Market</Label>
            <Input
              type="number"
              value={tam.som}
              onChange={(e) => setTam({ ...tam, som: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="bg-background"
              placeholder="$B"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <Label className="text-lg font-semibold mb-4 block">Think for Market</Label>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Total Addressable Market (TAM)</Label>
            <Textarea
              value={thinkForMarket.tam}
              onChange={(e) => setThinkForMarket({ ...thinkForMarket, tam: e.target.value })}
              disabled={!editing}
              className="min-h-[100px] bg-background"
              placeholder="Describe the total addressable market..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Market Share</Label>
            <Textarea
              value={thinkForMarket.marketShare}
              onChange={(e) => setThinkForMarket({ ...thinkForMarket, marketShare: e.target.value })}
              disabled={!editing}
              className="min-h-[100px] bg-background"
              placeholder="Analyze market share dynamics..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Unit Economics</Label>
            <Textarea
              value={thinkForMarket.unitEconomics}
              onChange={(e) => setThinkForMarket({ ...thinkForMarket, unitEconomics: e.target.value })}
              disabled={!editing}
              className="min-h-[100px] bg-background"
              placeholder="Describe unit economics..."
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <Label className="text-lg font-semibold">Tipping Point Bar</Label>
        <Textarea
          value={tippingPoint}
          onChange={(e) => setTippingPoint(e.target.value)}
          disabled={!editing}
          className="mt-3 min-h-[120px] bg-background"
          placeholder="Describe key inflection points or triggers for growth..."
        />
      </Card>
    </div>
  );
};
