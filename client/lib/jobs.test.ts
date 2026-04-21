import { deleteJob, fetchJobs, getJobDownloadUrl } from "./jobs";

jest.mock("@/lib/api", () => ({
  api: {
    auth: {
      get: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { api } = jest.requireMock("@/lib/api") as {
  api: { auth: { get: jest.Mock; delete: jest.Mock } };
};

describe("jobs lib", () => {
  beforeEach(() => {
    api.auth.get.mockReset();
    api.auth.delete.mockReset();
  });

  it("fetchJobs forwards filters as query params", async () => {
    api.auth.get.mockResolvedValue({ items: [] });

    await fetchJobs({ limit: 25, offset: 50, search: "trim", success: true });

    expect(api.auth.get).toHaveBeenCalledWith("/api/v1/me/jobs", {
      limit: 25,
      offset: 50,
      search: "trim",
      success: true,
    });
  });

  it("fetchJobs drops undefined filters and defaults", async () => {
    api.auth.get.mockResolvedValue({ items: [] });

    await fetchJobs({});

    expect(api.auth.get).toHaveBeenCalledWith("/api/v1/me/jobs", {});
  });

  it("fetchJobs omits empty search strings", async () => {
    api.auth.get.mockResolvedValue({ items: [] });

    await fetchJobs({ search: "   " });

    expect(api.auth.get).toHaveBeenCalledWith("/api/v1/me/jobs", {});
  });

  it("getJobDownloadUrl hits the per-job endpoint", async () => {
    const mockBuffer = new ArrayBuffer(8);
    api.auth.get.mockResolvedValue(mockBuffer);

    const result = await getJobDownloadUrl("abc");

    expect(api.auth.get).toHaveBeenCalledWith("/api/v1/me/jobs/abc/download");
    expect(result).toBe(mockBuffer);
  });

  it("deleteJob calls DELETE", async () => {
    api.auth.delete.mockResolvedValue(undefined);

    await deleteJob("abc");

    expect(api.auth.delete).toHaveBeenCalledWith("/api/v1/me/jobs/abc");
  });
});
