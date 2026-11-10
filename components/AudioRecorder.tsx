
"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Sentence = {
  id: string;
  text_content: string;
  domain: string | null;
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
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadSentence() {
    setMessage("");
    setAudioUrl("");
    setAudioBlob(null);
    setSeconds(0);

    try {
      const supabase = createSupabaseClient();

      const { data, error } = await supabase
        .from("sentences")
        .select("id, text_content, domain")
        .eq("language_code", "am")
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) {
        setSentence(null);
        setMessage("አሁን የአማርኛ አረፍተ ነገር አልተገኘም።");
        return;
      }

      const random = data[Math.floor(Math.random() * data.length)];
      setSentence(random);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "አረፍተ ነገር መጫን አልተቻለም።"
      );
    }
  }

  useEffect(() => {
    loadSentence();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage("ይህ አሳሽ የድምፅ ቅጂን አይደግፍም። Chrome ተጠቀም።");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );

        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach((track) => track.stop());
        };

        recorderRef.current = recorder;
        recorder.start();
        setRecording(true);
        setMessage("");

        timerRef.current = setInterval(() => {
          setSeconds((value) => value + 1);
        }, 1000);
      })
      .catch(() => {
        setMessage("ማይክሮፎን መጠቀም አልተፈቀደም። ፈቃድ ስጥ።");
      });
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setRecording(false);
  }

  async function uploadRecording() {
    if (!sentence || !audioBlob) return;

    setLoading(true);
    setMessage("");

    try {
      const supabase = createSupabaseClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setMessage("መጀመሪያ ወደ መለያህ ግባ።");
        return;
      }

      const extension = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("voice-recordings")
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("voice_recordings")
        .insert({
          sentence_id: sentence.id,
          user_id: user.id,
          audio_url: filePath,
          status: "pending",
        });

      if (insertError) {
        await supabase.storage
          .from("voice-recordings")
          .remove([filePath]);
        throw insertError;
      }

      setMessage("ድምፅህ በተሳካ ሁኔታ ተልኳል። እናመሰግናለን!");
      setAudioUrl("");
      setAudioBlob(null);
      setSeconds(0);
      await loadSentence();
    } catch (error) {
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

      {sentence?.domain && (
        <p className="mt-2 text-center text-sm text-gray-500">
          ዘርፍ፦ {sentence.domain}
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
            className="rounded-xl bg-red-600 px-5 py-4 font-bold text-white"
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
              disabled={loading}
              className="w-full rounded-xl bg-teal-700 px-5 py-4 font-bold text-white"
            >
              {loading ? "በመላክ ላይ..." : "ድምፄን ላክ"}
            </button>
            <button
              onClick={() => {
                setAudioUrl("");
                setAudioBlob(null);
                setSeconds(0);
              }}
              className="w-full rounded-xl border border-gray-300 px-5 py-3"
            >
              ቅጂውን ሰርዝ
            </button>
          </div>
        )}

        <button
          onClick={loadSentence}
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
