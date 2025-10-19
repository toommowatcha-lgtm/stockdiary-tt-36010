import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_COMMAND_LENGTH = 500;
const ALLOWED_OPERATIONS = ['insert', 'update', 'upsert'];
const ALLOWED_TABLES = ['stocks', 'financials', 'business_overviews', 'risks'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    
    // Validate request body
    if (!requestBody.command || typeof requestBody.command !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: command required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const command = requestBody.command.trim();

    // Validate command length
    if (command.length > MAX_COMMAND_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Command too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!lovableApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call AI to parse command
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a data management assistant. Parse user commands to determine database operations.
Available tables: stocks, financials, business_overviews, risks.

Table schemas:
- stocks: symbol (TEXT, UNIQUE), name (TEXT), price (NUMERIC), market (TEXT)
- financials: stock_symbol (TEXT, FK), revenue (NUMERIC), cost_of_revenue (NUMERIC), net_profit (NUMERIC), eps (NUMERIC), period (TEXT)
- business_overviews: stock_symbol (TEXT, FK), business_model (TEXT), customer_segment (TEXT), revenue_segment (TEXT), channel (TEXT), moat (TEXT), tam (TEXT), growth_engine (TEXT)
- risks: stock_symbol (TEXT, FK), type (TEXT), description (TEXT)

Respond with structured data about the operation to perform.`
          },
          {
            role: 'user',
            content: command
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'execute_database_operation',
              description: 'Execute a database operation based on the user command',
              parameters: {
                type: 'object',
                properties: {
                  operation: {
                    type: 'string',
                    enum: ['insert', 'update', 'upsert'],
                    description: 'The database operation to perform'
                  },
                  table: {
                    type: 'string',
                    enum: ['stocks', 'financials', 'business_overviews', 'risks'],
                    description: 'The table to operate on'
                  },
                  data: {
                    type: 'object',
                    description: 'The data to insert or update'
                  },
                  filters: {
                    type: 'object',
                    description: 'Filter conditions for update operations (e.g., {symbol: "AAPL"})'
                  }
                },
                required: ['operation', 'table', 'data']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'execute_database_operation' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();

    if (!aiData.choices?.[0]?.message?.tool_calls?.[0]) {
      throw new Error('No tool call in AI response');
    }

    const toolCall = aiData.choices[0].message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);

    const { operation, table, data, filters } = args;

    // Validate AI output
    if (!ALLOWED_OPERATIONS.includes(operation)) {
      throw new Error('Operation not allowed');
    }

    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error('Table not allowed');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    // Add user_id to all operations
    const dataWithUser = {
      ...data,
      user_id: user.id,
    };

    let result;
    if (operation === 'insert') {
      result = await supabase.from(table).insert(dataWithUser).select();
    } else if (operation === 'update') {
      let query = supabase.from(table).update(dataWithUser);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      // Ensure user can only update their own data
      query = query.eq('user_id', user.id);
      result = await query.select();
    } else if (operation === 'upsert') {
      result = await supabase.from(table).upsert(dataWithUser).select();
    } else {
      throw new Error(`Unsupported operation: ${operation}`);
    }

    if (result.error) {
      throw result.error;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully ${operation}ed ${table} record.`,
      data: result.data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[AI Command] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to process command. Please try again.' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
