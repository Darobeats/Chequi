import React from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";

const FinalCTA = () => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth?demo=true");
    }
  };

  return (
    <section className="py-16 md:py-24 px-4 relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-dorado/10 via-empresarial to-empresarial"></div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-dorado/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-dorado/5 rounded-full blur-3xl"></div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main heading */}
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold text-dorado mb-6">
            ¿Listo para Revolucionar tus Eventos?
          </h2>

          {/* Subheading */}
          <p className="text-base md:text-xl text-gray-300 mb-8 md:mb-12 max-w-2xl mx-auto">
            Únete a cientos de organizadores que ya confían en Chequi para gestionar sus eventos con profesionalismo y
            eficiencia
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 md:mb-12">
            {[
              { value: "500+", label: "Eventos exitosos" },
              { value: "50K+", label: "Asistentes gestionados" },
              { value: "95%", label: "Satisfacción" },
              { value: "<2min", label: "Setup promedio" },
            ].map((stat, index) => (
              <div key={index} className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
                <div className="text-2xl md:text-3xl font-bold text-dorado mb-1">{stat.value}</div>
                <div className="text-xs md:text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button
              onClick={handleGetStarted}
              className="bg-dorado hover:bg-dorado/90 text-empresarial font-bold text-lg px-10 py-7 touch-manipulation group"
              size="lg"
            >
              {user ? "Ir al Dashboard" : "Empezar Ahora"}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              onClick={() =>
                window.open(
                  "https://wa.me/573505175312?text=Hola,%20estoy%20interesado%20en%20conocer%20más%20sobre%20Chequi%20para%20mis%20eventos.%20¿Podrían%20brindarme%20información?",
                  "_blank",
                )
              }
              variant="outline"
              className="border-2 border-dorado/50 text-dorado hover:bg-dorado/10 font-bold text-lg px-10 py-7 touch-manipulation group"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Hablar con Ventas
            </Button>
          </div>

          {/* Trust badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm md:text-base text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Sin contratos de permanencia</span>
            </div>
            <div className="hidden sm:block text-gray-600">•</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Soporte técnico incluido</span>
            </div>
            <div className="hidden sm:block text-gray-600">•</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Implementación inmediata</span>
            </div>
          </div>

          {/* Bottom text */}
          <div className="mt-10 md:mt-12 pt-8 border-t border-gray-800">
            <p className="text-sm md:text-base text-gray-400">
              Utilizado por empresas, universidades y productores de eventos en toda Colombia 🇨🇴
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
