
"use client";

import { useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function VoiceEnrollment() {
  const [name, setName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [consent, setConsent] = useState(false);
  const [publicUse, setPublicUse] = useState(false);
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage("ይህ አሳሽ የድምፅ ቅጂን አይደግፍም። Chrome ተጠቀም።");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        chunksRef.current = [];

        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const audio = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          setBlob(audio);
          setAudioUrl(URL.createObjectURL(audio));
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        };

        recorderRef.current = recorder;
        recorder.start();
        setRecording(true);
        setSeconds(0);
        setMessage("");

        timerRef.current = setInterval(() => {
          setSeconds((value) => value + 1);
        }, 1000);
      })
      .catch(() => {
        setMessage("ማይክሮፎን ፈቃድ አልተሰጠም።");
      });
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  }

  function clearRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setBlob(null);
    setSeconds(0);
  }

  async function saveSample() {
    if (!name.trim() || !transcript.trim() || !blob || !consent) {
      setMessage("ስም፣ የተነበበው ጽሑፍ፣ የድምፅ ቅጂና ፈቃድ ያስፈልጋሉ።");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createSupabaseClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("መጀመሪያ ወደ መለያህ ግባ።");

      let profileId: string;

      const { data: existing, error: lookupError } = await supabase
        .from("voice_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        profileId = existing.id;

        const { error } = await supabase
          .from("voice_profiles")
          .update({
            display_name: name.trim(),
            consent_to_voice_cloning: true,
            consent_at: new Date().toISOString(),
            allow_public_use: publicUse,
          })
          .eq("id", profileId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("voice_profiles")
          .insert({
            user_id: user.id,
            display_name: name.trim(),
            consent_to_voice_cloning: true,
            consent_at: new Date().toISOString(),
            allow_public_use: publicUse,
          })
          .select("id")
          .single();

        if (error) throw error;
        profileId = data.id;
      }

      const extension = blob.type.includes("mp4") ? "m4a" : "webm";
      const filePath = `${user.id}/${profileId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("voice-training-samples")
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: sampleError } = await supabase
        .from("voice_training_samples")
        .insert({
          voice_profile_id: profileId,
          user_id: user.id,
          transcript: transcript.trim(),
          audio_path: filePath,
          duration_seconds: seconds,
        });

      if (sampleError) {
        await supabase.storage
          .from("voice-training-samples")
          .remove([filePath]);
        throw sampleError;
      }

      setMessage("የድምፅ ናሙናህ ተልኳል። ለማረጋገጥ ይጠብቃል።");
      setTranscript("");
      clearRecording();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ድምፅ መላክ አልተቻለም።"
      );
    } finally {
      setLoading(false);
    }
  }

  const time = `${Math.floor(seconds / 60)
    .toString().padStart(2, "0")}:${(seconds % 60)
    .toString().padStart(2, "0")}`;

  return (
    <section className="space-y-5 rounded-2xl bg-white p-5 shadow">
      <div>
        <label className="mb-2 block font-bold">የድምፅ ባለቤቱ ስም</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border p-3"
          placeholder="ስምህን አስገባ"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">
          የምትናገረውን ትክክለኛ ጽሑፍ አስገባ
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={5}
          maxLength={1000}
          className="w-full rounded-xl border p-3 leading-8"
          placeholder="ለምሳሌ፦ ዛሬ ጥሩ ቀን ነው።"
        />
      </div>

      <div className="rounded-xl bg-teal-50 p-4 text-center">
        <p className="text-3xl font-bold">{time}</p>
        <p className="text-sm text-gray-600">
          {recording ? "በመቅዳት ላይ..." : "የቅጂ ጊዜ"}
        </p>
      </div>

      {!recording ? (
        <button
          onClick={startRecording}
          disabled={loading}
          className="w-full rounded-xl bg-red-600 p-4 font-bold text-white"
        >
          ● የድምፅ ቅጂ ጀምር
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="w-full rounded-xl bg-gray-800 p-4 font-bold text-white"
        >
          ■ ቅጂውን አቁም
        </button>
      )}

      {audioUrl && (
        <div className="space-y-3 rounded-xl bg-gray-50 p-3">
          <audio controls src={audioUrl} className="w-full" />
          <button
            onClick={clearRecording}
            className="w-full rounded-xl border p-3"
          >
            ቅጂውን ሰርዝ
          </button>
        </div>
      )}

      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          ይህ የራሴ ድምፅ ነው። ድምፄ ለAI ስልጠናና የድምፅ
          ማባዛት እንዲውል ፈቃዴን እሰጣለሁ።
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={publicUse}
          onChange={(e) => setPublicUse(e.target.checked)}
          className="mt-1"
        />
        <span>
          የተማረው ድምፄ ለሌሎች ተጠቃሚዎች እንዲታይና
          እንዲመረጥ እፈቅዳለሁ።
        </span>
      </label>

      <button
        onClick={saveSample}
        disabled={loading || recording || !blob}
        className="w-full rounded-xl bg-teal-700 p-4 font-bold text-white disabled:opacity-50"
      >
        {loading ? "በመላክ ላይ..." : "የድምፅ ናሙናውን ላክ"}
      </button>

      {message && (
        <p className="break-words rounded-lg bg-gray-100 p-3 text-center text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
