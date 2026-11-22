import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "መጀመሪያ ይግቡ።" }, { status: 401 });
  }

  const { data: recordings, error } = await supabase
    .from("voice_recordings")
    .select("id, sentence_id, user_id, audio_url, status, created_at")
    .eq("status", "pending")
    .neq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const queue = await Promise.all(
    (recordings ?? []).map(async (recording) => {
      const { data: sentence } = await supabase
        .from("sentences")
        .select("text_content")
        .eq("id", recording.sentence_id)
        .maybeSingle();

      const { data: signedAudio } = await supabase.storage
        .from("voice-recordings")
        .createSignedUrl(recording.audio_url, 300);

      return {
        id: recording.id,
        sentence: sentence?.text_content ?? "",
        audioUrl: signedAudio?.signedUrl ?? null,
        createdAt: recording.created_at,
      };
    })
  );

  return NextResponse.json({ recordings: queue });
}
