import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { ticketId, controlTypeId, device } = await req.json()

    if (!ticketId || !controlTypeId) {
      return new Response(
        JSON.stringify({ error: 'ticketId and controlTypeId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing QR scan:', { ticketId, controlTypeId, device })

    // 1. Validate access using RPC function
    const { data: validation, error: validationError } = await supabase
      .rpc('validate_control_access_public', {
        p_ticket_id: ticketId,
        p_control_type_id: controlTypeId
      })

    if (validationError) {
      console.error('Validation error:', validationError)
      return new Response(
        JSON.stringify({ error: 'Error al validar acceso: ' + validationError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!validation || validation.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Error en validación de ticket' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const validationResult = validation[0]
    console.log('Validation result:', validationResult)

    if (!validationResult.can_access) {
      // Obtener asistente para mostrar detalles aunque no tenga acceso
      const { data: attendeeData, error: attendeeError } = await supabase
        .rpc('find_attendee_by_ticket_public', { ticket_id: ticketId })

      let attendee = attendeeData && attendeeData.length > 0 ? attendeeData[0] : null

      if (attendeeError) {
        console.warn('Attendee not found for denied access:', attendeeError)
      }

      // Buscar último uso para este asistente y tipo de control
      let lastUsage: { used_at?: string; device?: string } | null = null
      if (validationResult.attendee_id) {
        const { data: lastUsageData, error: lastUsageError } = await supabase
          .from('control_usage')
          .select('used_at, device')
          .eq('attendee_id', validationResult.attendee_id)
          .eq('control_type_id', controlTypeId)
          .order('used_at', { ascending: false })
          .limit(1)

        if (!lastUsageError && lastUsageData && lastUsageData.length > 0) {
          lastUsage = lastUsageData[0]
        } else if (lastUsageError) {
          console.warn('Could not fetch last usage for denied access:', lastUsageError)
        }
      }

      return new Response(
        JSON.stringify({ 
          error: validationResult.error_message,
          canAccess: false,
          currentUses: validationResult.current_uses,
          maxUses: validationResult.max_uses,
          attendee: attendee ? {
            id: attendee.id,
            name: attendee.name,
            email: attendee.email,
            ticket_id: attendee.ticket_id,
            category: attendee.category_id || null
          } : null,
          lastUsage
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. Get attendee information
    const { data: attendeeData, error: attendeeError } = await supabase
      .rpc('find_attendee_by_ticket_public', { ticket_id: ticketId })

    if (attendeeError || !attendeeData || attendeeData.length === 0) {
      console.error('Attendee not found:', attendeeError)
      return new Response(
        JSON.stringify({ error: 'Datos del asistente no encontrados' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const attendee = attendeeData[0]

    // 3. Get ticket category info
    const { data: ticketCategory, error: categoryError } = await supabase
      .from('ticket_categories')
      .select('*')
      .eq('id', attendee.category_id)
      .single()

    if (categoryError) {
      console.warn('Could not fetch ticket category:', categoryError)
    }

    // 4. Record usage with admin privileges (bypassing RLS)
    const { error: insertError } = await supabase
      .from('control_usage')
      .insert({
        attendee_id: validationResult.attendee_id,
        control_type_id: controlTypeId,
        device: device || `Scanner Web - ${req.headers.get('user-agent')?.split(' ')[0] || 'Unknown'}`,
        notes: `Scanner público - Edge Function`
      })

    if (insertError) {
      console.error('Error inserting usage:', insertError)
      return new Response(
        JSON.stringify({ error: 'Error al registrar acceso: ' + insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 5. Return success response with attendee info
    return new Response(
      JSON.stringify({
        success: true,
        canAccess: true,
        attendee: {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          ticket_id: attendee.ticket_id,
          category: ticketCategory?.name || 'Unknown'
        },
        usage: {
          currentUses: validationResult.current_uses + 1,
          maxUses: validationResult.max_uses
        },
        message: 'Acceso registrado correctamente'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})