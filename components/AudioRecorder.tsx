
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Sentence = {
  id: string;
  text_content: string;
  category: string | null;
};

export default function AudioRecorder() {
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrlRef = useRef("");
  const secondsRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearAudio = useCallback(() => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setAudioUrl("");
    setAudioBlob(null);
    secondsRef.current = 0;
    setSeconds(0);
  }, []);

  const loadSentence = useCallback(async () => {
    if (recording) return;

    setMessage("");
    clearAudio();

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("community_sentences")
        .select("id, text_content, category")
        .eq("language_code", "am")
        .eq("active", true)
        .limit(100);

      if (error) throw error;

      if (!data?.length) {
        setSentence(null);
        setMessage("አሁን የአማርኛ አረፍተ ነገር አልተገኘም።");
        return;
      }

      setSentence(data[Math.floor(Math.random() * data.length)]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "አረፍተ ነገር መጫን አልተቻለም።"
      );
    }
  }, [clearAudio, recording]);

  useEffect(() => {
    void loadSentence();

    return () => {
      clearTimer();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []); // Load once when the page opens.

  function stopRecording() {
    clearTimer();

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage("ይህ አሳሽ የድምፅ ቅጂን አይደግፍም። Chrome ተጠቀም።");
      return;
    }

    try {
      clearAudio();
      setMessage("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          setAudioUrl(url);
          setAudioBlob(blob);
        } else {
          setMessage("ድምፅ አልተቀዳም። እንደገና ሞክር።");
        }

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        clearTimer();
      };

      recorder.onerror = () => {
        setMessage("በድምፅ ቅጂ ላይ ስህተት ተፈጥሯል።");
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        clearTimer();
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);

        if (secondsRef.current >= 600) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setMessage("ማይክሮፎን ፈቃድ አልተሰጠም። የChrome ፈቃድን አረጋግጥ።");
    }
  }

  async function uploadRecording() {
    if (!sentence || !audioBlob || secondsRef.current < 1) {
      setMessage("መጀመሪያ የድምፅ ቅጂ አድርግ።");
      return;
    }

    setLoading(true);
    setMessage("");

    let filePath = "";
    let uploaded = false;

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("መጀመሪያ ወደ መለያህ ግባ።");

      const extension = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("community-recordings")
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type || "audio/webm",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploaded = true;

      const { error: insertError } = await supabase
        .from("community_recordings")
        .insert({
          sentence_id: sentence.id,
          user_id: user.id,
          audio_path: filePath,
          duration_seconds: secondsRef.current,
          status: "pending",
        });

      if (insertError) throw insertError;

      setMessage("ድምፅህ ተልኳል። ሌላ ተጠቃሚ እስኪያረጋግጠው ይጠብቃል።");
      clearAudio();
      await loadSentence();
    } catch (error) {
      if (uploaded && filePath) {
        const supabase = createSupabaseClient();
        await supabase.storage
          .from("community-recordings")
          .remove([filePath]);
      }

      setMessage(
        error instanceof Error ? error.message : "ድምፅ መላክ አልተቻለም።"
      );
    } finally {
      setLoading(false);
    }
  }

  const time = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  return (
    <section className="rounded-2xl bg-white p-5 shadow">
      <p className="mb-3 text-sm font-semibold text-teal-700">
        የሚቀርብልህ አረፍተ ነገር
      </p>

      <div className="min-h-32 rounded-xl bg-teal-50 p-5 text-center">
        <p className="text-xl font-bold leading-10 text-gray-800">
          {sentence?.text_content ?? "አረፍተ ነገር በመጫን ላይ..."}
        </p>
      </div>

      {sentence?.category && (
        <p className="mt-2 text-center text-sm text-gray-500">
          ዘርፍ፦ {sentence.category}
        </p>
      )}

      <div className="my-6 text-center">
        <p className="text-3xl font-bold tabular-nums">{time}</p>
        <p className="mt-1 text-sm text-gray-500">
          {recording ? "በመቅዳት ላይ..." : "የቅጂ ጊዜ"}
        </p>
      </div>

      <div className="grid gap-3">
        {!recording ? (
          <button
            onClick={startRecording}
            disabled={!sentence || loading}
            className="rounded-xl bg-red-600 px-5 py-4 font-bold text-white disabled:opacity-50"
          >
            ● ቅጂ ጀምር
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="rounded-xl bg-gray-800 px-5 py-4 font-bold text-white"
          >
            ■ ቅጂ አቁም
          </button>
        )}

        {audioUrl && (
          <div className="space-y-3">
            <audio controls src={audioUrl} className="w-full" />
            <button
              onClick={uploadRecording}
              disabled={loading || recording}
              className="w-full rounded-xl bg-teal-700 px-5 py-4 font-bold text-white disabled:opacity-50"
            >
              {loading ? "በመላክ ላይ..." : "ድምፄን ላክ"}
            </button>
            <button
              onClick={clearAudio}
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-5 py-3"
            >
              ቅጂውን ሰርዝ
            </button>
          </div>
        )}

        <button
          onClick={() => void loadSentence()}
          disabled={recording || loading}
          className="rounded-xl border border-teal-700 px-5 py-3 font-semibold text-teal-800"
        >
          ሌላ አረፍተ ነገር አሳየኝ
        </button>
      </div>

      {message && (
        <p className="mt-5 break-words rounded-lg bg-gray-100 p-3 text-center text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
