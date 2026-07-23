import { NextResponse } from "next/server";
import { createCorsResponse } from "@/lib/cors";
import { createSuccessResponse, getRequestId } from "@/lib/error-handler";

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  
  // Health endpoint must not be rate-limited to prevent false negatives in Docker health checks

  return createCorsResponse(createSuccessResponse(
    { message: "Good!" },
    200,
    { requestId, message: "Health check successful" }
  ));
}