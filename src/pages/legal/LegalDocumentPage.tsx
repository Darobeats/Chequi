import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { getLegalDocument } from '@/lib/legal';

/** Renderiza cualquier documento legal en su propia ruta /legal/:slug. */
const LegalDocumentPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const doc = getLegalDocument(slug);

  if (!doc) return <Navigate to="/legal/terminos" replace />;

  return <LegalPageLayout document={doc} />;
};

export default LegalDocumentPage;
