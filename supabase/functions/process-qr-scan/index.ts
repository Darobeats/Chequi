import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Error sanitization - prevent information leakage
function sanitizeError(error: any, context: string): string {
  // Log full error server-side
  console.error(`${context}:`, error);
  
  // Return generic message to client
  if (error?.code === 'PGRST116') return 'No se encontró el ticket';
  if (error?.message?.includes('violates')) return 'Los datos del escaneo son inválidos';
  if (error?.message?.includes('permission')) return 'Permisos insuficientes';
  if (error?.message?.includes('not found')) return 'Ticket no encontrado';
  
  return 'Error al procesar el escaneo';
}

// Input validation
interface ScanRequest {
  ticketId: string;
  controlTypeId: string;
  eventId?: string;
  device?: string;
  timestamp?: number;
  signature?: string;
  userId?: string;
}

function validateUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateScanRequest(body: any): { valid: boolean; error?: string; data?: ScanRequest } {
  // Validate ticketId
  if (!body.ticketId || typeof body.ticketId !== 'string') {
    return { valid: false, error: 'ticketId es requerido y debe ser un string' };
  }
  if (body.ticketId.length < 1 || body.ticketId.length > 100) {
    return { valid: false, error: 'ticketId debe tener entre 1 y 100 caracteres' };
  }

  // Validate controlTypeId
  if (!body.controlTypeId || typeof body.controlTypeId !== 'string') {
    return { valid: false, error: 'controlTypeId es requerido y debe ser un string' };
  }
  if (!validateUUID(body.controlTypeId)) {
    return { valid: false, error: 'controlTypeId debe ser un UUID válido' };
  }

  // Validate optional eventId
  if (body.eventId !== undefined) {
    if (typeof body.eventId !== 'string' || !validateUUID(body.eventId)) {
      return { valid: false, error: 'eventId debe ser un UUID válido' };
    }
  }

  // Validate optional device
  if (body.device !== undefined) {
    if (typeof body.device !== 'string' || body.device.length > 200) {
      return { valid: false, error: 'device debe ser un string de máximo 200 caracteres' };
    }
  }

  // Validate optional timestamp
  if (body.timestamp !== undefined) {
    if (typeof body.timestamp !== 'number') {
      return { valid: false, error: 'timestamp debe ser un número' };
    }
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    if (body.timestamp < (now - dayInMs) || body.timestamp > (now + 60000)) {
      return { valid: false, error: 'timestamp es inválido (muy antiguo o futuro)' };
    }
  }

  // Validate optional signature
  if (body.signature !== undefined) {
    if (typeof body.signature !== 'string' || !/^[0-9a-f]{64}$/i.test(body.signature)) {
      return { valid: false, error: 'signature debe ser un hash hexadecimal de 64 caracteres' };
    }
  }

  // Validate optional userId
  if (body.userId !== undefined) {
    if (typeof body.userId !== 'string' || !validateUUID(body.userId)) {
      return { valid: false, error: 'userId debe ser un UUID válido' };
    }
  }

  return { 
    valid: true, 
    data: {
      ticketId: body.ticketId,
      controlTypeId: body.controlTypeId,
      eventId: body.eventId,
      device: body.device,
      timestamp: body.timestamp,
      signature: body.signature,
      userId: body.userId,
    }
  };
}

