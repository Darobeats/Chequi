import React from "react";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { QrCode, Mail, MapPin, Phone } from "lucide-react";

const LandingFooter = () => {
  const { t } = useTranslation("landing");

  const footerLinks = {
    producto: [
      { label: t("footer.links.features"), href: "#caracteristicas" },
      { label: t("footer.links.howItWorks"), href: "#como-funciona" },
      { label: t("footer.links.useCases"), href: "#casos-uso" },
      { label: t("footer.links.pricing"), href: "#precios" },
    ],
    recursos: [
      { label: t("footer.links.documentation"), href: "#docs" },
      { label: t("footer.links.support"), href: "#soporte" },
      { label: t("footer.links.faq"), href: "#faq" },
      { label: t("footer.links.contact"), href: "#contacto" },
    ],
    empresa: [
      { label: t("footer.links.about"), href: "#nosotros" },
      { label: t("footer.links.blog"), href: "#blog" },
      { label: t("footer.links.successCases"), href: "#casos-exito" },
      { label: t("footer.links.careers"), href: "#careers" },
    ],
    legal: [
      { label: t("footer.links.terms"), href: "#terminos" },
      { label: t("footer.links.privacy"), href: "#privacidad" },
      { label: t("footer.links.cookies"), href: "#cookies" },
      { label: t("footer.links.gdpr"), href: "#gdpr" },
    ],
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-gray-950 border-t border-gray-800">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
            {/* Brand Column */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-dorado flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-empresarial" />
                </div>
                <h3 className="text-2xl font-bold text-dorado">CHEQUI</h3>
              </div>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {t("footer.brandDescription")}
              </p>

              {/* Contact Info */}
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-dorado flex-shrink-0 mt-0.5" />
                  <span>{t("footer.location")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-dorado flex-shrink-0" />
                  <a
                    href="https://wa.me/573204963384?text=Hola,%20estoy%20interesado%20en%20conocer%20más%20sobre%20Chequi%20para%20mis%20eventos.%20¿Podrían%20brindarme%20información?"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-dorado transition-colors"
                  >
                    +57 350 517 5312
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-dorado flex-shrink-0" />
                  <a href="mailto:contacto@chequi.com" className="hover:text-dorado transition-colors">
                    contacto@chequi.com
                  </a>
                </div>
              </div>
            </div>

            {/* Producto */}
            <div>
              <h4 className="font-semibold text-gray-200 mb-4">{t("footer.sections.product")}</h4>
              <ul className="space-y-3">
                {footerLinks.producto.map((link, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleLinkClick(link.href)}
                      className="text-sm text-gray-400 hover:text-dorado transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <h4 className="font-semibold text-gray-200 mb-4">{t("footer.sections.resources")}</h4>
              <ul className="space-y-3">
                {footerLinks.recursos.map((link, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleLinkClick(link.href)}
                      className="text-sm text-gray-400 hover:text-dorado transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h4 className="font-semibold text-gray-200 mb-4">{t("footer.sections.company")}</h4>
              <ul className="space-y-3">
                {footerLinks.empresa.map((link, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleLinkClick(link.href)}
                      className="text-sm text-gray-400 hover:text-dorado transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-gray-200 mb-4">{t("footer.sections.legal")}</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleLinkClick(link.href)}
                      className="text-sm text-gray-400 hover:text-dorado transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-800" />

        {/* Bottom Bar */}
        <div className="py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <p className="text-sm text-gray-500 text-center md:text-left">
              &copy; {new Date().getFullYear()} Chequi. {t("footer.copyright")}
              <span className="hidden sm:inline"> {t("footer.madeWith")}</span>
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-dorado transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-dorado transition-colors"
                aria-label="Twitter"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-dorado transition-colors"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
