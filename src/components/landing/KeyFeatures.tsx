import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Smartphone, BarChart3, Users, Lock, FileText } from "lucide-react";

const KeyFeatures = () => {
  const { t } = useTranslation("landing");

  const featureItems = t("features.items", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  const icons = [Ticket, Smartphone, BarChart3, Users, Lock, FileText];
  const colors = [
    "text-dorado",
    "text-blue-400",
    "text-green-400",
    "text-purple-400",
    "text-red-400",
    "text-yellow-400"
  ];

  return (
    <section id="caracteristicas" className="py-16 md:py-24 px-4 bg-gradient-to-b from-empresarial to-gray-950">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            {t("features.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {featureItems.map((feature, index) => {
            const Icon = icons[index];
            const color = colors[index];
            return (
              <Card 
                key={index}
                className="bg-gray-900/40 border-gray-800 hover:border-dorado/30 transition-colors duration-300 hover:shadow-lg hover:shadow-dorado/10 group"
              >
                <CardHeader>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-800/50 flex items-center justify-center mb-4 group-hover:bg-gray-800 transition-colors">
                    <Icon className={`h-6 w-6 md:h-7 md:w-7 ${color}`} />
                  </div>
                  <CardTitle className="text-lg md:text-xl text-gray-100 group-hover:text-dorado transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm md:text-base text-gray-400 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default KeyFeatures;
