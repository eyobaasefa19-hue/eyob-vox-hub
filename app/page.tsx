
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-12">
      <section className="mx-auto max-w-xl text-center">
        <div className="mb-6 text-5xl">🎙️</div>
        <h1 className="text-3xl font-bold text-teal-800">
          የአማርኛ ድምፅ ማሰባሰቢያ
        </h1>
        <p className="mt-5 text-lg leading-9 text-gray-700">
          የአማርኛ ቋንቋን ለቴክኖሎጂ ለማበልጸግ
          ድምፅህን አበርክት። አረፍተ ነገሮችን
          አንብብ፣ ድምፅህን ቅረጽ፣ ለአማርኛ
          የድምፅ መረጃ ማዕከል አስተዋጽኦ አድርግ።
        </p>

        <div className="mt-8 grid gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-teal-700 px-6 py-4 font-bold text-white"
          >
            ግባ / አዲስ መለያ ፍጠር
          </Link>
          <Link
            href="/record"
            className="rounded-xl border border-teal-700 px-6 py-4 font-bold text-teal-800"
          >
            ወደ ድምፅ መቅጃ ሂድ
          </Link>
        </div>
      </section>
    </main>
  );
}
