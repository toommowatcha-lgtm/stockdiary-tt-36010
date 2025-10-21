-- Add column for custom metrics metadata in business_overviews
ALTER TABLE public.business_overviews
ADD COLUMN IF NOT EXISTS custom_metrics JSONB DEFAULT '[]'::jsonb;

-- Add column for custom metrics data in financials
ALTER TABLE public.financials
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Add comment to clarify usage
COMMENT ON COLUMN public.business_overviews.custom_metrics IS 'Stores custom metric definitions as array of {key, label, color}';
COMMENT ON COLUMN public.financials.custom_data IS 'Stores custom metric values per period as JSON object';