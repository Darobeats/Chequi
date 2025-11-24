import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Music, GraduationCap, Trophy, Store } from "lucide-react";

const UseCases = () => {
  const [activeTab, setActiveTab] = useState("corporativos");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const handleTabChange = (value: string) => {
    setIsTransitioning(true);
    setActiveTab(value);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 200);
    
    // Prevenir scroll jump en móvil
    if (window.innerWidth < 768 && tabsRef.current) {
      const tabsPosition = tabsRef.current.getBoundingClientRect().top + window.pageYOffset;
      const offset = 100; // Espacio para header
      
      window.scrollTo({
        top: tabsPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  const useCases = [
    {
      id: "corporativos",
      icon: Building,
      label: "Corporativos",
      title: "Eventos Empresariales",
      capacity: "50 - 5,000 asistentes",
      controls: "2-10 puntos simultáneos",
      types: [
        "Conferencias y congresos empresariales",
        "Capacitaciones corporativas y talleres",
        "Eventos de networking y team building",
        "Lanzamientos de producto y presentaciones",
        "Reuniones anuales de accionistas"
      ],
      features: [
        "Reportes por empresa para facturación",
        "Acreditaciones diferenciadas por cargo",
        "Control de acceso a salas VIP",
        "Integración con sistemas corporativos"
      ]
    },
    {
      id: "conciertos",
      icon: Music,
      label: "Conciertos",
      title: "Conciertos y Shows",
      capacity: "500 - 50,000+ asistentes",
      controls: "5-30 puntos simultáneos",
      types: [
        "Conciertos de música en vivo",
        "Festivales y eventos masivos",
        "Obras de teatro y espectáculos",
        "Shows de comedia y stand-up",
        "Eventos deportivos de entretenimiento"
      ],
      features: [
        "Control de zonas VIP y backstage",
        "Re-entry para eventos de varios días",
        "Gestión de capacidad por zona",
        "Prevención de reventa y fraude"
      ]
    },
    {
      id: "educacion",
      icon: GraduationCap,
      label: "Educación",
      title: "Eventos Académicos",
      capacity: "100 - 10,000 asistentes",
      controls: "3-15 puntos simultáneos",
      types: [
        "Graduaciones y ceremonias de grado",
        "Conferencias académicas y simposios",
        "Jornadas científicas y culturales",
        "Eventos estudiantiles y deportivos",
        "Talleres y cursos presenciales"
      ],
      features: [
        "Reportes por facultad y carrera",
        "Control de invitados por graduando",
        "Certificados de asistencia automáticos",
        "Gestión de protocolo y VIPs"
      ]
    },
    {
      id: "deportivos",
      icon: Trophy,
      label: "Deportivos",
      title: "Eventos Deportivos",
      capacity: "1,000 - 100,000 asistentes",
      controls: "10-50 puntos simultáneos",
      types: [
        "Partidos de fútbol y deportes de equipo",
        "Torneos y competencias deportivas",
        "Maratones y carreras atléticas",
        "Eventos de deportes extremos",
        "Olimpiadas y campeonatos"
      ],
      features: [
        "Control por tribuna y sector",
        "Gestión de abonados y temporadas",
        "Re-entry para eventos largos",
        "Reportes de ocupación en vivo"
      ]
    },
    {
      id: "ferias",
      icon: Store,
      label: "Ferias",
      title: "Ferias y Exposiciones",
      capacity: "1,000 - 20,000 asistentes",
      controls: "5-20 puntos simultáneos",
      types: [
        "Ferias comerciales y expos",
        "Convenciones y trade shows",
        "Exposiciones de arte y cultura",
        "Mercados y eventos gastronómicos",
        "Ferias de ciencia y tecnología"
      ],
      features: [
        "Acreditaciones por tipo (expositores, visitantes, prensa)",
        "Control de acceso a stands y zonas",
        "Re-entry ilimitado durante el evento",
        "Estadísticas por día y franja horaria"
      ]
    }
  ];

  return (
    <section id="casos-de-uso" className="py-16 md:py-24 px-4 overflow-hidden scroll-mt-20">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            Chequi se Adapta a Cualquier Evento
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Desde pequeñas reuniones hasta mega eventos. La misma tecnología, infinitas posibilidades.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div ref={tabsRef}>
            <TabsList className="flex md:grid md:grid-cols-5 w-full overflow-x-auto md:overflow-x-visible scrollbar-hide bg-gray-900/50 border border-gray-800 rounded-md gap-2 p-2 mb-8 snap-x snap-mandatory md:snap-none relative">
              {useCases.map((useCase) => (
                <TabsTrigger
                  key={useCase.id}
                  value={useCase.id}
                  className="
                    relative
                    flex flex-col sm:flex-row items-center justify-center 
                    gap-1 sm:gap-2
                    min-h-[48px] min-w-[44px]
                    w-[140px] md:w-auto
                    px-3 py-2
                    rounded-md
                    text-xs sm:text-sm font-medium
                    text-gray-300
                    bg-transparent
                    border border-transparent
                    transition-all duration-200 ease-in-out
                    hover:bg-gray-800/50 hover:border-gray-700
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-dorado/50 focus-visible:ring-offset-0
                    data-[state=active]:bg-dorado data-[state=active]:text-empresarial data-[state=active]:border-dorado
                    data-[state=active]:shadow-[0_0_20px_rgba(212,175,55,0.3)]
                    disabled:pointer-events-none disabled:opacity-50
                    touch-manipulation
                    select-none
                    snap-center md:snap-none
                    flex-shrink-0
                  "
                >
                  <useCase.icon className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm leading-tight text-center sm:text-left whitespace-nowrap">
                    {useCase.label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {useCases.map((useCase) => (
            <TabsContent 
              key={useCase.id} 
              value={useCase.id} 
              className="mt-0 animate-in fade-in-50 duration-200"
            >
              <Card className="bg-gray-900/40 border-gray-800">
                <CardContent className="p-6 md:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left column - Info */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold text-dorado mb-4">
                          {useCase.title}
                        </h3>
                        <div className="space-y-2 text-sm md:text-base">
                          <p className="text-gray-400">
                            <span className="font-semibold text-gray-300">Capacidad:</span> {useCase.capacity}
                          </p>
                          <p className="text-gray-400">
                            <span className="font-semibold text-gray-300">Controles:</span> {useCase.controls}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-200 mb-3">
                          Tipos de eventos:
                        </h4>
                        <ul className="space-y-2">
                          {useCase.types.map((type, index) => (
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
                        Funcionalidades destacadas:
                      </h4>
                      <div className="space-y-3">
                        {useCase.features.map((feature, index) => (
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
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default UseCases;
