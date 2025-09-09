import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { data: authUser } = await supabaseClient.auth.getUser(token)
    
    if (!authUser.user || authUser.user.email !== 'iacristiandigital@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { email, password, full_name, role } = await req.json()

    // Create user with admin privileges
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (createError) {
      throw createError
    }

    // Update the profile with the specified role
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ role, full_name })
      .eq('id', newUser.user.id)

    if (profileError) {
      throw profileError
    }

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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})