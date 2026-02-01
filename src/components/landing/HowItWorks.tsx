import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Send, ScanLine, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const { t } = useTranslation("landing");

  const stepsData = t("howItWorks.steps", { returnObjects: true }) as Array<{
    title: string;
    time: string;
    description: string;
    tasks: string[];
  }>;

  const icons = [Settings, Send, ScanLine];

  return (
    <section id="como-funciona" className="py-16 md:py-24 px-4 scroll-mt-20">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            {t("howItWorks.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            {stepsData.map((step, index) => {
              const Icon = icons[index];
              return (
                <React.Fragment key={index}>
                  <Card className="bg-gray-900/40 border-gray-800 hover:border-dorado/40 transition-all duration-300 group relative">
                    <CardContent className="p-6 md:p-8">
                      {/* Step number badge */}
                      <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-dorado flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-empresarial">
                          {index + 1}
                        </span>
                      </div>

                      {/* Icon */}
                      <div className="w-16 h-16 rounded-xl bg-gray-800/50 flex items-center justify-center mb-6 mt-2 group-hover:bg-gray-800 transition-colors">
                        <Icon className="h-8 w-8 text-dorado" />
                      </div>

                      {/* Title and time */}
                      <div className="mb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-100 mb-2 group-hover:text-dorado transition-colors">
                          {step.title}
                        </h3>
                        <p className="text-sm text-dorado font-semibold">
                          ⏱️ {step.time}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-sm md:text-base text-gray-400 mb-6 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Tasks checklist */}
                      <ul className="space-y-2">
                        {step.tasks.map((task, taskIndex) => (
                          <li key={taskIndex} className="flex items-start gap-2 text-sm text-gray-400">
                            <span className="text-dorado mt-0.5">✓</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Arrow between steps (desktop only) */}
                  {index < stepsData.length - 1 && (
                    <div className="hidden md:flex items-center justify-center absolute top-1/2 -translate-y-1/2 -right-4 translate-x-1/2">
                      <ArrowRight className="h-8 w-8 text-dorado/50" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 md:mt-16 text-center">
          <div className="inline-block bg-gray-900/60 border border-dorado/20 rounded-xl p-6 md:p-8">
            <p className="text-base md:text-lg text-gray-300 mb-2">
              <span className="text-dorado font-bold">{t("howItWorks.bottomCta")}</span> {t("howItWorks.bottomCtaDescription")}
            </p>
            <p className="text-sm md:text-base text-gray-400">
              {t("howItWorks.bottomNote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
