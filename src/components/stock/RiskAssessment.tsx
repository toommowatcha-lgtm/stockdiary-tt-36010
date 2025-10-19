import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { Stock } from "@/types/stock";
import { useStocks } from "@/contexts/StockContext";

interface RiskAssessmentProps {
  stock: Stock;
}

export const RiskAssessment: React.FC<RiskAssessmentProps> = ({ stock }) => {
  const { updateStock } = useStocks();
  const [editing, setEditing] = useState(false);

  const [riskData, setRiskData] = useState({
    keyBusinessRisks: stock.riskAssessment?.keyBusinessRisks || "",
    financialRisks: stock.riskAssessment?.financialRisks || "",
    managementRisks: stock.riskAssessment?.managementRisks || "",
    macroRisks: stock.riskAssessment?.macroRisks || "",
  });

  const handleSave = () => {
    updateStock(stock.id, {
      riskAssessment: riskData,
    });
    setEditing(false);
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

      <div className="grid gap-6">
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Key Business Risks</CardTitle>
            <p className="text-sm text-muted-foreground">
              e.g., regulation, competition, technology disruption
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={riskData.keyBusinessRisks}
              onChange={(e) =>
                setRiskData({ ...riskData, keyBusinessRisks: e.target.value })
              }
              disabled={!editing}
              className="min-h-[150px] bg-background"
              placeholder="Analyze key business risks..."
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Financial Risks</CardTitle>
            <p className="text-sm text-muted-foreground">
              e.g., margin pressure, debt, cash flow
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={riskData.financialRisks}
              onChange={(e) =>
                setRiskData({ ...riskData, financialRisks: e.target.value })
              }
              disabled={!editing}
              className="min-h-[150px] bg-background"
              placeholder="Analyze financial risks..."
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Management / Execution Risks</CardTitle>
            <p className="text-sm text-muted-foreground">
              e.g., leadership changes, execution capability
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={riskData.managementRisks}
              onChange={(e) =>
                setRiskData({ ...riskData, managementRisks: e.target.value })
              }
              disabled={!editing}
              className="min-h-[150px] bg-background"
              placeholder="Analyze management and execution risks..."
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Macro or External Risks</CardTitle>
            <p className="text-sm text-muted-foreground">
              e.g., economy, geopolitics, FX
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={riskData.macroRisks}
              onChange={(e) =>
                setRiskData({ ...riskData, macroRisks: e.target.value })
              }
              disabled={!editing}
              className="min-h-[150px] bg-background"
              placeholder="Analyze macro and external risks..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
