"use client";

import { useCallback, useEffect, useState } from "react";

type Recording = {
  id: string;
  sentence: string;
  category: string;
  audioUrl: string | null;
  createdAt: string;
};

export default function ValidatePage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/recordings/review-queue", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ቅጂዎችን ማምጣት አልተቻለም።");
      }

      setRecordings(result.recordings ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ስህተት ተፈጥሯል።"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecordings();
  }, [loadRecordings]);

  async function review(
    recordingId: string,
    decision: "approved" | "rejected"
  ) {
    setBusyId(recordingId);
    setMessage("");

    try {
      const response = await fetch("/api/recordings/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId, decision }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ውሳኔውን ማስቀመጥ አልተቻለም።");
      }

      setRecordings((current) =>
        current.filter((item) => item.id !== recordingId)
      );

      setMessage(
        decision === "approved"
          ? "ቅጂው ጸድቋል። ለባለቤቱ 10 ነጥብ ተመዝግቧል።"
          : "ቅጂው ተከልክሏል። ነጥብ አልተሰጠም።"
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ስህተት ተፈጥሯል።"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-cyan-400">
            AMHARIC VOICE COMMUNITY
          </p>
          <h1 className="text-3xl font-bold">የድምፅ ማረጋገጫ</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ድምፁን አዳምጥና ከተጻፈው አረፍተ ነገር ጋር አወዳድር።
            ትክክል ከሆነ አጽድቅ፤ ካልሆነ ከልክል።
          </p>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
            {message}
          </div>
        )}

        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold">የሚጠብቁ ቅጂዎች</h2>
          <button
            onClick={() => void loadRecordings()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          >
            እንደገና ጫን
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-slate-400">
            በመጫን ላይ...
          </p>
        ) : recordings.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-lg font-semibold">
              አሁን የሚጠብቅ ቅጂ የለም።
            </p>
            <p className="mt-2 text-sm text-slate-400">
              አዲስ ቅጂ ሲመጣ እዚህ ይታያል።
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                {item.category && (
                  <p className="mb-2 text-xs text-cyan-400">
                    {item.category}
                  </p>
                )}

                <p className="mb-5 text-lg font-medium leading-8">
                  {item.sentence || "የአረፍተ ነገሩ ጽሑፍ አልተገኘም።"}
                </p>

                {item.audioUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={item.audioUrl}
                    className="mb-5 w-full"
                  />
                ) : (
                  <p className="mb-5 text-sm text-amber-400">
                    የድምፅ ፋይሉ ሊከፈት አልቻለም።
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={busyId !== null || !item.audioUrl}
                    onClick={() => review(item.id, "approved")}
                    className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {busyId === item.id ? "በመላክ ላይ..." : "አጽድቅ"}
                  </button>

                  <button
                    disabled={busyId !== null}
                    onClick={() => review(item.id, "rejected")}
                    className="rounded-xl bg-rose-700 px-4 py-3 font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
                  >
                    {busyId === item.id ? "በመላክ ላይ..." : "ከልክል"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-slate-500">
          ቅጂውን የላከው ሰው ራሱን ማረጋገጥ አይችልም።
          በማጽደቅ ብቻ ለቅጂው ባለቤት 10 ነጥብ ይመዘገባል።
        </p>
      </div>
    </main>
  );
}
