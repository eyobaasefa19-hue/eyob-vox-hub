
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createSupabaseClient();

      const result = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

      if (result.error) throw result.error;

      if (isSignup && !result.data.session) {
        setMessage("መለያህ ተፈጥሯል። ኢሜይልህን አረጋግጥ።");
      } else {
        router.push("/record");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "ስህተት ተፈጥሯል።"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-12">
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-center text-2xl font-bold text-teal-800">
          {isSignup ? "አዲስ መለያ ፍጠር" : "ወደ መለያህ ግባ"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block">ኢሜይል</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border p-3"
              placeholder="name@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block">የይለፍ ቃል</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border p-3"
              placeholder="ቢያንስ 6 ፊደሎች"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 p-3 font-bold text-white"
          >
            {loading ? "በመጫን ላይ..." : isSignup ? "ተመዝገብ" : "ግባ"}
          </button>
        </form>

        {message && (
          <p className="mt-4 break-words text-center text-sm text-red-700">
            {message}
          </p>
        )}

        <button
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
          }}
          className="mt-6 w-full text-center text-teal-800 underline"
        >
          {isSignup
            ? "መለያ አለኝ፤ ወደ መግቢያ ተመለስ"
            : "አዲስ መለያ መፍጠር እፈልጋለሁ"}
        </button>
      </section>
    </main>
  );
}
