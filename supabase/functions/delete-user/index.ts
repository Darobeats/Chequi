import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation
function validateUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateDeleteUserRequest(body: any): { valid: boolean; error?: string; userId?: string } {
  if (!body.userId || typeof body.userId !== 'string') {
    return { valid: false, error: 'userId es requerido y debe ser un string' };
  }
  if (!validateUUID(body.userId)) {
    return { valid: false, error: 'userId debe ser un UUID válido' };
  }
  return { valid: true, userId: body.userId };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if the requesting user is authorized via super_admins table
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: authUser, error: getUserError } = await supabaseClient.auth.getUser(token)
    
    if (getUserError || !authUser.user) {
      console.error('Auth error:', getUserError);
      return new Response(
        JSON.stringify({ error: 'No autorizado - Usuario no encontrado' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if user is super admin via database function
    const { data: isSuperAdmin, error: authError } = await supabaseClient
      .rpc('is_super_admin', { check_user_id: authUser.user.id })
    
    if (authError || !isSuperAdmin) {
      console.error('Authorization error:', authError);
      return new Response(
        JSON.stringify({ error: 'No autorizado - Privilegios insuficientes' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = validateDeleteUserRequest(body);

    if (!validation.valid) {
      console.error('Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { userId } = validation;

    // Prevent self-deletion
    if (userId === authUser.user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminarte a ti mismo' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if target user exists
    const { data: targetUser, error: targetUserError } = await supabaseClient.auth.admin.getUserById(userId!);
    if (targetUserError || !targetUser.user) {
      console.error('Target user not found:', targetUserError);
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Delete user from auth (cascade will handle profiles)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId!)

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Error al eliminar usuario: ${deleteError.message}`);
    }

    console.log('User deleted successfully:', userId);

    return new Response(
      JSON.stringify({ message: 'Usuario eliminado exitosamente' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})