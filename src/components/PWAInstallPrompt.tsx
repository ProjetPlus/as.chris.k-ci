import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallPrompt() {
  const { isInstallable, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-primary-foreground/20 rounded-lg shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm">Installer AS.CHRIS.K</p>
          <p className="text-xs opacity-80 mt-0.5">
            Installez l'application pour un accès rapide et hors-ligne
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 text-xs"
              onClick={async () => {
                await install();
              }}
            >
              <Download className="h-3 w-3 mr-1" /> Installer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground/70 hover:text-primary-foreground h-8 text-xs"
              onClick={() => setDismissed(true)}
            >
              Plus tard
            </Button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-primary-foreground/50 hover:text-primary-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
