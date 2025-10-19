import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStocks } from "@/contexts/StockContext";
import { BusinessOverview } from "@/components/stock/BusinessOverview";
import { Financials } from "@/components/stock/Financials";
import { Valuation } from "@/components/stock/Valuation";
import { Story } from "@/components/stock/Story";
import { RiskAssessment } from "@/components/stock/RiskAssessment";
import { Layout } from "@/components/Layout";
import { useEffect } from "react";

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getStock, refreshStocks } = useStocks();

  useEffect(() => {
    refreshStocks();
  }, [id]);

  const stock = getStock(id || "");

  if (!stock) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Stock not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold">{stock.symbol}</h1>
          <p className="text-muted-foreground mt-1">{stock.companyName}</p>
        </div>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="business">Business Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="story">Story</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <BusinessOverview stock={stock} />
        </TabsContent>

        <TabsContent value="financials">
          <Financials stock={stock} />
        </TabsContent>

        <TabsContent value="valuation">
          <Valuation stock={stock} />
        </TabsContent>

        <TabsContent value="story">
          <Story stock={stock} />
        </TabsContent>

        <TabsContent value="risk">
          <RiskAssessment stock={stock} />
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
