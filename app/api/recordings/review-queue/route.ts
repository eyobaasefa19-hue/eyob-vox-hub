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

  const { data, error } = await supabase
    .from("community_recordings")
    .select("id, sentence_id, user_id, audio_path, status, created_at")
    .eq("status", "pending")
    .neq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const recordings = await Promise.all(
    (data ?? []).map(async (recording) => {
      const [{ data: sentence }, { data: signedAudio }] = await Promise.all([
        supabase
          .from("community_sentences")
          .select("text_content, category")
          .eq("id", recording.sentence_id)
          .maybeSingle(),
        supabase.storage
          .from("community-recordings")
          .createSignedUrl(recording.audio_path, 300),
      ]);

      return {
        id: recording.id,
        sentence: sentence?.text_content ?? "",
        category: sentence?.category ?? "",
        audioUrl: signedAudio?.signedUrl ?? null,
        createdAt: recording.created_at,
      };
    })
  );

  return NextResponse.json({ recordings });
}
