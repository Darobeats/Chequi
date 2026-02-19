import React from 'react';
import type { SponsorLogo } from './SponsorLogosManager';

interface SponsorLogosBarProps {
  sponsors: SponsorLogo[];
  showPoweredBy?: boolean;
}

const SponsorLogosBar: React.FC<SponsorLogosBarProps> = ({ sponsors, showPoweredBy = true }) => {
  const validSponsors = sponsors.filter(s => s.url && s.name);
  
  if (validSponsors.length === 0 && !showPoweredBy) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[90vw]">
      <div className="flex items-center gap-5 px-6 py-3 rounded-full border border-primary/30 bg-card/90 backdrop-blur-md shadow-lg shadow-black/30">
        {validSponsors.length > 0 && (
          <>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Patrocinadores
            </span>
            <div className="w-px h-5 bg-border/60" />
            <div className="flex items-center gap-5 flex-wrap justify-center">
              {validSponsors.map((sponsor, i) => {
                const img = (
                  <img
                    key={i}
                    src={sponsor.url}
                    alt={sponsor.name}
                    title={sponsor.name}
                    className="h-10 max-w-[120px] object-contain opacity-90 hover:opacity-100 transition-opacity"
                  />
                );
                return sponsor.link ? (
                  <a key={i} href={sponsor.link} target="_blank" rel="noopener noreferrer">
                    {img}
                  </a>
                ) : (
                  img
                );
              })}
            </div>
          </>
        )}
        {showPoweredBy && (
          <>
            {validSponsors.length > 0 && <div className="w-px h-5 bg-border/60" />}
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              Powered by <span className="text-primary font-semibold">Chequi</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default SponsorLogosBar;
