/** @jest-environment node */

import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/proxy/[...path]/route";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/constants";

describe("proxy route", () => {
  it("injects Authorization header from auth cookie for JSON responses", async () => {
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

  it("forwards binary responses with correct headers (XLSX file download)", async () => {
    // Mock binary file data
    const binaryData = new Uint8Array([
      0x50,
      0x4b,
      0x03,
      0x04,
      0x14,
      0x00,
      0x00,
      0x00,
      0x08,
      0x00, // ZIP/XLSX header
    ]);
    const mockReadableStream = {
      getReader: () => ({
        read: async () => ({ done: true, value: undefined }),
      }),
    };

    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(binaryData, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=export.xlsx",
          "Content-Encoding": "identity",
          "Content-Length": String(binaryData.length),
        },
      }),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/proxy/api/v1/tools/convert/csv-to-xlsx",
      {
        method: "POST",
        headers: {
          cookie: `${AUTH_ACCESS_COOKIE}=token-123`,
          "Content-Type": "multipart/form-data; boundary=----test",
        },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        path: ["api", "v1", "tools", "convert", "csv-to-xlsx"],
      }),
    });

    expect(response.status).toBe(200);

    // Verify headers are correctly forwarded
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      "attachment; filename=export.xlsx",
    );
    expect(response.headers.get("Content-Encoding")).toBe("identity");

    // Verify problematic headers are removed
    expect(response.headers.get("Transfer-Encoding")).toBeNull();
    expect(response.headers.get("Connection")).toBeNull();

    fetchMock.mockRestore();
  });

  it("does not forward problematic proxy headers", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: "test" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          Connection: "keep-alive",
          "Transfer-Encoding": "chunked",
          "Keep-Alive": "timeout=5",
        },
      }),
    );

    const request = new NextRequest("http://localhost:3000/api/proxy/test", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ path: ["test"] }),
    });

    expect(response.status).toBe(200);

    // Verify proxy-specific headers are filtered out
    expect(response.headers.get("Connection")).toBeNull();
    expect(response.headers.get("Transfer-Encoding")).toBeNull();
    expect(response.headers.get("Keep-Alive")).toBeNull();

    // Verify important headers are preserved
    expect(response.headers.get("Content-Type")).toBe("application/json");

    fetchMock.mockRestore();
  });
});
