
import AudioRecorder from "@/components/AudioRecorder";
import Link from "next/link";

export default function RecordPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-teal-800 underline">
          ← ወደ መነሻ ገጽ
        </Link>

        <h1 className="my-6 text-center text-2xl font-bold text-teal-800">
          የአማርኛ ድምፅ መቅጃ
        </h1>

        <AudioRecorder />
      </div>
    </main>
  );
}
