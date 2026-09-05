import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import LandingFooter from '@/components/landing/LandingFooter';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import type { LegalDocument } from '@/lib/legal';
import { LEGAL_DISCLAIMER, LEGAL_ENTITY } from '@/lib/legal';

interface LegalPageLayoutProps {
  document: LegalDocument;
}

const setMeta = (name: string, content: string) => {
  let tag = window.document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = window.document.createElement('meta');
    tag.setAttribute('name', name);
    window.document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ document }) => {
  useEffect(() => {
    window.document.title = `${document.title} | Chequi`;
    setMeta('description', document.description.slice(0, 158));
  }, [document]);

  return (
    <div className="min-h-dvh bg-empresarial flex flex-col">
      <Header brandAsHeading={false} />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-dorado transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dorado rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-12">
            {/* Índice */}
            <nav aria-label="Índice del documento" className="lg:sticky lg:top-24 lg:self-start">
              <details className="lg:hidden rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-dorado">
                  Contenido del documento
                </summary>
                <ul className="mt-3 space-y-2">
                  {document.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-sm text-gray-400 hover:text-dorado">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>

              <ul className="hidden lg:block space-y-2 border-l border-gray-800 pl-4">
                {document.sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-sm text-gray-400 hover:text-dorado transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dorado rounded"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Documento */}
            <article className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl font-bold text-dorado">{document.title}</h1>

              <p className="mt-3 text-sm text-gray-400">
                Versión {document.version} · Última actualización: {document.updatedAt} ·{' '}
                {LEGAL_ENTITY.brand} / {LEGAL_ENTITY.operator}
              </p>

              <div
                role="note"
                className="mt-6 flex gap-3 rounded-lg border border-dorado/30 bg-dorado/10 p-4"
              >
                <AlertTriangle className="h-5 w-5 text-dorado flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-hueso/90 leading-relaxed">{LEGAL_DISCLAIMER}</p>
              </div>

              <div className="mt-10 space-y-10">
                {document.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="text-xl md:text-2xl font-semibold text-hueso">{section.title}</h2>
                    {section.pending && (
                      <p className="mt-2 inline-block rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-400">
                        Pendiente de revisión legal
                      </p>
                    )}
                    <div className="mt-3 space-y-4">
                      {section.paragraphs.map((p, i) => (
                        <p key={i} className="text-gray-300 leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-12 rounded-lg border border-gray-800 bg-gray-900/50 p-5">
                <h2 className="text-base font-semibold text-hueso">¿Dudas sobre este documento?</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Escríbenos por {LEGAL_ENTITY.contactChannel}:{' '}
                  <a
                    href={LEGAL_ENTITY.contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dorado hover:underline"
                  >
                    {LEGAL_ENTITY.contactDisplay}
                  </a>
                </p>
              </div>
            </article>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

export default LegalPageLayout;
