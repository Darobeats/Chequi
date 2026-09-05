import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getWhatsAppUrl } from "@/lib/contact";

/**
 * Botón flotante de WhatsApp para la landing.
 * Aparece tras un pequeño scroll y usa la paleta dorada del sitio.
 */
const FloatingWhatsApp = () => {
  const { t } = useTranslation("landing");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const label = t("floatingWhatsapp.label", { defaultValue: "Escríbenos" });

  return (
    <a
      href={getWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("floatingWhatsapp.aria", {
        defaultValue: "Escríbenos por WhatsApp",
      })}
      className={`group fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-dorado px-0 text-empresarial shadow-2xl shadow-dorado/30 ring-1 ring-dorado/40 transition-all duration-300 hover:bg-dorado/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dorado motion-safe:animate-qr-pulse md:w-auto md:min-w-[3.5rem] md:group-hover:px-5 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6 shrink-0 fill-current"
      >
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.6 2 2.17 6.43 2.17 11.87c0 1.74.46 3.44 1.33 4.94L2 22l5.34-1.4a9.85 9.85 0 0 0 4.7 1.2h.01c5.44 0 9.87-4.43 9.87-9.87S17.48 2 12.04 2zm0 17.98h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.17.83.85-3.09-.2-.32a8.16 8.16 0 0 1-1.25-4.36c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.86 5.8 2.4a8.15 8.15 0 0 1 2.4 5.8c0 4.53-3.68 8.21-8.15 8.21z" />
      </svg>

      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold transition-all duration-300 md:inline-block md:max-w-0 md:group-hover:ml-2 md:group-hover:max-w-[10rem] md:group-focus-visible:ml-2 md:group-focus-visible:max-w-[10rem]">
        {label}
      </span>

    </a>
  );
};

export default FloatingWhatsApp;
