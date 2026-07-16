import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyStopsChanged } from "./spitwise";

describe("notifyStopsChanged", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SPITWISE_URL", "http://spitwise.test");
    vi.stubEnv("TRIP_SHARED_API_KEY", "k");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("posts stops.changed to the sync-hook with the API key", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await notifyStopsChanged();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://spitwise.test/api/v1/andiamo/sync-hook");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Api-Key"]).toBe("k");
    expect(JSON.parse(init.body).event).toBe("stops.changed");
  });

  it("retries once and never throws when Spitwise is down", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(notifyStopsChanged()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries after a non-ok response", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    await notifyStopsChanged();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is a no-op without env config", async () => {
    vi.stubEnv("SPITWISE_URL", "");
    await notifyStopsChanged();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
