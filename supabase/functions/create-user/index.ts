import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation
interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'control' | 'attendee' | 'viewer';
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateCreateUserRequest(body: any): { valid: boolean; error?: string; data?: CreateUserRequest } {
  // Validate email
  if (!body.email || typeof body.email !== 'string') {
    return { valid: false, error: 'email es requerido y debe ser un string' };
  }
  if (!validateEmail(body.email)) {
    return { valid: false, error: 'email debe ser una dirección de correo válida' };
  }

  // Validate password
  if (!body.password || typeof body.password !== 'string') {
    return { valid: false, error: 'password es requerido y debe ser un string' };
  }
  if (body.password.length < 6) {
    return { valid: false, error: 'password debe tener al menos 6 caracteres' };
  }

  // Validate full_name
  if (!body.full_name || typeof body.full_name !== 'string') {
    return { valid: false, error: 'full_name es requerido y debe ser un string' };
  }
  if (body.full_name.length < 1 || body.full_name.length > 200) {
    return { valid: false, error: 'full_name debe tener entre 1 y 200 caracteres' };
  }

  // Validate role
  const validRoles = ['admin', 'control', 'attendee', 'viewer'];
  if (!body.role || !validRoles.includes(body.role)) {
    return { valid: false, error: `role debe ser uno de: ${validRoles.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      email: body.email.toLowerCase().trim(),
      password: body.password,
      full_name: body.full_name.trim(),
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
    const validation = validateCreateUserRequest(body);

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

    const { email, password, full_name, role } = validation.data!;

    // Create user with admin privileges
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (createError) {
      console.error('User creation error:', createError);
      throw new Error(`Error al crear usuario: ${createError.message}`);
    }

    // Update the profile with full_name (role is stored in separate table now)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ full_name })
      .eq('id', newUser.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Attempt to delete the user if profile update fails
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Error al actualizar perfil: ${profileError.message}`);
    }

    // Insert role in user_roles table (separated for security)
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({ 
        user_id: newUser.user.id, 
        role,
        granted_by: authUser.user.id
      })

    if (roleError) {
      console.error('Role assignment error:', roleError);
      // Attempt to delete the user if role assignment fails
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Error al asignar rol: ${roleError.message}`);
    }

    console.log('User created successfully:', email);

    return new Response(
      JSON.stringify({ 
        user: newUser.user, 
        message: 'Usuario creado exitosamente' 
      }),
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