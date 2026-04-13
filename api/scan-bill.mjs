import { jsonResponse } from "./_backend.mjs";

export async function POST() {
  return jsonResponse(
    {
      error:
        "Bill upload is currently available in the Choose My Electric mobile app only. The website now supports ZIP-based estimates.",
    },
    410,
  );
}
