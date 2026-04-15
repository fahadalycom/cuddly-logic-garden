import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const mediaBlobCache = new Map<string, string>();

interface VoiceNotePlayerProps {
  mediaKey: string;
  mimeType?: string;
  isOutgoing?: boolean;
  isMobile?: boolean;
}

const SPEEDS = [1, 1.5, 2];

export function VoiceNotePlayer({ mediaKey, mimeType, isOutgoing, isMobile }: VoiceNotePlayerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(mediaBlobCache.get(mediaKey) || null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate stable waveform bars
  const barCount = isMobile ? 28 : 40;
  const bars = useMemo(
    () => Array.from({ length: barCount }, () => 0.18 + Math.random() * 0.82),
    [barCount]
  );

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
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
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

  // Auto-play after load finishes
  useEffect(() => {
    if (blobUrl && loading === false && audioRef.current && !isPlaying && duration > 0) {
      // Only auto-play if this was triggered by a play click (loading just finished)
    }
  }, [blobUrl, loading]);

  const togglePlay = async () => {
    if (!blobUrl) {
      await loadAudio();
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = SPEEDS[speedIndex];
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch { /* autoplay blocked */ }
    }
  };

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next];
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const handleDownload = async () => {
    if (!blobUrl) await loadAudio();
    const url = blobUrl || mediaBlobCache.get(mediaKey);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-note.${mimeType?.includes("ogg") ? "ogg" : "webm"}`;
    a.click();
  };

  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Colors based on outgoing/incoming
  const playBtnBg = isOutgoing
    ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
    : "bg-primary/15 hover:bg-primary/25 text-primary";
  const barActiveColor = isOutgoing ? "bg-primary-foreground/80" : "bg-primary";
  const barInactiveColor = isOutgoing ? "bg-primary-foreground/20" : "bg-muted-foreground/20";
  const timeColor = isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground";
  const speedBtnClass = isOutgoing
    ? "bg-primary-foreground/15 text-primary-foreground/80 hover:bg-primary-foreground/25"
    : "bg-muted/60 text-muted-foreground hover:bg-muted";
  const downloadBtnClass = isOutgoing
    ? "text-primary-foreground/40 hover:text-primary-foreground/70 hover:bg-primary-foreground/10"
    : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50";

  return (
    <div
      className="flex items-center gap-2 py-1 min-w-[200px]"
      style={{ maxWidth: isMobile ? 280 : 340 }}
    >
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={loading}
        className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${playBtnBg}`}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" fill="currentColor" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform + Time + Speed */}
      <div className="flex-1 min-w-0">
        {/* Waveform bars */}
        <div
          className="flex items-end gap-[1.5px] h-[30px] cursor-pointer select-none"
          onClick={handleSeek}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          {bars.map((h, i) => {
            const barPct = (i / bars.length) * 100;
            const isActive = barPct <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-100 ${
                  isActive ? barActiveColor : barInactiveColor
                }`}
                style={{ height: `${h * 100}%`, minWidth: 2 }}
              />
            );
          })}
        </div>

        {/* Time + Speed control row */}
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[10px] tabular-nums ${timeColor}`}>
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
          <button
            onClick={cycleSpeed}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${speedBtnClass}`}
          >
            {SPEEDS[speedIndex]}×
          </button>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${downloadBtnClass}`}
        title="Download"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
