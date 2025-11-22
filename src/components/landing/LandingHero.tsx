import React from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, QrCode, BarChart3, Shield } from "lucide-react";

const LandingHero = () => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth?demo=true");
    }
  };

  const handleLearnMore = () => {
    document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-12 md:py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-empresarial via-empresarial/95 to-empresarial pointer-events-none"></div>
      
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none pattern-overlay"></div>

      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left side - Content */}
          <div className="space-y-6 text-center md:text-left">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-dorado leading-tight">
                Control de Acceso Profesional para Eventos de Alto Impacto
              </h1>
              <p className="text-lg md:text-xl text-gray-300 max-w-2xl">
                Gestiona desde 100 hasta 50,000+ asistentes con tecnología QR en tiempo real
              </p>
            </div>

            {/* Bullet points */}
            <div className="space-y-3">
              {[
                "Control en tiempo real desde cualquier dispositivo",
                "0% fraude con códigos QR únicos e intransferibles",
                "Reportes empresariales instantáneos y exportables"
              ].map((point, index) => (
                <div key={index} className="flex items-start gap-3 justify-center md:justify-start">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-dorado flex-shrink-0 mt-0.5" />
                  <span className="text-sm md:text-base text-gray-200">{point}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleGetStarted}
                className="bg-dorado hover:bg-dorado/90 text-empresarial font-semibold text-base md:text-lg px-8 py-6 touch-manipulation"
                size="lg"
              >
                {user ? "Ir al Dashboard" : "Solicitar Demo"}
              </Button>
              <Button
                onClick={handleLearnMore}
                variant="outline"
                className="border-dorado/50 text-dorado hover:bg-dorado/10 font-semibold text-base md:text-lg px-8 py-6 touch-manipulation"
                size="lg"
              >
                Ver Cómo Funciona
              </Button>
            </div>
          </div>

          {/* Right side - Visual/Mockup */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-2xl p-8 border border-dorado/20 shadow-2xl shadow-dorado/10">
              {/* Simulated dashboard preview */}
              <div className="space-y-4">
                {/* Header bar */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-dorado/20 flex items-center justify-center">
                      <QrCode className="h-4 w-4 text-dorado" />
                    </div>
                    <span className="text-sm font-semibold text-gray-300">Dashboard</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: BarChart3, label: "Asistentes", value: "2,847" },
                    { icon: Shield, label: "Controles", value: "12" }
                  ].map((stat, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                      <stat.icon className="h-5 w-5 text-dorado mb-2" />
                      <div className="text-xs text-gray-400">{stat.label}</div>
                      <div className="text-xl font-bold text-dorado">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 h-32 flex items-end gap-1">
                  {[60, 80, 70, 90, 85, 95, 88, 92].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 bg-gradient-to-t from-dorado/80 to-dorado/40 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                  ))}
                </div>

                {/* QR Code placeholder */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-empresarial" />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-dorado text-empresarial px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                En Vivo ●
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-dorado/10 rounded-full blur-3xl"></div>
            <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-dorado/5 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
