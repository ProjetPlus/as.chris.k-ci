import { useEffect, useState } from "react";
import { Download, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { OFFICIAL_ASCHRISK_LOGO_URL } from "@/assets/aschriskOfficialLogo";

const AUTO_DISMISS_MS = 30_000;

export function PWAInstallPrompt() {
  const { isInstallable, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss after 30s.
  useEffect(() => {
    if (!isInstallable || dismissed) return;
    const t = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [isInstallable, dismissed]);

  if (!isInstallable || dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Installer l'application AS.CHRIS.K"
      onClick={() => setDismissed(true)}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card-style frame: bordeaux spine + ivory body, matching member cards */}
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-bordeaux-dark via-bordeaux to-or" />
        <div className="bg-gradient-to-br from-creme via-card to-card border border-or/30 pl-2">
          {/* Header strip */}
          <div className="bg-gradient-to-r from-bordeaux-dark to-bordeaux px-5 py-4 flex items-center gap-3">
            <img
              src={OFFICIAL_ASCHRISK_LOGO_URL}
              alt="Logo AS.CHRIS.K"
              className="w-12 h-12 object-contain drop-shadow"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-base sm:text-lg text-primary-foreground leading-tight">
                Installer AS.CHRIS.K
              </p>
              <p className="text-[11px] sm:text-xs text-or-light truncate">
                Application officielle de l'association
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Fermer"
              className="shrink-0 rounded-full p-1.5 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-bordeaux-pale text-bordeaux shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Installez l'application sur votre appareil pour un accès rapide,
                un fonctionnement <span className="font-semibold text-foreground">hors ligne</span> et
                une ouverture comme une vraie application.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <Button
                className="flex-1 h-10 text-sm font-semibold bg-bordeaux hover:bg-bordeaux-dark text-primary-foreground animate-[pulse_2s_ease-in-out_infinite] shadow-elegant"
                onClick={async () => {
                  await install();
                  setDismissed(true);
                }}
              >
                <Download className="h-4 w-4 mr-2" /> Installer
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm border-bordeaux/30 text-bordeaux hover:bg-bordeaux-pale"
                onClick={() => setDismissed(true)}
              >
                Plus tard
              </Button>
            </div>

            <p className="mt-3 text-center text-[10px] text-muted-foreground/70">
              Cette fenêtre se ferme automatiquement dans 30 secondes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
