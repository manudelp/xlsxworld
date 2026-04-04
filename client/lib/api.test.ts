/** @jest-environment node */

const fetchMock = jest.fn();

async function loadApi() {
  jest.resetModules();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = {
    location: {
      origin: "http://localhost:3000",
      pathname: "/tools",
      search: "?tab=1",
      assign: jest.fn(),
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = fetchMock;

  return import("@/lib/api");
}

describe("api.auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;
  });

  it("retries once after 401 when refresh succeeds", async () => {
    const { api } = await loadApi();

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Unauthorized" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const payload = await api.auth.get<{ ok: boolean }>("/api/secure");

    expect(payload.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/api/auth/refresh");
  });

  it("throws a clean error when refresh fails", async () => {
    const { api } = await loadApi();

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Unauthorized" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(api.auth.get("/api/secure")).rejects.toThrow("Unauthorized");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((global as any).window.location.assign).toHaveBeenCalledTimes(1);
  });
});
