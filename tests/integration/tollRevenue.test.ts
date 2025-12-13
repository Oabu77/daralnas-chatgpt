import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const BTC_ADDRESS = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
const USDC_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("Blockchain toll revenue endpoint", () => {
        it("returns configured payout addresses", async () => {
                const response = await SELF.fetch("http://local.test/blockchain/toll-revenue");
                const body = await response.json<{
                        success: boolean;
                        result: {
                                btc: { network: string; symbol: string; address: string };
                                usdc: { network: string; symbol: string; address: string };
                        };
                }>();

                expect(response.status).toBe(200);
                expect(body.success).toBe(true);
                expect(body.result.btc).toEqual({
                        network: "bitcoin",
                        symbol: "BTC",
                        address: BTC_ADDRESS,
                });
                expect(body.result.usdc).toEqual({
                        network: "ethereum",
                        symbol: "USDC",
                        address: USDC_ADDRESS,
                });
        });
});
