import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user with scanner/control/admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user }, error: userErr } = await authClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: roleRows } = await authClient
      .from('user_roles').select('role').eq('user_id', user.id);
    const allowed = ['admin', 'control', 'scanner'];
    if (!(roleRows ?? []).some((r: any) => allowed.includes(r.role))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permisos insuficientes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce a strict body size limit before parsing to avoid memory exhaustion.
    const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength && contentLength > MAX_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: 'Imagen demasiado grande' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: 'Imagen demasiado grande' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsed: { image?: unknown };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'JSON inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const image = parsed.image;
    if (typeof image !== 'string' || image.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se proporcionó imagen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only accept base64 data URIs for common image formats. Reject URLs to prevent SSRF at the AI gateway tier.
    const dataUriRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
    if (!dataUriRegex.test(image)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de imagen no permitido (use data URI base64)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (image.length > MAX_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: 'Imagen demasiado grande' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no está configurada');
    }

    console.log('Iniciando análisis de cédula con IA...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en lectura de cédulas de ciudadanía colombianas.
Analiza la imagen de la cédula y extrae EXACTAMENTE estos datos del FRENTE de la cédula:
- numero_cedula: El número de documento (solo dígitos, sin puntos ni espacios)
- nombres: Los nombres de la persona (como aparecen en la cédula)
- primer_apellido: Primer apellido
- segundo_apellido: Segundo apellido (puede estar vacío si no existe)
- fecha_nacimiento: En formato DD/MM/YYYY si es visible

IMPORTANTE: 
- Si no puedes leer algún dato con certeza, usa null
- El número de cédula debe ser solo números, sin puntos ni espacios
- Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "numero_cedula": "1234567890",
  "nombres": "JUAN CARLOS",
  "primer_apellido": "PÉREZ",
  "segundo_apellido": "GONZÁLEZ",
  "fecha_nacimiento": "15/03/1990"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analiza esta cédula colombiana y extrae los datos solicitados.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Lovable AI:', response.status, errorText);
      
      // Return specific error codes for credit/rate limit issues
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false,
            errorCode: 'AI_CREDITS_EXHAUSTED',
            error: 'Créditos de IA agotados'
          }),
          {
            status: 200, // Return 200 so supabase.functions.invoke doesn't throw
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false,
            errorCode: 'AI_RATE_LIMITED',
            error: 'Demasiadas solicitudes, intente de nuevo'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`Error del servicio de IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No se recibió respuesta de la IA');
    }

    console.log('Respuesta de IA:', aiResponse);

    let extractedData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError, 'Respuesta:', aiResponse);
      throw new Error('La IA no retornó un formato válido');
    }

    if (!extractedData.numero_cedula) {
      throw new Error('No se pudo extraer el número de cédula');
    }

    extractedData.numero_cedula = extractedData.numero_cedula.toString().replace(/[.\s-]/g, '');

    console.log('Datos extraídos:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: extractedData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error en scan-cedula-ai:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Error procesando la cédula'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
