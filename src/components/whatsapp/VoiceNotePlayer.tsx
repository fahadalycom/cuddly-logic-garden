import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const mediaBlobCache = new Map<string, string>();

interface VoiceNotePlayerProps {
  mediaKey: string;
  mimeType?: string;
  isOutgoing?: boolean;
  isMobile?: boolean;
}

export function VoiceNotePlayer({ mediaKey, mimeType, isOutgoing, isMobile }: VoiceNotePlayerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(mediaBlobCache.get(mediaKey) || null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadAudio = useCallback(async () => {
    if (blobUrl || loading) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/whatsapp-media?key=${encodeURIComponent(mediaKey)}`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!resp.ok) throw new Error("Failed to load");
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      mediaBlobCache.set(mediaKey, objectUrl);
      setBlobUrl(objectUrl);
    } catch (e) {
      console.error("Voice note load error:", e);
    } finally {
      setLoading(false);
    }
  }, [mediaKey, blobUrl, loading]);

  useEffect(() => {
    if (!blobUrl) return;
    const audio = new Audio(blobUrl);
    audioRef.current = audio;

    const onLoaded = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [blobUrl]);

  const togglePlay = () => {
    if (!blobUrl) {
      loadAudio();
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate fake waveform bars
  const barCount = isMobile ? 28 : 35;
  const bars = useRef(
    Array.from({ length: barCount }, () => 0.15 + Math.random() * 0.85)
  ).current;

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[180px]" style={{ maxWidth: isMobile ? 260 : 300 }}>
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={loading}
        className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isOutgoing
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            : "bg-primary/15 hover:bg-primary/25 text-primary"
        }`}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" fill="currentColor" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform + Time */}
      <div className="flex-1 min-w-0">
        <div
          className="flex items-end gap-[2px] h-[28px] cursor-pointer"
          onClick={handleSeek}
        >
          {bars.map((h, i) => {
            const barPct = (i / bars.length) * 100;
            const isActive = barPct <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  isActive
                    ? isOutgoing
                      ? "bg-primary-foreground/80"
                      : "bg-primary"
                    : isOutgoing
                    ? "bg-primary-foreground/25"
                    : "bg-muted-foreground/25"
                }`}
                style={{ height: `${h * 100}%`, minWidth: 2.5 }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[10px] ${isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
