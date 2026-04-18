import { fetchUsage } from "./usage";

jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
  },
}));

const { api } = jest.requireMock("@/lib/api") as {
  api: { get: jest.Mock };
};

describe("usage lib", () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it("fetchUsage hits /api/v1/usage and returns the payload", async () => {
    api.get.mockResolvedValue({
      plan: "free",
      jobs_today: 17,
      jobs_today_limit: 200,
      jobs_percent: 8.5,
      max_upload_bytes: 26214400,
    });

    const usage = await fetchUsage();

    expect(api.get).toHaveBeenCalledWith("/api/v1/usage");
    expect(usage.plan).toBe("free");
    expect(usage.jobs_today).toBe(17);
    expect(usage.max_upload_bytes).toBe(26214400);
  });
});
