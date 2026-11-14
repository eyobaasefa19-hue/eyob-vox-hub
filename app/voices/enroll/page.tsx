
import Link from "next/link";
import VoiceEnrollment from "@/components/VoiceEnrollment";

export default function VoiceEnrollPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-teal-800 underline">
          ← ወደ መነሻ ገጽ
        </Link>

        <header className="my-7 text-center">
          <div className="mb-3 text-5xl">🎙️</div>
          <h1 className="text-2xl font-bold text-teal-800">
            የራሴን ድምፅ ለAI አስተምር
          </h1>
          <p className="mt-3 leading-8 text-gray-600">
            ጽሑፍ አስገባ፣ በድምፅ አንብበው፣ ቅጂውን ለAI
            ስልጠና ላክ። ብዙ የተለያዩ የአማርኛ ናሙናዎችን
            በመላክ የድምፅህን መረጃ ማበልጸግ ትችላለህ።
          </p>
        </header>

        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          እባክህ የራስህን ድምፅ ብቻ ቅረጽ። የሌላ ሰው
          ድምፅ ከሆነ በግልጽ ፈቃዱ ብቻ መጠቀም ይቻላል።
          የተነበበው ጽሑፍ ከተቀረጸው ድምፅ ጋር ትክክል
          መመሳሰል አለበት።
        </div>

        <VoiceEnrollment />
      </div>
    </main>
  );
}
