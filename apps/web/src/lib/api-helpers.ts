import { NextResponse } from "next/server";

export function jsonError(
  error: string,
  code: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { error: { code, message: error } },
    { status }
  );
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
