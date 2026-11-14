
import Link from "next/link";
import TextToSpeech from "@/components/TextToSpeech";

export default function TextToSpeechPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-teal-800 underline">
          ← ወደ መነሻ ገጽ
        </Link>

        <div className="my-7 text-center">
          <div className="mb-3 text-5xl">🗣️</div>
          <h1 className="text-2xl font-bold text-teal-800">
            አማርኛ AI Text-to-Speech
          </h1>
          <p className="mt-3 text-gray-600">
            ጽሑፍህን አስገባ፤ AI ወደ አማርኛ ድምፅ ይቀይርልሃል።
          </p>
        </div>

        <TextToSpeech />

        <p className="mt-6 text-center text-sm text-gray-500">
          የድምፅ ማመንጫው በAI አገልግሎት ይሰራል።
        </p>
      </div>
    </main>
  );
}
