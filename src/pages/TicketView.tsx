import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Loader2, AlertCircle } from 'lucide-react';
import { ticketViewUrl } from '@/lib/ticketEmail';

interface TicketData {
  name: string; category: string | null; status: string; qr: string | null;
  ticket_url: string | null; event_name: string; logo_url: string | null; date: string | null;
}

const TicketView = () => {
  const { token } = useParams();
  const [data, setData] = useState<TicketData | null>(null);
  const [error, setError] = useState('');
  const [qrImg, setQrImg] = useState('');

  useEffect(() => {
    document.title = 'Mi boleta | Chequi';
    fetch(`${ticketViewUrl()}?token=${encodeURIComponent(token || '')}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'Boleta no encontrada');
      setData(d);
      if (!d.ticket_url && d.qr) setQrImg(await QRCode.toDataURL(d.qr, { margin: 4, width: 600, errorCorrectionLevel: 'M' }));
    }).catch(() => setError('No se pudo cargar la boleta'));
  }, [token]);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-4">
      {!data && !error && <Loader2 className="mt-24 h-8 w-8 animate-spin text-primary" />}
      {error && (
        <div className="mt-24 text-center space-y-2">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p>{error}</p>
        </div>
      )}
      {data && (
        <div className="w-full max-w-md space-y-4 text-center">
          {data.logo_url && <img src={data.logo_url} alt={data.event_name} className="mx-auto max-h-16" />}
          <h1 className="text-xl font-bold text-primary">{data.event_name}</h1>
          <p className="text-lg">{data.name}{data.category ? ` · ${data.category}` : ''}</p>
          {data.ticket_url
            ? <img src={data.ticket_url} alt={`Boleta de ${data.name}`} className="w-full rounded-lg border border-border bg-white" />
            : qrImg && <img src={qrImg} alt="Código QR" className="mx-auto w-full max-w-xs rounded-lg bg-white p-2" />}
          {data.status === 'blocked' && <p className="text-destructive font-semibold">Esta boleta está bloqueada. Contacta al organizador.</p>}
          <p className="text-sm text-muted-foreground">Sube el brillo de la pantalla y presenta el QR en la entrada.</p>
        </div>
      )}
    </main>
  );
};

export default TicketView;
