-- Add user_id columns to all tables to track ownership
ALTER TABLE public.stocks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.financials ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.business_overviews ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.risks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on stocks" ON public.stocks;
DROP POLICY IF EXISTS "Allow all operations on financials" ON public.financials;
DROP POLICY IF EXISTS "Allow all operations on business_overviews" ON public.business_overviews;
DROP POLICY IF EXISTS "Allow all operations on risks" ON public.risks;

-- Create proper user-scoped policies for stocks table
CREATE POLICY "Users can view their own stocks"
  ON public.stocks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stocks"
  ON public.stocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stocks"
  ON public.stocks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stocks"
  ON public.stocks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create proper user-scoped policies for financials table
CREATE POLICY "Users can view their own financials"
  ON public.financials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financials"
  ON public.financials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financials"
  ON public.financials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financials"
  ON public.financials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create proper user-scoped policies for business_overviews table
CREATE POLICY "Users can view their own business overviews"
  ON public.business_overviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business overviews"
  ON public.business_overviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business overviews"
  ON public.business_overviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business overviews"
  ON public.business_overviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create proper user-scoped policies for risks table
CREATE POLICY "Users can view their own risks"
  ON public.risks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risks"
  ON public.risks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risks"
  ON public.risks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risks"
  ON public.risks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);