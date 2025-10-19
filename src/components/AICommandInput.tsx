import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Sparkles } from "lucide-react";

export const AICommandInput = () => {
  const [command, setCommand] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim()) {
      toast({
        title: "Empty Command",
        description: "Please enter a command first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to use AI commands.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-command', {
        body: { command: command.trim() }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success! ✓",
        description: data.message || "Command executed successfully.",
      });

      setCommand("");

    } catch (error: any) {
      console.error('Command processing error:', error);
      
      let errorMessage = "Failed to process command. Please try again.";
      
      if (error.message?.includes("Rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
      } else if (error.message?.includes("Payment required")) {
        errorMessage = "Please add credits to your workspace to continue.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">AI Command Interface</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='Try: "Add stock AAPL with price 170" or "Update MSFT financial: revenue=5000, eps=1.2"'
          disabled={isProcessing}
          className="flex-1"
        />
        
        <Button type="submit" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </form>

      <div className="mt-3 text-xs text-muted-foreground">
        <p className="font-semibold mb-1">Examples:</p>
        <ul className="space-y-1 pl-4 list-disc">
          <li>"Add stock AAPL: name=Apple Inc, price=170, market=NASDAQ"</li>
          <li>"Update AAPL financial: revenue=5000, net_profit=1500, eps=1.2, period=Q1-2024"</li>
          <li>"Add business overview for AAPL: business_model=D2C, moat=Network effect"</li>
          <li>"Add risk for AAPL: type=Regulatory, description=Pending approval"</li>
        </ul>
      </div>
    </Card>
  );
};