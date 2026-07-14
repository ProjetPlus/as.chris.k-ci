import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function usePWAInstall() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return {
    isInstallable: Boolean(event),
    install: async () => {
      if (!event) return;
      await event.prompt();
      await event.userChoice.catch(() => null);
      setEvent(null);
    },
  };
}
