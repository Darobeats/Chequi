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
    <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-auto max-w-[94vw]">
      <div className="flex items-center gap-2 sm:gap-5 px-3 sm:px-6 py-3 rounded-full overflow-hidden border border-primary/30 bg-card/90 backdrop-blur-md shadow-lg shadow-black/30">
        {validSponsors.length > 0 && (
          <>
            <span className="hidden sm:inline text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Patrocinadores
            </span>
            <div className="hidden sm:block w-px h-5 bg-border/60" />
            <div className="flex items-center gap-3 sm:gap-5 min-w-0 overflow-x-auto no-scrollbar">
              {validSponsors.map((sponsor, i) => {
                const img = (
                  <img
                    key={i}
                    src={sponsor.url}
                    alt={sponsor.name}
                    title={sponsor.name}
                    className="h-8 sm:h-10 max-w-[90px] sm:max-w-[120px] shrink-0 object-contain opacity-90 hover:opacity-100 transition-opacity"
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
            <span className="text-[9px] sm:text-[11px] leading-tight text-muted-foreground shrink-0 text-center sm:whitespace-nowrap">
              Powered by<br className="sm:hidden" />{' '}
              <a
                href="https://darocodeia.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                DarocodeIA
              </a>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default SponsorLogosBar;
