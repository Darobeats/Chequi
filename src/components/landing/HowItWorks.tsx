import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Send, ScanLine, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: Settings,
      title: "Configura",
      time: "15 minutos",
      description: "Crea tu evento, define categorías de tickets y carga tu lista de asistentes desde Excel. Personaliza colores y logo.",
      tasks: [
        "Crear evento y configuración",
        "Definir categorías de tickets",
        "Cargar asistentes masivamente",
        "Asignar tickets automáticamente"
      ]
    },
    {
      number: 2,
      icon: Send,
      title: "Distribuye",
      time: "Automático",
      description: "Genera códigos QR únicos para cada asistente. Exporta en PNG o PDF y envía por email, o imprime tickets físicos.",
      tasks: [
        "Generar QR personalizados",
        "Exportar tickets en PNG/PDF",
        "Enviar por email masivo",
        "Imprimir si es necesario"
      ]
    },
    {
      number: 3,
      icon: ScanLine,
      title: "Controla",
      time: "Durante el evento",
      description: "Escanea QR con cualquier smartphone. Dashboard en tiempo real con métricas. Múltiples controles simultáneos.",
      tasks: [
        "Escanear QR en entrada",
        "Validación instantánea",
        "Dashboard en vivo",
        "Reportes automáticos"
      ]
    }
  ];

  return (
    <section id="como-funciona" className="py-16 md:py-24 px-4 scroll-mt-20">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            Tres Pasos para tu Evento Exitoso
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Implementa Chequi en minutos. Sin complicaciones técnicas ni capacitación extensa.
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <Card className="bg-gray-900/40 border-gray-800 hover:border-dorado/40 transition-all duration-300 group relative">
                  <CardContent className="p-6 md:p-8">
                    {/* Step number badge */}
                    <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-dorado flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-bold text-empresarial">
                        {step.number}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="w-16 h-16 rounded-xl bg-gray-800/50 flex items-center justify-center mb-6 mt-2 group-hover:bg-gray-800 transition-colors">
                      <step.icon className="h-8 w-8 text-dorado" />
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
                {index < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center absolute top-1/2 -translate-y-1/2 -right-4 translate-x-1/2">
                    <ArrowRight className="h-8 w-8 text-dorado/50" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 md:mt-16 text-center">
          <div className="inline-block bg-gray-900/60 border border-dorado/20 rounded-xl p-6 md:p-8">
            <p className="text-base md:text-lg text-gray-300 mb-2">
              <span className="text-dorado font-bold">Todo el proceso toma menos de 20 minutos</span> desde la configuración inicial hasta tener el primer QR escaneado.
            </p>
            <p className="text-sm md:text-base text-gray-400">
              Sin curva de aprendizaje. Sin complicaciones técnicas. Solo resultados.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
