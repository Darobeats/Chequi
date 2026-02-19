import React from 'react';
import type { SponsorLogo } from './SponsorLogosManager';

interface EventBrandingPreviewProps {
  eventName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string | null;
  backgroundUrl?: string | null;
  backgroundOpacity?: number;
  welcomeMessage?: string | null;
  sponsors?: SponsorLogo[];
}

const EventBrandingPreview: React.FC<EventBrandingPreviewProps> = ({
  eventName,
  primaryColor,
  secondaryColor,
  accentColor,
  fontFamily,
  logoUrl,
  backgroundUrl,
  backgroundOpacity = 0.15,
  welcomeMessage,
  sponsors = [],
}) => {
  const validSponsors = sponsors.filter(s => s.url && s.name);

  return (
    <div className="w-full rounded-lg border border-border overflow-hidden" style={{ fontFamily }}>
      {/* Mini Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ backgroundColor: secondaryColor, borderBottom: `2px solid ${primaryColor}` }}
      >
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded" />
        )}
        <span className="text-sm font-bold" style={{ color: primaryColor }}>
          {eventName || 'Nombre del Evento'}
        </span>
      </div>

      {/* Body */}
      <div
        className="relative p-4 min-h-[120px] flex flex-col justify-between"
        style={{ backgroundColor: secondaryColor }}
      >
        {/* Background image */}
        {backgroundUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              opacity: backgroundOpacity,
            }}
          />
        )}

        <div className="relative z-10 space-y-2">
          {welcomeMessage && (
            <p className="text-xs" style={{ color: accentColor }}>
              {welcomeMessage}
            </p>
          )}

          {/* Sample card */}
          <div
            className="rounded-md p-2 border"
            style={{
              backgroundColor: `${secondaryColor}cc`,
              borderColor: `${primaryColor}40`,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: primaryColor, color: secondaryColor }}
              >
                42
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: primaryColor }}>
                  Total Asistentes
                </p>
                <p className="text-[10px]" style={{ color: accentColor }}>
                  Vista previa del dashboard
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor logos */}
        {validSponsors.length > 0 && (
          <div className="relative z-10 mt-3 pt-2 border-t flex items-center gap-3 justify-center" style={{ borderColor: `${primaryColor}30` }}>
            {validSponsors.map((s, i) => (
              <img key={i} src={s.url} alt={s.name} className="h-5 max-w-[60px] object-contain opacity-70" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventBrandingPreview;
