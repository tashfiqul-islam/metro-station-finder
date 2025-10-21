import { NextResponse } from "next/server";
import { glimpse } from "@/app/_components/shared/kibo-ui/glimpse/server";

export async function GET() {
  try {
    const data = await glimpse("https://github.com/tashfiqul-islam/metro-station-finder");

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // Silently handle errors and return fallback data

    // Return fallback data
    return NextResponse.json({
      title: "Metro Station Finder",
      description:
        "A modern metro station finder app for Dhaka with real-time fare calculation and Google Maps integration. Built with Next.js, TypeScript, and Tailwind CSS.",
      image: null,
    });
  }
}
