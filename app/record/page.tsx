
import AudioRecorder from "@/components/AudioRecorder";
import Link from "next/link";

export default function RecordPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-teal-800 underline">
          ← ወደ መነሻ ገጽ
        </Link>

        <header className="my-6 text-center">
          <p className="mb-2 text-sm font-semibold tracking-wide text-teal-700">
            AMHARIC VOICE COMMUNITY
          </p>
          <h1 className="text-2xl font-bold text-teal-900">
            የአማርኛ ድምፅ መዝገብ
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            የተሰጠህን አረፍተ ነገር በግልጽ አንብብ፣ ድምፅህን ቅዳና ላክ።
            ሌሎች ተጠቃሚዎች ከገመገሙት በኋላ ነጥብ ይመዘገባል።
          </p>
        </header>

        <AudioRecorder />
      </div>
    </main>
  );
}
