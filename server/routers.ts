import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Banking Decision Robot API
  banking: router({
    // Process a single transaction
    processTransaction: publicProcedure
      .input(
        z.object({
          scenarioName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { processTransaction } = await import("./bankingEngine");
        const { getRandomScenario, getScenarioByName } = await import("./scenarios");

        // Get scenario (random or by name)
        const scenario = input.scenarioName
          ? getScenarioByName(input.scenarioName)
          : getRandomScenario();

        if (!scenario) {
          throw new Error("Scenario not found");
        }

        // Process transaction
        const result = await processTransaction(scenario);

        // Save to database
        const db = await import("./db").then((m) => m.getDb());
        if (db) {
          const { transactions } = await import("../drizzle/schema");
          await db.insert(transactions).values({
            scenarioName: scenario.name,
            decision: result.decision,
            reason: result.reason,
            ir: result.metrics.ir.toFixed(2),
            ciz: result.metrics.ciz.toFixed(2),
            dts: result.metrics.dts.toFixed(2),
            tsg: result.metrics.tsg.toFixed(2),
            timeIsLaw: result.ontologicalTests.timeIsLaw.toFixed(2),
            absoluteHoldGate: result.ontologicalTests.absoluteHoldGate.toFixed(2),
            zeroToleranceFlag: result.ontologicalTests.zeroToleranceFlag.toFixed(2),
            irreversibilityIndex: result.ontologicalTests.irreversibilityIndex.toFixed(2),
            conflictZoneIsolation: result.ontologicalTests.conflictZoneIsolation.toFixed(2),
            decisionTimeSensitivity: result.ontologicalTests.decisionTimeSensitivity.toFixed(2),
            totalSystemGuard: result.ontologicalTests.totalSystemGuard.toFixed(2),
            negativeMemoryReflexes: result.ontologicalTests.negativeMemoryReflexes.toFixed(2),
            emergentBehaviorWatch: result.ontologicalTests.emergentBehaviorWatch.toFixed(2),
            roiContribution: result.roiContribution,
          });
        }

        return {
          scenario: {
            name: scenario.name,
            description: scenario.description,
            expectedDecision: scenario.expectedDecision,
          },
          ...result,
        };
      }),

    // Get all scenarios
    getScenarios: publicProcedure.query(async () => {
      const { SCENARIOS } = await import("./scenarios");
      return SCENARIOS.map((s) => ({
        name: s.name,
        expectedDecision: s.expectedDecision,
        description: s.description,
      }));
    }),

    // Get transaction statistics
    getStats: publicProcedure.query(async () => {
      const db = await import("./db").then((m) => m.getDb());
      if (!db) {
        return {
          totalTransactions: 0,
          totalROI: 0,
          authorizeCount: 0,
          analyzeCount: 0,
          blockCount: 0,
          avgMetrics: { ir: 0, ciz: 0, dts: 0, tsg: 0 },
        };
      }

      const { transactions } = await import("../drizzle/schema");
      const { sql, count, sum, avg } = await import("drizzle-orm");

      const allTransactions = await db.select().from(transactions);

      const totalTransactions = allTransactions.length;
      const totalROI = allTransactions.reduce((acc, t) => acc + t.roiContribution, 0);
      const authorizeCount = allTransactions.filter((t) => t.decision === "AUTORISER").length;
      const analyzeCount = allTransactions.filter((t) => t.decision === "ANALYSER").length;
      const blockCount = allTransactions.filter((t) => t.decision === "BLOQUER").length;

      const avgIR =
        allTransactions.reduce((acc, t) => acc + parseFloat(t.ir), 0) / (totalTransactions || 1);
      const avgCIZ =
        allTransactions.reduce((acc, t) => acc + parseFloat(t.ciz), 0) / (totalTransactions || 1);
      const avgDTS =
        allTransactions.reduce((acc, t) => acc + parseFloat(t.dts), 0) / (totalTransactions || 1);
      const avgTSG =
        allTransactions.reduce((acc, t) => acc + parseFloat(t.tsg), 0) / (totalTransactions || 1);

      return {
        totalTransactions,
        totalROI,
        authorizeCount,
        analyzeCount,
        blockCount,
        avgMetrics: {
          ir: avgIR,
          ciz: avgCIZ,
          dts: avgDTS,
          tsg: avgTSG,
        },
      };
    }),

    // Get recent transactions
    getRecentTransactions: publicProcedure
      .input(
        z.object({
          limit: z.number().default(50),
        })
      )
      .query(async ({ input }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) return [];

        const { transactions } = await import("../drizzle/schema");
        const { desc } = await import("drizzle-orm");

        return db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
