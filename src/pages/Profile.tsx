import React from "react";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, User, Mail, Building, Calendar } from "lucide-react";

const Profile = () => {
  const { profile, user } = useSupabaseAuth();

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <p className="text-hueso">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="MI PERFIL" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información Personal */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-dorado flex items-center gap-2">
                <User className="w-5 h-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-hueso">{profile.email}</span>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-hueso">{profile.full_name || "No especificado"}</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  className={`${
                    profile.role === "admin"
                      ? "bg-red-800/30 text-red-400"
                      : profile.role === "control"
                        ? "bg-blue-800/30 text-blue-400"
                        : "bg-green-800/30 text-green-400"
                  }`}
                >
                  {profile.role === "admin" ? "Administrador" : profile.role === "control" ? "Control" : "Asistente"}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  Miembro desde {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Código QR */}
          {profile.attendee_id && (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-dorado flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Mi Código QR
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <div className="w-48 h-48 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <span className="text-gray-500">QR Code</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Presenta este código QR en el evento para el control de acceso</p>
                <Button variant="outline" className="border-gray-700 text-hueso hover:bg-gray-800">
                  Descargar QR
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Historial de Accesos */}
          <Card className="bg-gray-900/50 border-gray-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-dorado">Historial de Accesos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-400">No hay registros de acceso disponibles</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="py-4 text-center text-gray-500 text-xs">
        &copy; {new Date().getFullYear()} Chequi - Todos los derechos reservados - Hecho en Colombia con ❤️ by Daro
      </footer>
    </div>
  );
};

export default Profile;
