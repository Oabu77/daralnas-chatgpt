import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";

export class TollRevenueEndpoint extends OpenAPIRoute {
        public schema = {
                tags: ["Blockchain"],
                summary: "Retrieve blockchain toll revenue payout addresses",
                description:
                        "Returns the configured payout addresses for Bitcoin and USDC so downstream systems know where to send toll revenue.",
                responses: {
                        "200": {
                                description: "The currently configured payout addresses.",
                                ...contentJson(
                                        z.object({
                                                success: z.literal(true),
                                                result: z.object({
                                                        btc: z.object({
                                                                network: z.literal("bitcoin"),
                                                                symbol: z.literal("BTC"),
                                                                address: z.string(),
                                                        }),
                                                        usdc: z.object({
                                                                network: z.string(),
                                                                symbol: z.literal("USDC"),
                                                                address: z.string(),
                                                        }),
                                                }),
                                        }),
                                ),
                        },
                        "500": {
                                description: "Addresses are not configured in the environment.",
                                ...contentJson(
                                        z.object({
                                                success: z.literal(false),
                                                errors: z.array(
                                                        z.object({
                                                                code: z.number(),
                                                                message: z.string(),
                                                        }),
                                                ),
                                        }),
                                ),
                        },
                },
        };

        public async handle(c: AppContext) {
                const btcAddress = c.env.BTC_REVENUE_ADDRESS;
                const usdcAddress = c.env.USDC_REVENUE_ADDRESS;

                if (!btcAddress || !usdcAddress) {
                        return c.json(
                                {
                                        success: false,
                                        errors: [
                                                {
                                                        code: 9100,
                                                        message: "Revenue addresses are not configured",
                                                },
                                        ],
                                },
                                500,
                        );
                }

                return {
                        success: true,
                        result: {
                                btc: { network: "bitcoin", symbol: "BTC", address: btcAddress },
                                usdc: { network: "ethereum", symbol: "USDC", address: usdcAddress },
                        },
                };
        }
}
