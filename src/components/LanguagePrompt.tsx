import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const LanguagePrompt: React.FC = () => {
  const { i18n, t } = useTranslation("common");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if prompt was already dismissed
    const dismissed = localStorage.getItem("languagePromptDismissed");
    if (dismissed === "true") {
      return;
    }

    // Check if user has already chosen a language
    const savedLanguage = localStorage.getItem("i18nextLng");
    if (savedLanguage) {
      return;
    }

    // Detect browser language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    const isEnglish = browserLang?.toLowerCase().startsWith("en");

    // Show prompt if browser is in English but site is in Spanish
    if (isEnglish && i18n.language !== "en") {
      // Small delay to avoid flash
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);

      // Auto-dismiss after 15 seconds
      const autoDismissTimer = setTimeout(() => {
        setIsVisible(false);
      }, 16500);

      return () => {
        clearTimeout(timer);
        clearTimeout(autoDismissTimer);
      };
    }
  }, [i18n.language]);

  const handleSwitchToEnglish = () => {
    i18n.changeLanguage("en");
    localStorage.setItem("i18nextLng", "en");
    localStorage.setItem("languagePromptDismissed", "true");
    setIsVisible(false);
  };

  const handleKeepSpanish = () => {
    localStorage.setItem("languagePromptDismissed", "true");
    setIsVisible(false);
  };

  const handleDontAskAgain = () => {
    localStorage.setItem("languagePromptDismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-gray-900 border border-dorado/30 rounded-lg shadow-2xl shadow-dorado/10 p-4 md:p-5">
        {/* Close button */}
        <button
          onClick={handleKeepSpanish}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="pr-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🇺🇸</span>
            <h3 className="text-lg font-semibold text-dorado">
              {t("languagePrompt.title")}
            </h3>
          </div>
          
          <p className="text-sm text-gray-300 mb-4">
            {t("languagePrompt.message")}
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSwitchToEnglish}
              className="w-full bg-dorado hover:bg-dorado/90 text-empresarial font-medium touch-manipulation"
              size="sm"
            >
              {t("languagePrompt.yes")}
            </Button>
            <Button
              onClick={handleKeepSpanish}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 touch-manipulation"
              size="sm"
            >
              {t("languagePrompt.no")}
            </Button>
          </div>

          {/* Don't ask again link */}
          <button
            onClick={handleDontAskAgain}
            className="w-full text-xs text-gray-500 hover:text-gray-400 mt-3 transition-colors"
          >
            {t("languagePrompt.dontAsk")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguagePrompt;
