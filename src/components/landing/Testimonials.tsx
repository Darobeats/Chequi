import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote, Building, Music, GraduationCap } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      quote: "Chequi nos permitió controlar 5,000 asistentes en nuestra conferencia anual sin contratiempos. Los reportes fueron clave para justificar el ROI del evento ante la junta directiva.",
      author: "María González",
      role: "Directora de Eventos",
      company: "TechCorp LATAM",
      eventType: "Evento Corporativo",
      attendees: "5,000 personas",
      icon: Building,
      color: "text-blue-400"
    },
    {
      quote: "Implementamos Chequi para nuestro festival y eliminamos completamente el fraude de entradas. El dashboard en vivo nos permitió tomar decisiones operativas en tiempo real.",
      author: "Carlos Ramírez",
      role: "Productor",
      company: "Live Events Co",
      eventType: "Festival Musical",
      attendees: "15,000 personas",
      icon: Music,
      color: "text-purple-400"
    },
    {
      quote: "La graduación de 3,000 estudiantes se organizó sin estrés gracias a Chequi. Cada familia tuvo su código QR y pudimos controlar el aforo de la ceremonia con precisión.",
      author: "Ana Martínez",
      role: "Coordinadora de Eventos",
      company: "Universidad Nacional",
      eventType: "Graduación Universitaria",
      attendees: "3,000 personas",
      icon: GraduationCap,
      color: "text-green-400"
    }
  ];

  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-empresarial to-gray-950">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Organizadores de eventos confían en Chequi para sus operaciones más críticas
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
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
                  <div className={`w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center`}>
                    <testimonial.icon className={`h-4 w-4 ${testimonial.color}`} />
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
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center">
          <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto">
            Más de <span className="text-dorado font-semibold">500+ eventos</span> gestionados con éxito. 
            <span className="block mt-2">¿Quieres ser el siguiente caso de éxito?</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
