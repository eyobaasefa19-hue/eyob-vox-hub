
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

type VoiceProfile = {
  id: string;
  display_name: string;
  status: string;
  created_at: string;
};

export default function VoicesPage() {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadVoices() {
      try {
        const supabase = createSupabaseClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          setMessage("የራስህን ድምፅ ለማየት መጀመሪያ ግባ።");
          return;
        }

        const { data, error } = await supabase
          .from("voice_profiles")
          .select("id, display_name, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setVoices(data ?? []);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "የድምፅ መረጃ መጫን አልተቻለም።"
        );
      } finally {
        setLoading(false);
      }
    }

    loadVoices();
  }, []);

  function statusLabel(status: string) {
    switch (status) {
      case "collecting":
        return "ናሙና በመሰብሰብ ላይ";
      case "ready":
        return "ለስልጠና ዝግጁ";
      case "training":
        return "በስልጠና ላይ";
      case "available":
        return "ለመጠቀም ዝግጁ";
      case "rejected":
        return "አልተፈቀደም";
      default:
        return "ያልታወቀ ሁኔታ";
    }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-teal-800 underline">
          ← ወደ መነሻ ገጽ
        </Link>

        <header className="my-7 text-center">
          <div className="mb-3 text-5xl">🎧</div>
          <h1 className="text-2xl font-bold text-teal-800">
            የድምፅ ማዕከል
          </h1>
          <p className="mt-3 text-gray-600">
            የተመዘገቡ ድምፆችንና የስልጠና ሁኔታን ተመልከት።
          </p>
        </header>

        <Link
          href="/voices/enroll"
          className="mb-6 block rounded-xl bg-teal-700 p-4 text-center font-bold text-white"
        >
          + አዲስ ድምፅ አስመዝግብ
        </Link>

        {loading && (
          <p className="py-8 text-center">በመጫን ላይ...</p>
        )}

        {!loading && voices.length === 0 && !message && (
          <div className="rounded-xl bg-gray-100 p-6 text-center">
            <p className="font-semibold">ገና ድምፅ አልተመዘገበም።</p>
            <p className="mt-2 text-sm text-gray-600">
              የመጀመሪያውን የድምፅ ናሙና ለመላክ ከላይ ያለውን ቁልፍ ተጠቀም።
            </p>
          </div>
        )}

        <div className="space-y-3">
          {voices.map((voice) => (
            <article
              key={voice.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900">
                    {voice.display_name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    የተመዘገበበት፦{" "}
                    {new Date(voice.created_at).toLocaleDateString("am-ET")}
                  </p>
                </div>

                <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
                  {statusLabel(voice.status)}
                </span>
              </div>
            </article>
          ))}
        </div>

        {message && (
          <p className="mt-5 rounded-lg bg-gray-100 p-3 text-center text-sm">
            {message}
          </p>
        )}

        <p className="mt-8 text-center text-xs leading-6 text-gray-500">
          የድምፅ ስልጠና ሁኔታው በሚቀጥለው የAI ማሰልጠኛ ደረጃ
          ይዘምናል።
        </p>
      </div>
    </main>
  );
}