// Verify scan signature for offline scans
async function verifyScanSignature(
  ticketId: string,
  controlTypeId: string,
  timestamp: number,
  userId: string,
  signature: string
): Promise<boolean> {
  try {
    const data = `${ticketId}|${controlTypeId}|${timestamp}|${userId}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const keyMaterial = encoder.encode(`chequi_scan_${userId}_${Math.floor(timestamp / 86400000)}`);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBuffer = new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    return await crypto.subtle.verify('HMAC', key, signatureBuffer, dataBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No autorizado - Token requerido' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No autorizado - Token inválido' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing scan for user:', user.id);

    // Parse and validate request body
    const body = await req.json();
    const validation = validateScanRequest(body);
    
    if (!validation.valid) {
      console.error('Validation error:', validation.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: validation.error 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { ticketId, controlTypeId, eventId, device, timestamp, signature, userId } = validation.data!;

    // Verify signature for offline scans
    if (signature && userId && timestamp) {
      const isValidSignature = await verifyScanSignature(
        ticketId,
        controlTypeId,
        timestamp,
        userId,
        signature
      );

      if (!isValidSignature) {
        console.error('Invalid signature for offline scan');
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Firma de escaneo inválida - posible manipulación detectada' 
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      console.log('Offline scan signature verified successfully');
    }

    // Get active event if not specified
    let activeEventId = eventId;
    if (!activeEventId) {
      const { data: eventData, error: eventError } = await supabaseClient
        .rpc('get_active_event_id');

      if (eventError || !eventData) {
        console.error('Error getting active event:', eventError);
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'No hay evento activo configurado' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      activeEventId = eventData;
    }

    console.log('Processing scan for event:', activeEventId);

    // Verify attendee belongs to the event
    const { data: attendeeCheck, error: attendeeCheckError } = await supabaseClient
      .from('attendees')
      .select('id, event_id')
      .eq('event_id', activeEventId)
      .or(`qr_code.eq.${ticketId},ticket_id.eq.${ticketId}`)
      .single();

    if (attendeeCheckError || !attendeeCheck) {
      console.error('Attendee not found for this event:', attendeeCheckError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Ticket no encontrado para este evento'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate access using the public function
    const { data: validationData, error: validationError } = await supabaseClient
      .rpc('validate_control_access_public', {
        p_ticket_id: ticketId,
        p_control_type_id: controlTypeId
      });

    if (validationError) {
      console.error('Validation error:', validationError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Error al validar el acceso' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validation_result = Array.isArray(validationData) ? validationData[0] : validationData;

    if (!validation_result) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No se pudo validar el ticket' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If access is denied, return error with details
    if (!validation_result.can_access) {
      const { data: attendeeData } = await supabaseClient
        .rpc('find_attendee_by_ticket_public', { ticket_id: ticketId });

      let attendee = attendeeData && attendeeData.length > 0 ? attendeeData[0] : null;

      let lastUsage: { used_at?: string; device?: string } | null = null;
      if (validation_result.attendee_id) {
        const { data: lastUsageData } = await supabaseClient
          .from('control_usage')
          .select('used_at, device')
          .eq('attendee_id', validation_result.attendee_id)
          .eq('control_type_id', controlTypeId)
          .order('used_at', { ascending: false })
          .limit(1);

        if (lastUsageData && lastUsageData.length > 0) {
          lastUsage = lastUsageData[0];
        }
      }

      console.log('Access denied:', validation_result.error_message);
      return new Response(
        JSON.stringify({
          success: false,
          message: validation_result.error_message,
          data: {
            attendee_id: validation_result.attendee_id,
            attendee_name: attendee?.name || 'Desconocido',
            ticket_id: attendee?.ticket_id || ticketId,
            current_uses: validation_result.current_uses,
            max_uses: validation_result.max_uses,
            last_usage: lastUsage
          }
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Record usage
    const { error: usageError } = await supabaseClient
      .from('control_usage')
      .insert({
        attendee_id: validation_result.attendee_id,
        control_type_id: controlTypeId,
        device: device || 'Unknown device',
        notes: `Escaneado por usuario ${user.id}`
      });

    if (usageError) {
      console.error('Error recording usage:', usageError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Error al registrar el uso' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get attendee info for response
    const { data: attendeeData } = await supabaseClient
      .rpc('find_attendee_by_ticket_public', { ticket_id: ticketId });

    const attendee = attendeeData && attendeeData.length > 0 ? attendeeData[0] : null;

    const { data: ticketCategory } = await supabaseClient
      .from('ticket_categories')
      .select('*')
      .eq('id', attendee?.category_id)
      .single();

    console.log('Access granted for attendee:', attendee?.name || ticketId);

    return new Response(
      JSON.stringify({
        success: true,
        canAccess: true,
        message: validation_result.error_message,
        attendee: {
          id: attendee?.id,
          name: attendee?.name || 'Desconocido',
          ticket_id: attendee?.ticket_id || ticketId,
          category: ticketCategory?.name || 'Unknown'
        },
        usage: {
          currentUses: validation_result.current_uses + 1,
          maxUses: validation_result.max_uses
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Error interno del servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
