-- Create stocks table for basic stock information
CREATE TABLE IF NOT EXISTS public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC,
  market TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create financials table
CREATE TABLE IF NOT EXISTS public.financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
  revenue NUMERIC,
  cost_of_revenue NUMERIC,
  net_profit NUMERIC,
  eps NUMERIC,
  period TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business_overviews table
CREATE TABLE IF NOT EXISTS public.business_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
  business_model TEXT,
  customer_segment TEXT,
  revenue_segment TEXT,
  channel TEXT,
  moat TEXT,
  tam TEXT,
  growth_engine TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create risks table
CREATE TABLE IF NOT EXISTS public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a data management tool)
CREATE POLICY "Allow all operations on stocks" ON public.stocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on financials" ON public.financials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on business_overviews" ON public.business_overviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on risks" ON public.risks FOR ALL USING (true) WITH CHECK (true);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON public.stocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financials_updated_at BEFORE UPDATE ON public.financials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_overviews_updated_at BEFORE UPDATE ON public.business_overviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();