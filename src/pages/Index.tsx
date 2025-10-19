import { AICommandInput } from "@/components/AICommandInput";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">AI Stock Data Manager</h1>
          <p className="text-muted-foreground mt-2">
            Use natural language to manage your stock data - add stocks, update financials, log risks, and more!
          </p>
        </div>

        <AICommandInput />

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stock data will appear here as it's added via commands */}
        </div>
      </div>
    </div>
  );
};

export default Index;
