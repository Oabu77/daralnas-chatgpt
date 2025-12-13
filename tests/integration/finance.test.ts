import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

const endpoint = "http://local.test/finance/transfer-intents";

describe("Finance Transfer Intent Integration Tests", () => {
        beforeEach(async () => {
                vi.clearAllMocks();
        });

        it("builds a revenue-first transfer intent with approvals and fees", async () => {
                const response = await SELF.fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                                purpose: "Vendor settlement for logistics milestone",
                                amount: 1000,
                                asset: "USDC",
                                destination: "0xapprovedwhitelist123",
                                chain: "QuranChain-L2",
                                authorization: "multisig",
                                expedite: true,
                                riskLevel: "high",
                                dailyLimitRemaining: 5000,
                        }),
                });

                const body = await response.json<{
                        success: boolean;
                        result: {
                                feeBreakdown: {
                                        founderRoyalty: number;
                                        platformFee: number;
                                        totalFees: number;
                                };
                                settlementPlan: { netAmountToDestination: number };
                                approval: { steps: string[] };
                                riskChecks: string[];
                        };
                }>();

                expect(response.status).toBe(200);
                expect(body.success).toBe(true);
                expect(body.result.feeBreakdown.founderRoyalty).toBe(100);
                expect(body.result.feeBreakdown.platformFee).toBeCloseTo(15, 2);
                expect(body.result.feeBreakdown.totalFees).toBeGreaterThan(115);
                expect(body.result.settlementPlan.netAmountToDestination).toBeCloseTo(1000 - body.result.feeBreakdown.totalFees);
                expect(body.result.approval.steps.length).toBeGreaterThan(0);
                expect(body.result.riskChecks.some((line) => line.toLowerCase().includes("dual approval"))).toBe(true);
        });
});
