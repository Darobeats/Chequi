import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "¿Necesito instalar alguna aplicación?",
      answer: "No. Chequi funciona completamente en el navegador web, tanto para administradores como para escáneres. Solo necesitas acceso a internet y un smartphone o computador con cámara para escanear códigos QR."
    },
    {
      question: "¿Funciona sin conexión a internet?",
      answer: "Sí. El módulo de scanner tiene modo offline que almacena los escaneos localmente y los sincroniza automáticamente cuando recuperas la conexión. Ideal para eventos en lugares con conectividad limitada."
    },
    {
      question: "¿Cuántos dispositivos puedo conectar simultáneamente?",
      answer: "Ilimitados. Puedes tener tantos puntos de control como necesites, todos sincronizados en tiempo real. Cada dispositivo puede funcionar de manera independiente y los datos se consolidan en el dashboard central."
    },
    {
      question: "¿Los códigos QR son seguros?",
      answer: "Absolutamente. Cada código QR es único e intransferible, generado con un token aleatorio de 128 bits. Además, el sistema valida en tiempo real y detecta intentos de reutilización o duplicación."
    },
    {
      question: "¿Puedo personalizar los tickets?",
      answer: "Sí. Puedes personalizar completamente el diseño de los tickets: agregar tu logo, cambiar colores, seleccionar fuentes, ajustar tamaños y posiciones de los elementos. También soporta imágenes de fondo personalizadas."
    },
    {
      question: "¿Hay límite de asistentes?",
      answer: "No hay límite técnico. Chequi escala desde eventos pequeños de 10 personas hasta mega eventos de más de 50,000 asistentes sin degradación de rendimiento."
    },
    {
      question: "¿Qué reportes incluye?",
      answer: "Exportación en Excel con 5 hojas: lista de todos los asistentes, escaneos por asistente, actividad por hora, resumen por categoría y análisis detallado de uso. También incluye gráficos en el dashboard en tiempo real."
    },
    {
      question: "¿Cómo es el soporte técnico?",
      answer: "Ofrecemos soporte por email con respuesta en menos de 24 horas. Para clientes empresariales, hay opciones de soporte prioritario y asistencia técnica durante eventos en vivo."
    },
    {
      question: "¿Puedo importar mi lista de asistentes?",
      answer: "Sí. Puedes importar listas completas desde archivos Excel (.xlsx) con columnas para nombre, email, categoría y otros datos. El sistema asigna automáticamente los tickets y genera los códigos QR."
    },
    {
      question: "¿Qué pasa si necesito hacer cambios de último momento?",
      answer: "Puedes agregar, editar o eliminar asistentes en cualquier momento antes y durante el evento. Los cambios se reflejan instantáneamente en todos los dispositivos conectados."
    }
  ];

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dorado mb-4">
            Preguntas Frecuentes
          </h2>
          <p className="text-base md:text-lg text-gray-400">
            Todo lo que necesitas saber sobre Chequi
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-gray-900/40 border border-gray-800 rounded-lg px-6 hover:border-dorado/30 transition-colors"
            >
              <AccordionTrigger className="text-left text-base md:text-lg font-semibold text-gray-100 hover:text-dorado py-5 min-h-[56px] transition-colors duration-200">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm md:text-base text-gray-400 leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm md:text-base text-gray-400 mb-4">
            ¿Tienes más preguntas?
          </p>
          <a
            href="mailto:contacto@chequi.com"
            className="text-dorado hover:text-dorado/80 font-semibold text-base md:text-lg underline underline-offset-4 transition-colors"
          >
            Contáctanos directamente
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
