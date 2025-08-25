import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PublicQR: React.FC = () => {
  const { attendeeId } = useParams();
  const [attendee, setAttendee] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchAttendee = async () => {
      try {
        const { data, error } = await supabase
          .from('attendees')
          .select(`
            *,
            ticket_category:ticket_categories(name)
          `)
          .eq('id', attendeeId)
          .single();

        if (error) throw error;
        
        setAttendee(data);

        if (data.qr_code) {
          const qrUrl = await QRCode.toDataURL(data.qr_code, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          });
          setQrDataUrl(qrUrl);
        }
      } catch (err) {
        setError('No se pudo cargar la información del asistente');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (attendeeId) {
      fetchAttendee();
    }
  }, [attendeeId]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `QR-${attendee.name.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando código QR...</p>
        </div>
      </div>
    );
  }

  if (error || !attendee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-4">{error || 'Asistente no encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Código QR de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{attendee.name}</h3>
              {attendee.email && (
                <p className="text-muted-foreground">{attendee.email}</p>
              )}
              {attendee.ticket_category?.name && (
                <p className="text-sm bg-secondary px-3 py-1 rounded-full inline-block">
                  {attendee.ticket_category.name}
                </p>
              )}
            </div>
            
            {qrDataUrl ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img 
                    src={qrDataUrl} 
                    alt={`QR Code para ${attendee.name}`}
                    className="w-full h-auto max-w-[300px]"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Presenta este código QR en el evento para acceder
                  </p>
                  <button
                    onClick={downloadQR}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Descargar QR
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No se pudo generar el código QR</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicQR;