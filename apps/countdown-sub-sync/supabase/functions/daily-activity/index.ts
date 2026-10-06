import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      daily_activity: {
        Row: {
          id: string
          timestamp: string
          activity_type: string
          description: string
        }
        Insert: {
          id?: string
          timestamp?: string
          activity_type: string
          description: string
        }
        Update: {
          id?: string
          timestamp?: string
          activity_type?: string
          description?: string
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    console.log('Daily activity function triggered at:', new Date().toISOString())

    // Insert daily activity record
    const { data, error } = await supabaseClient
      .from('daily_activity')
      .insert({
        activity_type: 'daily_check',
        description: 'Atividade diária automática para manter o banco de dados ativo'
      })
      .select()

    if (error) {
      console.error('Error inserting daily activity:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to insert daily activity' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Daily activity inserted:', data)

    // Schedule deletion after 30 seconds
    setTimeout(async () => {
      try {
        const { error: deleteError } = await supabaseClient
          .from('daily_activity')
          .delete()
          .eq('id', data[0].id)

        if (deleteError) {
          console.error('Error deleting daily activity:', deleteError)
        } else {
          console.log('Daily activity deleted after 30 seconds:', data[0].id)
        }
      } catch (err) {
        console.error('Error in setTimeout deletion:', err)
      }
    }, 30000) // 30 seconds

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily activity recorded and scheduled for deletion',
        activity_id: data[0].id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in daily activity function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})