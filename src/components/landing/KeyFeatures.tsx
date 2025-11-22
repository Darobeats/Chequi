import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Smartphone, BarChart3, Users, Lock, FileText } from "lucide-react";

const KeyFeatures = () => {
  const features = [
    {
      icon: Ticket,
      title: "Tickets QR Personalizados",
      description: "Genera códigos QR únicos por asistente con tu logo y colores. Previene fraude y reventa. Exportación masiva en PNG y PDF.",
      color: "text-dorado"
    },
    {
      icon: Smartphone,
      title: "Scanner Multi-Dispositivo",
      description: "Funciona en cualquier smartphone sin instalación. Modo offline con sincronización automática. Múltiples puntos de control simultáneos.",
      color: "text-blue-400"
    },
    {
      icon: BarChart3,
      title: "Dashboard en Tiempo Real",
      description: "Métricas de asistencia en vivo. Gráficos de actividad por hora. Tasas de llegada y ocupación. Vista agregada de todos los controles.",
      color: "text-green-400"
    },
    {
      icon: Users,
      title: "Gestión de Asistentes",
      description: "Importación masiva desde Excel. Asignación automática de tickets. Categorización por tipo/empresa. Búsqueda y filtros avanzados.",
      color: "text-purple-400"
    },
    {
      icon: Lock,
      title: "Control de Seguridad",
      description: "Roles diferenciados (Admin/Control/Scanner). Auditoría completa de accesos. Protección de datos con RLS policies. Cumplimiento normativo.",
      color: "text-red-400"
    },
    {
      icon: FileText,
      title: "Reportes Empresariales",
      description: "Exportación Excel con 5 hojas detalladas. Análisis por categoría de ticket. Actividad por hora con picos. Base para facturación del servicio.",
      color: "text-yellow-400"
    }
  ];

  return (
    <section id="caracteristicas" className="py-16 md:py-24 px-4 bg-gradient-to-b from-empresarial to-gray-950">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            Todo lo que Necesitas para el Control Total de tu Evento
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Funcionalidades empresariales diseñadas para eventos de cualquier escala
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="bg-gray-900/40 border-gray-800 hover:border-dorado/30 transition-colors duration-300 hover:shadow-lg hover:shadow-dorado/10 group"
            >
              <CardHeader>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-800/50 flex items-center justify-center mb-4 group-hover:bg-gray-800 transition-colors">
                  <feature.icon className={`h-6 w-6 md:h-7 md:w-7 ${feature.color}`} />
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default KeyFeatures;
