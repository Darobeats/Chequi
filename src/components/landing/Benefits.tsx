import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Clock, Eye, Zap, DollarSign, Globe } from "lucide-react";

const Benefits = () => {
  const { t } = useTranslation("landing");

  const mainBenefits = t("benefits.mainBenefits", { returnObjects: true }) as Array<{
    value: string;
    label: string;
    description: string;
  }>;

  const additionalBenefits = t("benefits.additionalBenefits", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  const additionalIcons = [Zap, DollarSign, Globe, TrendingDown, Eye, Clock];

  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-950 to-empresarial">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            {t("benefits.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            {t("benefits.subtitle")}
          </p>
        </div>

        {/* Main Benefits - Large Numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16">
          {mainBenefits.map((benefit, index) => (
            <Card key={index} className="bg-gray-900/60 border-dorado/20 hover:border-dorado/40 transition-all duration-300 group">
              <CardContent className="p-6 md:p-8 text-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-dorado mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                  {benefit.value}
                </div>
                <div className="text-base md:text-lg font-semibold text-gray-200 mb-1">
                  {benefit.label}
                </div>
                <div className="text-xs md:text-sm text-gray-400">
                  {benefit.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {additionalBenefits.map((benefit, index) => {
            const Icon = additionalIcons[index];
            return (
              <div
                key={index}
                className="bg-gray-900/40 border border-gray-800 rounded-lg p-6 hover:border-dorado/30 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-dorado/10 flex items-center justify-center flex-shrink-0 group-hover:bg-dorado/20 transition-colors">
                    <Icon className="h-6 w-6 text-dorado" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2 group-hover:text-dorado transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to action */}
        <div className="mt-12 md:mt-16 text-center">
          <p className="text-base md:text-lg text-gray-300 max-w-3xl mx-auto">
            {t("benefits.cta")}
            <span className="text-dorado font-semibold"> {t("benefits.ctaHighlight")}</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
