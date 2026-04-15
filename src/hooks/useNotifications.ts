import { useEffect, useRef, useState, useCallback } from "react";

const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAAD//wEA//8BAP//AQD//wEA//8BAAAA//8AAAEAAQAAAP//AQAAAP//AQD//wIA/v8DAP3/BAD8/wUA+/8GAPr/BwD5/wgA+P8JAPf/CgD2/wsA9f8MAPX/DAD1/wwA9f8NAPT/DQD0/w4A8/8OAPT/DgD0/w4A9P8OAPT/DgD1/w0A9f8NAPT/DgD0/w4A8/8PAPN/DwDy/xAA8v8QAPL/EADy/xAA8v8RAPH/EQDx/xEA8f8RAPH/EQDx/xIA8P8SAPD/EgDw/xIA8P8TAPD/EwDv/xMA7/8TAO//EwDv/xMA7/8TAO//EwDv/xMA8P8SAPD/EgDw/xIA8f8RAPH/EQDy/xAA8v8QAPT/DgD1/w0A9v8MAPL/CgDy/wwA9P8OAPH/BgD4/wQA+v8CAAAAAQD//wMA/P8GAP3/BAD//wEAAAD//wIA/v8EAPz/BQD8/wUA/P8FAPz/BQD9/wQA/f8EAP7/AwD+/wMA//8CAP//AgAAAAAAAQD//wIA/v8DAP3/BAD8/wYA+v8HAPn/CQD3/woA9v8MAPX/DAD1/w0A9P8NAPT/DgDz/w8A8v8QAPL/EADx/xEA8f8RAPH/EQDx/xEA8f8RAPH/EQDx/xEA8f8RAPH/EQDx/xEA8f8RAPD/EgDw/xIA8P8SAPD/EgDw/xIA8P8SAPD/EgDw/xIA8P8SAPD/EgDw/xIA8f8RAPH/EQDx/xEA8v8QAPL/EADz/w8A9P8OAPX/DQD2/wwA+P8KAPn/CQD7/wcA/P8GAP7/BAD//wIA//8CAP//AgD//wIA//8BAAAAAAD//wEAAAD//wEA//8BAP//AQD//wEA//8BAP//AQD//wEA//8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem("wa_sound_enabled") !== "false"; } catch { return true; }
  });
  const [notifEnabled, setNotifEnabled] = useState(() => {
    try { return localStorage.getItem("wa_notif_enabled") !== "false"; } catch { return true; }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const toggleSound = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    try { localStorage.setItem("wa_sound_enabled", String(enabled)); } catch {}
  }, []);

  const toggleNotif = useCallback((enabled: boolean) => {
    setNotifEnabled(enabled);
    try { localStorage.setItem("wa_notif_enabled", String(enabled)); } catch {}
    if (enabled && permission === "default") requestPermission();
  }, [permission, requestPermission]);

  const notify = useCallback((title: string, body: string, onClick?: () => void) => {
    // Play sound
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    // Browser notification
    if (notifEnabled && permission === "granted" && typeof Notification !== "undefined") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/placeholder.svg",
          tag: "wa-message",
          silent: true,
        } as NotificationOptions);
        if (onClick) {
          notif.onclick = () => {
            window.focus();
            onClick();
            notif.close();
          };
        }
        setTimeout(() => notif.close(), 5000);
      } catch {}
    }
  }, [soundEnabled, notifEnabled, permission]);

  return {
    permission,
    soundEnabled,
    notifEnabled,
    requestPermission,
    toggleSound,
    toggleNotif,
    notify,
  };
}
