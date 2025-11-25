import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Error sanitization
function sanitizeError(error: any, context: string): string {
  console.error(`${context}:`, error);
  
  if (error?.code === 'PGRST116') return 'Usuario no encontrado';
  if (error?.code === '23505') return 'El rol ya está asignado';
  if (error?.message?.includes('violates')) return 'Los datos proporcionados son inválidos';
  if (error?.message?.includes('permission')) return 'Permisos insuficientes';
  
  return 'Error al actualizar el rol';
}

// Input validation
interface UpdateRoleRequest {
  userId: string;
  role: 'admin' | 'control' | 'attendee' | 'viewer' | 'scanner';
}

function validateUpdateRoleRequest(body: any): { valid: boolean; error?: string; data?: UpdateRoleRequest } {
  if (!body.userId || typeof body.userId !== 'string') {
    return { valid: false, error: 'userId es requerido y debe ser un string' };
  }

  const validRoles = ['admin', 'control', 'attendee', 'viewer', 'scanner'];
  if (!body.role || !validRoles.includes(body.role)) {
    return { valid: false, error: `role debe ser uno de: ${validRoles.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      userId: body.userId,
      role: body.role,
    }
  };
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

    // Check if the requesting user is authorized
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

    // Check if user is super admin
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
    const validation = validateUpdateRoleRequest(body);

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

    const { userId, role } = validation.data!;

    // Update role in user_roles table using service role key (bypasses RLS)
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .upsert({ 
        user_id: userId, 
        role,
        granted_by: authUser.user.id,
        granted_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })

    if (roleError) {
      const safeMessage = sanitizeError(roleError, 'Role update error');
      throw new Error(safeMessage);
    }

    console.log('Role updated successfully:', userId, role);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Rol actualizado exitosamente' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    const safeMessage = sanitizeError(error, 'Unexpected error');
    return new Response(
      JSON.stringify({ error: safeMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})