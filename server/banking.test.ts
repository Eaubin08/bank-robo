import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { processTransaction } from "./bankingEngine";
import { SCENARIOS, getRandomScenario, getScenarioByName } from "./scenarios";

// Create a mock context for testing
function createMockContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Banking Scenarios", () => {
  it("should have exactly 23 scenarios", () => {
    expect(SCENARIOS).toHaveLength(23);
  });

  it("should have 19 AUTORISER scenarios", () => {
    const autoriserCount = SCENARIOS.filter((s) => s.expectedDecision === "AUTORISER").length;
    expect(autoriserCount).toBe(19);
  });

  it("should have 3 ANALYSER scenarios", () => {
    const analyserCount = SCENARIOS.filter((s) => s.expectedDecision === "ANALYSER").length;
    expect(analyserCount).toBe(3);
  });

  it("should have 1 BLOQUER scenario", () => {
    const bloquerCount = SCENARIOS.filter((s) => s.expectedDecision === "BLOQUER").length;
    expect(bloquerCount).toBe(1);
  });

  it("should return a random scenario", () => {
    const scenario = getRandomScenario();
    expect(scenario).toBeDefined();
    expect(SCENARIOS).toContain(scenario);
  });

  it("should find scenario by name", () => {
    const scenario = getScenarioByName("Client-Premium");
    expect(scenario).toBeDefined();
    expect(scenario?.name).toBe("Client-Premium");
    expect(scenario?.expectedDecision).toBe("AUTORISER");
  });

  it("should return undefined for non-existent scenario", () => {
    const scenario = getScenarioByName("Non-Existent-Scenario");
    expect(scenario).toBeUndefined();
  });
});

describe("Banking Engine", () => {
  it("should process a transaction and return valid result", async () => {
    const scenario = getScenarioByName("Client-Premium")!;
    const result = await processTransaction(scenario);

    expect(result).toBeDefined();
    expect(result.decision).toMatch(/AUTORISER|ANALYSER|BLOQUER/);
    expect(result.reason).toBeTruthy();
    expect(result.geminiAnalysis).toBeTruthy();
    expect(result.metrics).toBeDefined();
    expect(result.ontologicalTests).toBeDefined();
    expect(result.roiContribution).toBeGreaterThanOrEqual(0);
  });

  it("should calculate metrics correctly", async () => {
    const scenario = getScenarioByName("Client-Premium")!;
    const result = await processTransaction(scenario);

    expect(result.metrics.ir).toBeGreaterThanOrEqual(0);
    expect(result.metrics.ir).toBeLessThanOrEqual(1);
    expect(result.metrics.ciz).toBeGreaterThanOrEqual(0);
    expect(result.metrics.ciz).toBeLessThanOrEqual(1);
    expect(result.metrics.dts).toBeGreaterThanOrEqual(0);
    expect(result.metrics.dts).toBeLessThanOrEqual(1);
    expect(result.metrics.tsg).toBeGreaterThanOrEqual(0);
    expect(result.metrics.tsg).toBeLessThanOrEqual(1);
  });

  it("should calculate ontological tests with ~96% precision", async () => {
    const scenario = getScenarioByName("Client-Premium")!;
    const result = await processTransaction(scenario);

    const tests = Object.values(result.ontologicalTests);
    const avgScore = tests.reduce((acc, val) => acc + val, 0) / tests.length;

    // Average should be around 0.96 ± 0.05
    expect(avgScore).toBeGreaterThan(0.91);
    expect(avgScore).toBeLessThan(1.0);
  });

  it("should make AUTORISER decision for low-risk scenario", async () => {
    const scenario = getScenarioByName("Client-Premium")!;
    const result = await processTransaction(scenario);

    // Client-Premium should be AUTORISER
    expect(result.decision).toBe("AUTORISER");
    expect(result.roiContribution).toBeGreaterThan(0);
  });

  it("should make BLOQUER decision for high-risk scenario", async () => {
    const scenario = getScenarioByName("Transaction-Suspecte")!;
    const result = await processTransaction(scenario);

    // Transaction-Suspecte should be BLOQUER
    expect(result.decision).toBe("BLOQUER");
    expect(result.roiContribution).toBe(0);
  });
});

describe("Banking tRPC API", () => {
  it("should process a transaction via tRPC", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.banking.processTransaction({});

    expect(result).toBeDefined();
    expect(result.scenario).toBeDefined();
    expect(result.decision).toMatch(/AUTORISER|ANALYSER|BLOQUER/);
    expect(result.reason).toBeTruthy();
    expect(result.geminiAnalysis).toBeTruthy();
  });

  it("should get all scenarios via tRPC", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const scenarios = await caller.banking.getScenarios();

    expect(scenarios).toHaveLength(23);
    expect(scenarios[0]).toHaveProperty("name");
    expect(scenarios[0]).toHaveProperty("expectedDecision");
    expect(scenarios[0]).toHaveProperty("description");
  });

  it("should get stats via tRPC", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.banking.getStats();

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("totalTransactions");
    expect(stats).toHaveProperty("totalROI");
    expect(stats).toHaveProperty("authorizeCount");
    expect(stats).toHaveProperty("analyzeCount");
    expect(stats).toHaveProperty("blockCount");
    expect(stats).toHaveProperty("avgMetrics");
  });

  it("should get recent transactions via tRPC", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const transactions = await caller.banking.getRecentTransactions({ limit: 10 });

    expect(Array.isArray(transactions)).toBe(true);
  });
});

describe("Banking Decision Distribution", () => {
  it("should maintain ~83% AUTORISER, ~4% ANALYSER, ~13% BLOQUER distribution", async () => {
    const results = {
      AUTORISER: 0,
      ANALYSER: 0,
      BLOQUER: 0,
    };

    // Run 100 random transactions
    for (let i = 0; i < 100; i++) {
      const scenario = getRandomScenario();
      const result = await processTransaction(scenario);
      results[result.decision]++;
    }

    const total = results.AUTORISER + results.ANALYSER + results.BLOQUER;
    const autoriserPct = (results.AUTORISER / total) * 100;
    const analyserPct = (results.ANALYSER / total) * 100;
    const bloquerPct = (results.BLOQUER / total) * 100;

    // Allow ±10% variance
    expect(autoriserPct).toBeGreaterThan(73);
    expect(autoriserPct).toBeLessThan(93);
    expect(analyserPct).toBeGreaterThan(0);
    expect(analyserPct).toBeLessThan(14);
    expect(bloquerPct).toBeGreaterThan(3);
    expect(bloquerPct).toBeLessThan(23);
  }, 120000); // 2 minutes timeout for 100 transactions
});
