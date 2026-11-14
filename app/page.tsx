
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-12">
      <section className="mx-auto max-w-xl text-center">
        <div className="mb-5 text-6xl">🇪🇹</div>

        <h1 className="text-3xl font-bold text-teal-800">
          የአማርኛ ድምፅ AI ማዕከል
        </h1>

        <p className="mt-5 text-lg leading-9 text-gray-700">
          የአማርኛ ቋንቋን በAI ቴክኖሎጂ ለማበልጸግ
          አብረን እንስራ። ጽሑፍን ወደ ድምፅ ቀይር፣
          የራስህን ድምፅ ቅረጽ፣ ለአማርኛ የድምፅ
          መረጃ ስብስብ አስተዋጽኦ አድርግ።
        </p>

        <div className="mt-8 grid gap-4">
          <Link
            href="/tts"
            className="rounded-xl bg-teal-700 px-6 py-4 font-bold text-white"
          >
            🗣️ ጽሑፍን ወደ AI ድምፅ ቀይር
          </Link>

          <Link
            href="/record"
            className="rounded-xl border border-teal-700 px-6 py-4 font-bold text-teal-800"
          >
            🎙️ የራሴን ድምፅ ቅረጽ
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-gray-300 px-6 py-4 font-bold text-gray-700"
          >
            ግባ / አዲስ መለያ ፍጠር
          </Link>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Amharic Voice Corpus & AI Speech Hub
        </p>
      </section>
    </main>
  );
}
