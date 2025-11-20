import React from "react";
import { X, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ProblemSolution = () => {
  const problems = [
    "Listas en papel o Excel propensas a fraude y duplicados",
    "Revendedores y entradas falsas imposibles de detectar",
    "Reportes manuales que tardan días en prepararse",
    "Falta de visibilidad de asistencia durante el evento",
    "Dificultad para gestionar múltiples puntos de acceso simultáneos"
  ];

  const solutions = [
    "Códigos QR únicos por asistente, imposibles de duplicar",
    "Validación instantánea con alertas de fraude en tiempo real",
    "Reportes automáticos en Excel con métricas detalladas",
    "Dashboard en vivo con estadísticas actualizadas cada segundo",
    "Gestión centralizada desde cualquier dispositivo móvil"
  ];

  return (
    <section className="py-16 md:py-24 px-4 relative">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            El Desafío de los Eventos Empresariales
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Los métodos tradicionales dejan tu evento vulnerable. Chequi elimina estos riesgos.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          {/* Problems Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold text-gray-200">
                Métodos Tradicionales
              </h3>
            </div>
            
            {problems.map((problem, index) => (
              <Card key={index} className="bg-gray-900/40 border-red-500/20 hover:border-red-500/40 transition-colors">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm md:text-base text-gray-300">{problem}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Solutions Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-dorado/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-dorado" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold text-dorado">
                Con Chequi
              </h3>
            </div>
            
            {solutions.map((solution, index) => (
              <Card key={index} className="bg-gray-900/40 border-dorado/20 hover:border-dorado/40 transition-colors">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-dorado flex-shrink-0 mt-0.5" />
                    <p className="text-sm md:text-base text-gray-300">{solution}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;
