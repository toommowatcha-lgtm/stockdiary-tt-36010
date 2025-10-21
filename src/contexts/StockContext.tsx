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
      const { data: stocksData, error: stocksError } = await (supabase as any)
        .from('stocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (stocksError) {
        console.error('Error fetching stocks:', stocksError);
        toast({
          title: "Error",
          description: "Failed to load stocks from database",
          variant: "destructive",
        });
        return;
      }

      if (!stocksData || stocksData.length === 0) {
        setStocks([]);
        return;
      }

      // Fetch all related data for each stock
      const symbols = stocksData.map((s: any) => s.symbol);

      const [businessData, financialsData, risksData] = await Promise.all([
        (supabase as any).from('business_overviews').select('*').in('stock_symbol', symbols),
        (supabase as any).from('financials').select('*').in('stock_symbol', symbols),
        (supabase as any).from('risks').select('*').in('stock_symbol', symbols),
      ]);

      console.log('Fetched stocks:', stocksData);
      console.log('Fetched business data:', businessData.data);
      console.log('Fetched financials:', financialsData.data);
      console.log('Fetched risks:', risksData.data);

      // Transform Supabase data to Stock type
      const transformedStocks: Stock[] = stocksData.map((row: any) => {
        const businessOverview = businessData.data?.find((b: any) => b.stock_symbol === row.symbol);
        const financials = financialsData.data?.filter((f: any) => f.stock_symbol === row.symbol) || [];
        const risks = risksData.data?.filter((r: any) => r.stock_symbol === row.symbol) || [];

        // Parse custom metrics from business_overviews
        let customMetrics: any[] = [];
        try {
          if (businessOverview?.custom_metrics) {
            customMetrics = typeof businessOverview.custom_metrics === 'string' 
              ? JSON.parse(businessOverview.custom_metrics)
              : businessOverview.custom_metrics;
          }
        } catch (e) {
          console.error('Error parsing custom metrics:', e);
        }

        // Parse TAM data if exists
        let tamData: any = null;
        let valuationData: any = null;
        if (businessOverview?.tam) {
          try {
            tamData = JSON.parse(businessOverview.tam);
            valuationData = tamData.valuation;
            // Keep only TAM fields in tamData
            if (tamData.tam !== undefined) {
              tamData = { tam: tamData.tam, sam: tamData.sam, som: tamData.som };
            }
          } catch (e) {
            console.error('Error parsing TAM data:', e);
          }
        }

        // Parse channel data for story and other fields
        let storyData: any = null;
        let thinkForMarketData: any = null;
        let tippingPointData: string = '';
        if (businessOverview?.channel) {
          try {
            const channelData = JSON.parse(businessOverview.channel);
            storyData = channelData.story;
            thinkForMarketData = channelData.thinkForMarket;
            tippingPointData = channelData.tippingPoint || '';
          } catch (e) {
            console.error('Error parsing channel data:', e);
          }
        }

        // Parse business overview fields
        let revenueBreakdown = [];
        let moat = [];
        try {
          if (businessOverview?.revenue_segment) {
            revenueBreakdown = JSON.parse(businessOverview.revenue_segment);
          }
          if (businessOverview?.moat) {
            moat = JSON.parse(businessOverview.moat);
          }
        } catch (e) {
          console.error('Error parsing business overview fields:', e);
        }

        // Parse risk assessment
        const riskAssessment = {
          keyBusinessRisks: risks.find((r: any) => r.type === 'business')?.description || '',
          financialRisks: risks.find((r: any) => r.type === 'financial')?.description || '',
          managementRisks: risks.find((r: any) => r.type === 'management')?.description || '',
          macroRisks: risks.find((r: any) => r.type === 'macro')?.description || '',
        };

        const stock: Stock = {
          id: row.id,
          symbol: row.symbol,
          companyName: row.name,
          currentPrice: row.price || 0,
          dayChange: 0,
        };

        // Add business overview if exists
        if (businessOverview) {
          // Handle growth_engine field - check if it contains old JSON data
          let growthEngineText = businessOverview.growth_engine || '';
          try {
            // If growth_engine contains JSON with customMetrics (old format), extract text or clear it
            const parsed = JSON.parse(growthEngineText);
            if (parsed && typeof parsed === 'object' && parsed.customMetrics) {
              // Old format detected - clear it since custom metrics are now in separate column
              growthEngineText = '';
              console.log('Cleared old custom metrics data from growth_engine for', row.symbol);
            }
          } catch (e) {
            // Not JSON, it's normal text - keep as is
          }

          stock.businessOverview = {
            whatTheyDo: businessOverview.business_model || '',
            customers: businessOverview.customer_segment || '',
            revenueBreakdown,
            moat,
            growthEngine: growthEngineText,
          };
        }

        // Add TAM data if exists
        if (tamData) {
          stock.tam = tamData;
        }

        // Add thinkForMarket if exists
        if (thinkForMarketData) {
          stock.thinkForMarket = thinkForMarketData;
        }

        // Add tippingPoint if exists
        if (tippingPointData) {
          stock.tippingPoint = tippingPointData;
        }

        // Add financials if exists
        if (financials.length > 0) {
          stock.financials = financials.map((f: any) => {
            const financialData: any = {
              period: f.period,
              revenue: f.revenue || 0,
              grossProfit: f.revenue - (f.cost_of_revenue || 0),
              operatingIncome: 0,
              netIncome: f.net_profit || 0,
              rdExpense: 0,
              smExpense: 0,
              gaExpense: 0,
              freeCashFlow: 0,
              sharesOutstanding: f.eps ? (f.net_profit || 0) / f.eps : 0,
              capex: 0,
            };

            // Add custom metric values from custom_data column
            if (f.custom_data) {
              try {
                const customData = typeof f.custom_data === 'string' 
                  ? JSON.parse(f.custom_data)
                  : f.custom_data;
                Object.assign(financialData, customData);
              } catch (e) {
                console.error('Error parsing custom data:', e);
              }
            }

            return financialData;
          });
        }

        // Add custom metrics if exists
        if (customMetrics.length > 0) {
          stock.customMetrics = customMetrics;
        }

        // Add valuation if exists
        if (valuationData) {
          stock.valuation = valuationData;
        }

        // Add story if exists
        if (storyData) {
          stock.story = storyData;
        }

        // Add risk assessment if has any data
        if (Object.values(riskAssessment).some(v => v)) {
          stock.riskAssessment = riskAssessment;
        }

        return stock;
      });

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
      const { data, error } = await (supabase as any)
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
        
        // Handle duplicate stock symbol error specifically
        if (error.code === '23505') {
          toast({
            title: "Stock Already Exists",
            description: `${stock.symbol} is already in your watchlist`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to add stock to database",
            variant: "destructive",
          });
        }
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

      const { error } = await (supabase as any)
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
      if (updatedData.businessOverview || updatedData.tam || updatedData.thinkForMarket || updatedData.tippingPoint) {
        await updateBusinessOverview(stock.symbol, {
          businessOverview: updatedData.businessOverview,
          tam: updatedData.tam,
          thinkForMarket: updatedData.thinkForMarket,
          tippingPoint: updatedData.tippingPoint,
        });
      }

      // Update financials if provided
      if (updatedData.financials) {
        await updateFinancials(stock.symbol, updatedData.financials, updatedData.customMetrics);
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
      // Check if a record exists
      const { data: existing } = await (supabase as any)
        .from('business_overviews')
        .select('id')
        .eq('stock_symbol', symbol)
        .eq('user_id', session.user.id)
        .maybeSingle();

      const payload: any = {
        stock_symbol: symbol,
        user_id: session.user.id,
      };

      // Add business overview fields if provided
      if (data.businessOverview) {
        payload.business_model = data.businessOverview.whatTheyDo || '';
        payload.customer_segment = data.businessOverview.customers || '';
        payload.revenue_segment = JSON.stringify(data.businessOverview.revenueBreakdown || []);
        payload.moat = JSON.stringify(data.businessOverview.moat || []);
        payload.growth_engine = data.businessOverview.growthEngine || '';
      }

      // Add TAM fields if provided
      if (data.tam) {
        payload.tam = JSON.stringify(data.tam);
      }

      // Add thinkForMarket fields if provided (store in channel for now)
      if (data.thinkForMarket || data.tippingPoint) {
        const existingData = existing ? await (supabase as any)
          .from('business_overviews')
          .select('channel')
          .eq('id', existing.id)
          .single() : { data: null };
        
        const channelData = existingData?.data?.channel ? JSON.parse(existingData.data.channel) : {};
        if (data.thinkForMarket) channelData.thinkForMarket = data.thinkForMarket;
        if (data.tippingPoint) channelData.tippingPoint = data.tippingPoint;
        payload.channel = JSON.stringify(channelData);
      }

      if (existing) {
        // Update existing record
        const { error } = await (supabase as any)
          .from('business_overviews')
          .update(payload)
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating business overview:', error);
        } else {
          console.log('Updated business overview for', symbol);
        }
      } else {
        // Insert new record
        const { error } = await (supabase as any)
          .from('business_overviews')
          .insert([payload]);

        if (error) {
          console.error('Error inserting business overview:', error);
        } else {
          console.log('Inserted business overview for', symbol);
        }
      }
    } catch (error) {
      console.error('Exception updating business overview:', error);
    }
  };

  const updateFinancials = async (symbol: string, financials: any[], customMetrics?: any[]) => {
    if (!session?.user) return;

    try {
      const { error: deleteError } = await (supabase as any)
        .from('financials')
        .delete()
        .eq('stock_symbol', symbol)
        .eq('user_id', session.user.id);

      if (deleteError) console.error('Error deleting old financials:', deleteError);

      // Get list of custom metric keys
      const customMetricKeys = customMetrics?.map(m => m.key) || [];

      const financialRows = financials.map(f => {
        const row: any = {
          stock_symbol: symbol,
          period: f.period,
          revenue: f.revenue || 0,
          cost_of_revenue: f.grossProfit ? f.revenue - f.grossProfit : (f.cost_of_revenue || 0),
          net_profit: f.netIncome || 0,
          eps: f.sharesOutstanding ? (f.netIncome || 0) / f.sharesOutstanding : 0,
          user_id: session.user.id,
        };

        // Extract custom metric values from financial data
        const customData: any = {};
        customMetricKeys.forEach(key => {
          if (f[key] !== undefined) {
            customData[key] = f[key];
          }
        });

        // Store custom metric values in custom_data column
        if (Object.keys(customData).length > 0) {
          row.custom_data = customData;
        }

        return row;
      });

      if (financialRows.length > 0) {
        const { error } = await (supabase as any)
          .from('financials')
          .insert(financialRows);

        if (error) {
          console.error('Error updating financials:', error);
        } else {
          console.log('Updated financials for', symbol);
        }
      }

      // Store custom metrics metadata in business_overviews.custom_metrics column
      if (customMetrics !== undefined) {
        const { data: existing } = await (supabase as any)
          .from('business_overviews')
          .select('id')
          .eq('stock_symbol', symbol)
          .eq('user_id', session.user.id)
          .maybeSingle();

        const payload = {
          stock_symbol: symbol,
          user_id: session.user.id,
          custom_metrics: customMetrics,
        };

        if (existing) {
          await (supabase as any)
            .from('business_overviews')
            .update(payload)
            .eq('id', existing.id);
          console.log('Updated custom metrics for', symbol);
        } else {
          await (supabase as any)
            .from('business_overviews')
            .insert([payload]);
          console.log('Inserted custom metrics for', symbol);
        }
      }
    } catch (error) {
      console.error('Exception updating financials:', error);
    }
  };

  const updateValuation = async (symbol: string, valuation: any) => {
    if (!session?.user) return;

    try {
      const { data: existing } = await (supabase as any)
        .from('business_overviews')
        .select('id, tam')
        .eq('stock_symbol', symbol)
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Parse existing tam field to preserve TAM data if it exists
      let tamData: any = {};
      if (existing?.tam) {
        try {
          tamData = JSON.parse(existing.tam);
        } catch (e) {
          console.error('Error parsing existing TAM data:', e);
        }
      }

      // Merge valuation data into tam field
      tamData.valuation = valuation;

      const payload = {
        stock_symbol: symbol,
        user_id: session.user.id,
        tam: JSON.stringify(tamData),
      };

      if (existing) {
        const { error } = await (supabase as any)
          .from('business_overviews')
          .update(payload)
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating valuation:', error);
        } else {
          console.log('Updated valuation for', symbol);
        }
      } else {
        const { error } = await (supabase as any)
          .from('business_overviews')
          .insert([payload]);

        if (error) {
          console.error('Error inserting valuation:', error);
        } else {
          console.log('Inserted valuation for', symbol);
        }
      }
    } catch (error) {
      console.error('Exception updating valuation:', error);
    }
  };

  const updateStory = async (symbol: string, story: any) => {
    if (!session?.user) return;

    try {
      const { data: existing } = await (supabase as any)
        .from('business_overviews')
        .select('id, channel')
        .eq('stock_symbol', symbol)
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Parse existing channel field to preserve other data if it exists
      let channelData: any = {};
      if (existing?.channel) {
        try {
          channelData = JSON.parse(existing.channel);
        } catch (e) {
          console.error('Error parsing existing channel data:', e);
        }
      }

      // Merge story data into channel field
      channelData.story = story;

      const payload = {
        stock_symbol: symbol,
        user_id: session.user.id,
        channel: JSON.stringify(channelData),
      };

      if (existing) {
        const { error } = await (supabase as any)
          .from('business_overviews')
          .update(payload)
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating story:', error);
        } else {
          console.log('Updated story for', symbol);
        }
      } else {
        const { error } = await (supabase as any)
          .from('business_overviews')
          .insert([payload]);

        if (error) {
          console.error('Error inserting story:', error);
        } else {
          console.log('Inserted story for', symbol);
        }
      }
    } catch (error) {
      console.error('Exception updating story:', error);
    }
  };

  const updateRiskAssessment = async (symbol: string, riskData: any) => {
    if (!session?.user) return;

    try {
      const { error: deleteError } = await (supabase as any)
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

      const { error } = await (supabase as any)
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
      await (supabase as any).from('business_overviews').delete().eq('stock_symbol', stock.symbol);
      await (supabase as any).from('financials').delete().eq('stock_symbol', stock.symbol);
      await (supabase as any).from('risks').delete().eq('stock_symbol', stock.symbol);

      const { error } = await (supabase as any)
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
