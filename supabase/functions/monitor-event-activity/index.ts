import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActiveEventConfig {
  id: string;
  event_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  event_image_url: string | null;
  font_family: string;
  event_status?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticación (JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header', status: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario tiene rol admin o control
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', status: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar rol usando la función de base de datos
    const { data: canAccess, error: roleError } = await supabase
      .rpc('can_access_dashboard', { check_user_id: user.id });

    if (roleError || !canAccess) {
      console.log('❌ Access denied for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Access denied. Only admin and control roles can access this endpoint.',
          status: 'forbidden' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Monitoring event activity for user:', user.email);

    // Get active event
    const { data: activeEventData, error: eventError } = await supabase
      .rpc('get_active_event_config');
    
    const activeEvent = (activeEventData as ActiveEventConfig[] | null)?.[0] as ActiveEventConfig | undefined;

    if (eventError || !activeEvent) {
      console.log('⚠️ No active event found');
      return new Response(
        JSON.stringify({ status: 'no_active_event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Active event:', activeEvent.event_name);

    // Get recent scans (last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: recentScans, error: scansError } = await supabase
      .from('control_usage')
      .select('id, used_at, attendee!inner(event_id)')
      .eq('attendee.event_id', activeEvent.id)
      .gte('used_at', fifteenMinutesAgo);

    if (scansError) {
      console.error('❌ Error fetching scans:', scansError);
      throw scansError;
    }

    const scanCount = recentScans?.length || 0;
    console.log(`📊 Scans in last 15 minutes: ${scanCount}`);

    // Check for alert conditions
    const alerts = [];

    // Alert 1: No scans in 15 minutes during active event
    if (activeEvent.event_status === 'active' && scanCount === 0) {
      alerts.push({
        level: 'critical',
        message: 'NO HAY ESCANEOS EN LOS ÚLTIMOS 15 MINUTOS',
        recommendation: 'Verificar que el scanner esté funcionando correctamente'
      });
    }

    // Alert 2: Very low scan rate
    const scansPerMinute = scanCount / 15;
    if (activeEvent.event_status === 'active' && scanCount > 0 && scansPerMinute < 0.5) {
      alerts.push({
        level: 'warning',
        message: `Tasa de escaneo baja: ${scansPerMinute.toFixed(2)} escaneos/minuto`,
        recommendation: 'Verificar que el flujo de entrada esté funcionando normalmente'
      });
    }

    // Get total statistics
    const { count: totalScans } = await supabase
      .from('control_usage')
      .select('id', { count: 'exact', head: true })
      .eq('attendee.event_id', activeEvent.id);

    const response = {
      status: alerts.length > 0 ? 'alerts_detected' : 'healthy',
      event: {
        id: activeEvent.id,
        name: activeEvent.event_name,
        status: activeEvent.event_status
      },
      metrics: {
        totalScans: totalScans || 0,
        recentScans: scanCount,
        scansPerMinute: scansPerMinute.toFixed(2),
        timeWindow: '15 minutes'
      },
      alerts,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Response:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in monitor-event-activity:', errorMessage);
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        status: 'error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
