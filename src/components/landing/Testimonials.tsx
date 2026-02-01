import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Quote, Building, Music, GraduationCap } from "lucide-react";

const Testimonials = () => {
  const { t } = useTranslation("landing");

  const testimonialItems = t("testimonials.items", { returnObjects: true }) as Array<{
    quote: string;
    author: string;
    role: string;
    company: string;
    eventType: string;
    attendees: string;
  }>;

  const icons = [Building, Music, GraduationCap];
  const colors = ["text-blue-400", "text-purple-400", "text-green-400"];

  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-empresarial to-gray-950">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            {t("testimonials.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            {t("testimonials.subtitle")}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {testimonialItems.map((testimonial, index) => {
            const Icon = icons[index];
            const color = colors[index];
            return (
              <Card 
                key={index} 
                className="bg-gray-900/60 border-gray-800 hover:border-dorado/30 transition-all duration-300 group relative overflow-hidden"
              >
                {/* Quote icon */}
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Quote className="h-16 w-16 text-dorado" />
                </div>

                <CardContent className="p-6 md:p-8 relative z-10">
                  {/* Event type badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="text-xs text-gray-400">
                      {testimonial.eventType} • {testimonial.attendees}
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-sm md:text-base text-gray-300 mb-6 leading-relaxed italic">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Author info */}
                  <div className="border-t border-gray-800 pt-4">
                    <div className="font-semibold text-gray-100 mb-1">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-400">
                      {testimonial.role}
                    </div>
                    <div className="text-sm text-dorado font-medium mt-1">
                      {testimonial.company}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center">
          <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto">
            {t("testimonials.bottomNote")} <span className="text-dorado font-semibold">{t("testimonials.eventsCount")}</span> {t("testimonials.bottomNoteSuffix")}
            <span className="block mt-2">{t("testimonials.nextSuccessQuestion")}</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
