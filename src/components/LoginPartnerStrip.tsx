import React from 'react';
import { useLoginPartnerLogos } from '@/hooks/useLoginPartnerLogos';

/** Franja elegante de patrocinadores/aliados para la pantalla de ingreso. */
const LoginPartnerStrip: React.FC = () => {
  const { data: logos = [] } = useLoginPartnerLogos();
  if (logos.length === 0) return null;

  const sponsors = logos.filter((l) => l.kind !== 'partner');
  const partners = logos.filter((l) => l.kind === 'partner');
  const label = sponsors.length && partners.length ? 'Patrocinadores y aliados' : partners.length ? 'Aliados' : 'Patrocinadores';
  const marquee = logos.length > 4;
  const items = marquee ? [...logos, ...logos] : logos;

  const Logo = ({ l }: { l: (typeof logos)[number] }) => {
    const img = (
      <img
        src={l.logo_url}
        alt={l.name}
        loading="lazy"
        className="h-8 sm:h-10 w-auto max-w-[110px] sm:max-w-[140px] object-contain opacity-100 transition duration-500"
      />
    );
    return (
      <li className="flex items-center justify-center px-4 sm:px-6 flex-shrink-0">
        {l.link_url ? <a href={l.link_url} target="_blank" rel="noopener noreferrer" aria-label={l.name}>{img}</a> : img}
      </li>
    );
  };

  return (
    <section aria-label={label} className="w-full mt-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-3 px-2">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-dorado/40 to-transparent" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-dorado/80">{label}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-dorado/40 to-transparent" />
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-hueso/10 bg-hueso/[0.04] backdrop-blur-md py-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <ul className={`flex items-center ${marquee ? 'w-max animate-[partner-marquee_28s_linear_infinite] hover:[animation-play-state:paused]' : 'justify-center flex-wrap gap-y-3'}`}>
          {items.map((l, i) => <Logo key={`${l.id}-${i}`} l={l} />)}
        </ul>
      </div>
      <style>{`@keyframes partner-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media (prefers-reduced-motion: reduce){[class*="partner-marquee"]{animation:none!important}}`}</style>
    </section>
  );
};

export default LoginPartnerStrip;
