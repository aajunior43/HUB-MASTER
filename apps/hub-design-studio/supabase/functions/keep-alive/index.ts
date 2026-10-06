import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Keep-alive function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the first profile to use for the example link
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found, skipping keep-alive');
      return new Response(
        JSON.stringify({ message: 'No profiles found, skipping keep-alive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const profileId = profiles[0].id;
    console.log('Using profile:', profileId);

    // Add example link
    const { data: newLink, error: insertError } = await supabase
      .from('links')
      .insert({
        title: '_keep_alive_link',
        url: 'https://example.com',
        profile_id: profileId,
        position: 9999, // Put it at the end
        is_active: false, // Keep it inactive so it doesn't show
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting link:', insertError);
      throw insertError;
    }

    console.log('Keep-alive link created:', newLink.id);

    // Immediately delete the link
    const { error: deleteError } = await supabase
      .from('links')
      .delete()
      .eq('id', newLink.id);

    if (deleteError) {
      console.error('Error deleting link:', deleteError);
      throw deleteError;
    }

    console.log('Keep-alive link deleted:', newLink.id);

    return new Response(
      JSON.stringify({
        message: 'Keep-alive completed successfully',
        linkId: newLink.id,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Keep-alive function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
