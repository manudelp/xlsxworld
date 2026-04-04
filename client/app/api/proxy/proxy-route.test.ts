/** @jest-environment node */

import { NextRequest } from "next/server";

import { GET } from "@/app/api/proxy/[...path]/route";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/constants";

describe("proxy route", () => {
  it("injects Authorization header from auth cookie", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new NextRequest("http://localhost:3000/api/proxy/auth/me", {
      method: "GET",
      headers: {
        cookie: `${AUTH_ACCESS_COOKIE}=token-123`,
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({ path: ["auth", "me"] }),
    });

    expect(response.status).toBe(200);
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer token-123");

    fetchMock.mockRestore();
  });
});
