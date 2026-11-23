import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "መጀመሪያ ይግቡ።" }, { status: 401 });
  }

  let body: { recordingId?: string; decision?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "የተሳሳተ መረጃ ተልኳል።" },
      { status: 400 }
    );
  }

  if (
    !body.recordingId ||
    !["approved", "rejected"].includes(body.decision ?? "")
  ) {
    return NextResponse.json(
      { error: "የሚፈለገው መረጃ አልተሟላም።" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc(
    "review_community_recording",
    {
      p_recording_id: body.recordingId,
      p_decision: body.decision,
    }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
