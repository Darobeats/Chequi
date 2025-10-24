import React, { useState } from "react";
import Header from "@/components/Header";
import QRScanner from "@/components/QRScanner";

const Scanner = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // El scanner es de libre acceso, no requiere autenticación ni verificación de permisos
  // Mostrar scanner directamente
  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="SCANNER DE ACCESO" />

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 space-y-8 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-dorado mb-2">Escáner QR de Acceso</h1>
            <p className="text-gray-400">Escanee el código QR del asistente</p>
            <p className="text-sm text-gray-500 mt-2">Sistema de control de acceso</p>
          </div>

          <QRScanner 
            selectedEventId={selectedEventId}
            onEventChange={setSelectedEventId}
          />
        </div>
      </div>

      <footer className="py-4 text-center text-gray-500 text-xs">
        &copy; {new Date().getFullYear()} Chequi - Todos los derechos reservados - Hecho en Colombia con ❤️ by Daro
      </footer>
    </div>
  );
};

export default Scanner;
