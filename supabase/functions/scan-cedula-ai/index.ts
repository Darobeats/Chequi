import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No se proporcionó imagen');
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
      throw new Error(`Error del servicio de IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No se recibió respuesta de la IA');
    }

    console.log('Respuesta de IA:', aiResponse);

    // Extraer JSON de la respuesta
    let extractedData;
    try {
      // Buscar JSON en la respuesta
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

    // Validar que tenga al menos el número de cédula
    if (!extractedData.numero_cedula) {
      throw new Error('No se pudo extraer el número de cédula');
    }

    // Limpiar número de cédula (eliminar puntos, espacios, guiones)
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

  } catch (error) {
    console.error('Error en scan-cedula-ai:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
