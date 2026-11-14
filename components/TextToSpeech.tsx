
"use client";

import { useState } from "react";

const voices = [
  { id: "am-hamen", name: "ሀመን — ሴት ድምፅ" },
  { id: "am-yohanes-calm", name: "ዮሐንስ — ወንድ ድምፅ" },
  { id: "am-tesfa", name: "ተስፋ — ወንድ ድምፅ" },
  { id: "am-muaz", name: "ሙአዝ — ወንድ ድምፅ" },
  { id: "am-roba", name: "ሮባ — ወንድ ድምፅ" },
  { id: "am-nejat", name: "ነጃት — ሴት ድምፅ" },
];

export default function TextToSpeech() {
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("am-hamen");
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generateSpeech() {
    if (!text.trim()) {
      setMessage("እባክህ በአማርኛ ጽሑፍ አስገባ።");
      return;
    }

    setLoading(true);
    setMessage("");
    setAudioUrl("");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, voiceId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ድምፅ ማመንጨት አልተሳካም።");
      }

      setAudioUrl(result.audioUrl);
      setMessage("ድምፁ ተዘጋጅቷል። አሁን ማዳመጥ ትችላለህ።");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "ስህተት ተፈጥሯል። እንደገና ሞክር።"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl bg-white p-5 shadow">
      <div>
        <label
          htmlFor="amharic-text"
          className="mb-2 block font-bold text-gray-800"
        >
          የአማርኛ ጽሑፍህን እዚህ አስገባ
        </label>

        <textarea
          id="amharic-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={3000}
          rows={7}
          placeholder="ለምሳሌ፦ ሰላም፣ እንደምን አላችሁ? ወደ አማርኛ ድምፅ ማዕከላችን እንኳን በደህና መጣችሁ።"
          className="w-full rounded-xl border border-gray-300 p-4 leading-8 outline-none focus:border-teal-700"
        />

        <p className="mt-1 text-right text-sm text-gray-500">
          {text.length}/3000
        </p>
      </div>

      <div>
        <label
          htmlFor="voice"
          className="mb-2 block font-bold text-gray-800"
        >
          የድምፅ አይነት ምረጥ
        </label>

        <select
          id="voice"
          value={voiceId}
          onChange={(event) => setVoiceId(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white p-4"
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={generateSpeech}
        disabled={loading || !text.trim()}
        className="w-full rounded-xl bg-teal-700 px-5 py-4 font-bold text-white disabled:opacity-50"
      >
        {loading ? "ድምፅ በማዘጋጀት ላይ..." : "🔊 ወደ ድምፅ ቀይር"}
      </button>

      {message && (
        <p className="break-words rounded-lg bg-gray-100 p-3 text-center text-sm">
          {message}
        </p>
      )}

      {audioUrl && (
        <div className="space-y-3 rounded-xl bg-teal-50 p-4">
          <h2 className="font-bold text-teal-900">
            የተዘጋጀው ድምፅ
          </h2>

          <audio controls src={audioUrl} className="w-full">
            አሳሽህ የድምፅ ማጫወቻን አይደግፍም።
          </audio>

          <a
            href={audioUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-teal-700 px-4 py-3 text-center font-bold text-teal-800"
          >
            የድምፅ ፋይሉን ክፈት / አውርድ
          </a>
        </div>
      )}
    </section>
  );
}
