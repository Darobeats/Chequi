import React from "react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const { t } = useTranslation("landing");

  const faqItems = t("faq.items", { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            {t("faq.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-400">
            {t("faq.subtitle")}
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqItems.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-gray-900/40 border border-gray-800 rounded-lg px-6 hover:border-dorado/30 transition-colors"
            >
              <AccordionTrigger className="text-left text-base md:text-lg font-semibold text-gray-100 hover:text-dorado py-5 min-h-[56px] transition-colors duration-200">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm md:text-base text-gray-400 leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm md:text-base text-gray-400 mb-4">
            {t("faq.contactCta")}
          </p>
          <a
            href="mailto:contacto@chequi.com"
            className="text-dorado hover:text-dorado/80 font-semibold text-base md:text-lg underline underline-offset-4 transition-colors"
          >
            {t("faq.contactLink")}
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
