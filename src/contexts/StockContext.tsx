import React, { createContext, useContext, useState, useEffect } from "react";
import { Stock } from "@/types/stock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

interface StockContextType {
  stocks: Stock[];
  addStock: (stock: Stock) => Promise<void>;
  updateStock: (id: string, stock: Partial<Stock>) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  getStock: (id: string) => Stock | undefined;
  refreshStocks: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stocks:', error);
        toast({
          title: "Error",
          description: "Failed to load stocks from database",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched stocks:', data);
      
      // Transform Supabase data to Stock type
      const transformedStocks: Stock[] = (data || []).map((row: any) => ({
        id: row.id,
        symbol: row.symbol,
        companyName: row.name,
        currentPrice: row.price || 0,
        dayChange: 0, // Not stored in DB, could be calculated or fetched separately
      }));

      setStocks(transformedStocks);
    } catch (error) {
      console.error('Exception fetching stocks:', error);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const addStock = async (stock: Stock) => {
    if (!session?.user) {
      toast({
        title: "Error",
        description: "You must be logged in to add stocks",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stocks')
        .insert([
          {
            symbol: stock.symbol,
            name: stock.companyName,
            price: stock.currentPrice,
            market: 'US',
            user_id: session.user.id,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding stock:', error);
        toast({
          title: "Error",
          description: "Failed to add stock to database",
          variant: "destructive",
        });
        return;
      }

      console.log('Added stock:', data);
      toast({
        title: "Success",
        description: "Stock added successfully",
      });

      await fetchStocks();
    } catch (error) {
      console.error('Exception adding stock:', error);
    }
  };

  const updateStock = async (id: string, updatedData: Partial<Stock>) => {
    try {
      const stock = stocks.find(s => s.id === id);
      if (!stock) return;

      const updatePayload: any = {};
      if (updatedData.symbol) updatePayload.symbol = updatedData.symbol;
      if (updatedData.companyName) updatePayload.name = updatedData.companyName;
      if (updatedData.currentPrice !== undefined) updatePayload.price = updatedData.currentPrice;

      const { error } = await supabase
        .from('stocks')
        .update(updatePayload)
        .eq('id', id);

      if (error) {
        console.error('Error updating stock:', error);
        toast({
          title: "Error",
          description: "Failed to update stock",
          variant: "destructive",
        });
        return;
      }

      console.log('Updated stock:', id, updatePayload);

      // Update business overview if provided
      if (updatedData.businessOverview) {
        await updateBusinessOverview(stock.symbol, updatedData.businessOverview);
      }

      // Update financials if provided
      if (updatedData.financials) {
        await updateFinancials(stock.symbol, updatedData.financials);
      }

      // Update valuation if provided
      if (updatedData.valuation) {
        await updateValuation(stock.symbol, updatedData.valuation);
      }

      // Update story if provided
      if (updatedData.story) {
        await updateStory(stock.symbol, updatedData.story);
      }

      // Update risk assessment if provided
      if (updatedData.riskAssessment) {
        await updateRiskAssessment(stock.symbol, updatedData.riskAssessment);
      }

      await fetchStocks();
    } catch (error) {
      console.error('Exception updating stock:', error);
    }
  };

  const updateBusinessOverview = async (symbol: string, data: any) => {
    if (!session?.user) return;

    try {
      const { error: deleteError } = await supabase
        .from('business_overviews')
        .delete()
        .eq('stock_symbol', symbol);

      if (deleteError) console.error('Error deleting old business overview:', deleteError);

      const { error } = await supabase
        .from('business_overviews')
        .insert([
          {
            stock_symbol: symbol,
            business_model: data.whatTheyDo || '',
            customer_segment: data.customers || '',
            revenue_segment: JSON.stringify(data.revenueBreakdown || []),
            moat: JSON.stringify(data.moat || []),
            growth_engine: data.growthEngine || '',
            user_id: session.user.id,
          }
        ]);

      if (error) {
        console.error('Error updating business overview:', error);
      } else {
        console.log('Updated business overview for', symbol);
      }
    } catch (error) {
      console.error('Exception updating business overview:', error);
    }
  };

  const updateFinancials = async (symbol: string, financials: any[]) => {
    if (!session?.user) return;

    try {
      const { error: deleteError } = await supabase
        .from('financials')
        .delete()
        .eq('stock_symbol', symbol);

      if (deleteError) console.error('Error deleting old financials:', deleteError);

      const financialRows = financials.map(f => ({
        stock_symbol: symbol,
        period: f.period,
        revenue: f.revenue,
        cost_of_revenue: f.grossProfit ? f.revenue - f.grossProfit : null,
        net_profit: f.netIncome,
        eps: f.netIncome / (f.sharesOutstanding || 1),
        user_id: session.user.id,
      }));

      const { error } = await supabase
        .from('financials')
        .insert(financialRows);

      if (error) {
        console.error('Error updating financials:', error);
      } else {
        console.log('Updated financials for', symbol);
      }
    } catch (error) {
      console.error('Exception updating financials:', error);
    }
  };

  const updateValuation = async (symbol: string, valuation: any) => {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('business_overviews')
        .upsert([
          {
            stock_symbol: symbol,
            tam: JSON.stringify(valuation),
            user_id: session.user.id,
          }
        ], { onConflict: 'stock_symbol' });

      if (error) {
        console.error('Error updating valuation:', error);
      } else {
        console.log('Updated valuation for', symbol);
      }
    } catch (error) {
      console.error('Exception updating valuation:', error);
    }
  };

  const updateStory = async (symbol: string, story: any) => {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('business_overviews')
        .upsert([
          {
            stock_symbol: symbol,
            channel: JSON.stringify(story),
            user_id: session.user.id,
          }
        ], { onConflict: 'stock_symbol' });

      if (error) {
        console.error('Error updating story:', error);
      } else {
        console.log('Updated story for', symbol);
      }
    } catch (error) {
      console.error('Exception updating story:', error);
    }
  };

  const updateRiskAssessment = async (symbol: string, riskData: any) => {
    if (!session?.user) return;

    try {
      const { error: deleteError } = await supabase
        .from('risks')
        .delete()
        .eq('stock_symbol', symbol);

      if (deleteError) console.error('Error deleting old risks:', deleteError);

      const riskRows = [
        { stock_symbol: symbol, type: 'business', description: riskData.keyBusinessRisks || '', user_id: session.user.id },
        { stock_symbol: symbol, type: 'financial', description: riskData.financialRisks || '', user_id: session.user.id },
        { stock_symbol: symbol, type: 'management', description: riskData.managementRisks || '', user_id: session.user.id },
        { stock_symbol: symbol, type: 'macro', description: riskData.macroRisks || '', user_id: session.user.id },
      ];

      const { error } = await supabase
        .from('risks')
        .insert(riskRows);

      if (error) {
        console.error('Error updating risks:', error);
      } else {
        console.log('Updated risks for', symbol);
      }
    } catch (error) {
      console.error('Exception updating risks:', error);
    }
  };

  const deleteStock = async (id: string) => {
    try {
      const stock = stocks.find(s => s.id === id);
      if (!stock) return;

      // Delete related data first
      await supabase.from('business_overviews').delete().eq('stock_symbol', stock.symbol);
      await supabase.from('financials').delete().eq('stock_symbol', stock.symbol);
      await supabase.from('risks').delete().eq('stock_symbol', stock.symbol);

      const { error } = await supabase
        .from('stocks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting stock:', error);
        toast({
          title: "Error",
          description: "Failed to delete stock",
          variant: "destructive",
        });
        return;
      }

      console.log('Deleted stock:', id);
      toast({
        title: "Success",
        description: "Stock deleted successfully",
      });

      await fetchStocks();
    } catch (error) {
      console.error('Exception deleting stock:', error);
    }
  };

  const getStock = (id: string) => {
    return stocks.find((stock) => stock.id === id);
  };

  const refreshStocks = async () => {
    await fetchStocks();
  };

  return (
    <StockContext.Provider value={{ stocks, addStock, updateStock, deleteStock, getStock, refreshStocks }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStocks = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error("useStocks must be used within StockProvider");
  }
  return context;
};
