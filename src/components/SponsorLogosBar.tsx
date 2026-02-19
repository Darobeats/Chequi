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
    <div className="w-full py-3 px-4 border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-center gap-6 flex-wrap">
        {validSponsors.length > 0 && (
          <>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Patrocinadores</span>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {validSponsors.map((sponsor, i) => {
                const img = (
                  <img
                    key={i}
                    src={sponsor.url}
                    alt={sponsor.name}
                    title={sponsor.name}
                    className="h-8 max-w-[100px] object-contain opacity-80 hover:opacity-100 transition-opacity"
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
          <span className="text-[10px] text-muted-foreground">
            Powered by <span className="text-primary font-semibold">Chequi</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default SponsorLogosBar;
