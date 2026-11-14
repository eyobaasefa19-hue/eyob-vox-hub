
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_VOICES = [
  "am-hamen",
  "am-yohanes-calm",
  "am-tesfa",
  "am-muaz",
  "am-roba",
  "am-nejat",
];

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const addisApiKey = process.env.ADDIS_API_KEY;

    if (!supabaseUrl || !supabaseKey || !addisApiKey) {
      return NextResponse.json(
        { error: "የአገልግሎት ቅንብሮች አልተሟሉም።" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Cookie updates may be unavailable in this context.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "መጀመሪያ ወደ መለያህ ግባ።" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voiceId =
      typeof body.voiceId === "string" ? body.voiceId : "am-hamen";

    if (!text) {
      return NextResponse.json(
        { error: "እባክህ የአማርኛ ጽሑፍ አስገባ።" },
        { status: 400 }
      );
    }

    if (text.length > 3000) {
      return NextResponse.json(
        { error: "ጽሑፉ ከ3000 ቁምፊዎች መብለጥ የለበትም።" },
        { status: 400 }
      );
    }

    if (!ALLOWED_VOICES.includes(voiceId)) {
      return NextResponse.json(
        { error: "የተመረጠው ድምፅ አይደገፍም።" },
        { status: 400 }
      );
    }

    const providerResponse = await fetch(
      "https://api.addisassistant.com/api/v1/voice/generations",
      {
        method: "POST",
        headers: {
          "x-api-key": addisApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          language: "am",
          output_format: "mp3_44100",
          client_request_id: crypto.randomUUID(),
        }),
        cache: "no-store",
      }
    );

    const result = await providerResponse.json();

    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          error:
            result?.error?.message ||
            result?.message ||
            "ድምፅ ማመንጨት አልተሳካም።",
        },
        { status: providerResponse.status }
      );
    }

    const audioUrl = result?.data?.audio_url;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "የድምፅ ፋይሉ አልተገኘም።" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      audioUrl,
      clipId: result?.data?.id ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "የድምፅ ማመንጫ ጥያቄው አልተሳካም። እንደገና ሞክር።" },
      { status: 500 }
    );
  }
}
