import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Smartphone,
  Download,
  Apple,
  Share,
  WifiOff,
  CheckCircle2,
  Info,
} from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const Install = () => {
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    // Detect installed standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="Instalar Chequi" />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <Smartphone className="h-16 w-16 text-dorado mx-auto" />
          <h1 className="text-3xl font-bold text-hueso">Instalar Chequi en tu celular</h1>
          <p className="text-gray-400">
            Para eventos en zonas sin internet, instala la app en tu dispositivo.
          </p>
        </div>

        {isInstalled && (
          <Alert className="bg-green-900/30 border-green-500/40">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertTitle className="text-green-300">App ya instalada</AlertTitle>
            <AlertDescription className="text-green-200/80">
              Estás usando Chequi en modo aplicación. Ya puedes trabajar sin internet.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-amber-900/20 border-amber-500/40">
          <WifiOff className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-amber-300">¿Por qué instalar?</AlertTitle>
          <AlertDescription className="text-amber-200/80 space-y-1 mt-2">
            <div>• La app abre sin internet (incluso al reiniciar el celular).</div>
            <div>• Los escaneos se guardan localmente y se sincronizan al volver la conexión.</div>
            <div>• Acceso directo desde la pantalla de inicio, sin abrir el navegador.</div>
          </AlertDescription>
        </Alert>

        {/* Android */}
        <Card className={platform === "android" ? "border-dorado" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Android (Chrome / Edge)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installPrompt ? (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Instalar Chequi ahora
              </Button>
            ) : (
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Toca el menú ⋮ (arriba a la derecha).</li>
                <li>Selecciona <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>.</li>
                <li>Confirma. El ícono aparecerá junto a tus apps.</li>
              </ol>
            )}
          </CardContent>
        </Card>

        {/* iOS */}
        <Card className={platform === "ios" ? "border-dorado" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5" /> iPhone / iPad (Safari)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>
                Abre esta página en <strong>Safari</strong> (no funciona en Chrome para iOS).
              </li>
              <li>
                Toca el botón <Share className="h-3 w-3 inline" /> <strong>Compartir</strong>.
              </li>
              <li>
                Desliza y elige <strong>"Agregar a inicio"</strong>.
              </li>
              <li>Confirma con <strong>"Agregar"</strong>.</li>
            </ol>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Antes de un evento sin internet</AlertTitle>
          <AlertDescription className="space-y-1 mt-2 text-sm">
            <div>1. Instala la app en cada dispositivo de control.</div>
            <div>2. Inicia sesión con cobertura.</div>
            <div>3. Ve a <strong>Scanner</strong> y pulsa <strong>"Preparar evento offline"</strong>.</div>
            <div>4. Verifica que aparezca <strong>"✅ Listo offline"</strong> antes de salir.</div>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Volver
          </Button>
          <Button onClick={() => navigate("/scanner")} className="flex-1">
            Ir al Scanner
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Install;
