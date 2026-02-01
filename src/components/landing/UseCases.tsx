import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Music, GraduationCap, Trophy, Store } from "lucide-react";

const UseCases = () => {
  const { t } = useTranslation("landing");
  const [activeTab, setActiveTab] = useState("corporate");
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (tabsRef.current) {
      const tabsPosition = tabsRef.current.getBoundingClientRect().top + window.pageYOffset;
      const offset = 100;
      
      window.scrollTo({
        top: tabsPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  const tabKeys = ["corporate", "concerts", "education", "sports", "fairs"] as const;
  const icons = [Building, Music, GraduationCap, Trophy, Store];

  return (
    <section id="casos-de-uso" className="py-16 md:py-24 px-4 overflow-hidden scroll-mt-20">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            {t("useCases.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            {t("useCases.subtitle")}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div ref={tabsRef}>
            <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full bg-gray-900/50 border border-gray-800 rounded-lg p-2 gap-2 mb-8">
              {tabKeys.map((key, index) => {
                const Icon = icons[index];
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="flex flex-col items-center justify-center gap-1.5 min-h-[52px] md:min-h-[44px] w-full px-2 py-2 rounded-md text-gray-300 data-[state=active]:bg-dorado data-[state=active]:text-empresarial hover:bg-gray-800/50"
                  >
                    <Icon className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs md:text-sm leading-tight text-center">
                      {t(`useCases.tabs.${key}.label`)}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {tabKeys.map((key) => {
            const types = t(`useCases.tabs.${key}.types`, { returnObjects: true }) as string[];
            const features = t(`useCases.tabs.${key}.features`, { returnObjects: true }) as string[];
            
            return (
              <TabsContent 
                key={key} 
                value={key} 
                className="mt-0 animate-in fade-in-50 duration-200"
              >
                <Card className="bg-gray-900/40 border-gray-800">
                  <CardContent className="p-6 md:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left column - Info */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-2xl md:text-3xl font-bold text-dorado mb-4">
                            {t(`useCases.tabs.${key}.title`)}
                          </h3>
                          <div className="space-y-2 text-sm md:text-base">
                            <p className="text-gray-400">
                              <span className="font-semibold text-gray-300">{t("useCases.capacity")}:</span> {t(`useCases.tabs.${key}.capacity`)}
                            </p>
                            <p className="text-gray-400">
                              <span className="font-semibold text-gray-300">{t("useCases.controls")}:</span> {t(`useCases.tabs.${key}.controls`)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-gray-200 mb-3">
                            {t("useCases.eventTypes")}
                          </h4>
                          <ul className="space-y-2">
                            {types.map((type, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm md:text-base text-gray-400">
                                <span className="text-dorado mt-1">•</span>
                                <span>{type}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Right column - Features */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-200 mb-4">
                          {t("useCases.featuredFunctions")}
                        </h4>
                        <div className="space-y-3">
                          {features.map((feature, index) => (
                            <div
                              key={index}
                              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-dorado/30 transition-colors"
                            >
                              <p className="text-sm md:text-base text-gray-300">{feature}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
};

export default UseCases;
