import React, { useState } from "react";
import Header from "@/components/Header";
import QRScanner from "@/components/QRScanner";

const Scanner = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  return (
    <div className="min-h-screen bg-empresarial flex flex-col touch-manipulation">
      <Header title="SCANNER DE ACCESO" />

      <main className="flex-1 flex flex-col items-center justify-start p-3 md:p-4 pt-4 md:pt-6 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-4">
          <div className="max-w-lg mx-auto p-4 md:p-8 space-y-4 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
            <div className="text-center mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-dorado mb-2">Escáner QR de Acceso</h1>
              <p className="text-sm md:text-base text-gray-400">Escanee el código QR del asistente</p>
            </div>

            <QRScanner 
              selectedEventId={selectedEventId}
              onEventChange={setSelectedEventId}
            />
          </div>
        </div>
      </main>

      <footer className="py-3 md:py-4 text-center text-gray-500 text-xs flex-shrink-0">
        &copy; {new Date().getFullYear()} Chequi - Todos los derechos reservados - Hecho en Colombia con ❤️ by Daro
      </footer>
    </div>
  );
};

export default Scanner;
