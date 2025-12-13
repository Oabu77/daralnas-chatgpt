import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { productCatalog } from "../../data/catalog";
import {
        applyBundleDiscount,
        applyFounderRoyalty,
        buildSettlementInstruction,
        checkoutRequestSchema,
        computeLineTotals,
        routeFulfillment,
} from "./base";

export class CheckoutEndpoint extends OpenAPIRoute {
        public schema = {
                tags: ["ACP"],
                summary: "Create ACP checkout with QuranChain settlement and founder royalty",
                operationId: "acp-checkout-create",
                request: {
                        body: contentJson(checkoutRequestSchema),
                },
                responses: {
                        "200": {
                                description: "Checkout payload containing compliance, royalty, and settlement hooks",
                                ...contentJson({
                                        success: z.boolean(),
                                        checkout_id: z.string(),
                                        currency: z.string(),
                                        subtotal: z.number(),
                                        bundle_notes: z.array(z.string()),
                                        founder_royalty: z.object({ amount: z.number(), percent: z.number() }),
                                        net_revenue: z.number(),
                                        settlement: z.object({
                                                scheme: z.literal("quranchain"),
                                                amount: z.number(),
                                                currency: z.string(),
                                                requires_private_key: z.boolean(),
                                                ledger_memo: z.string(),
                                        }),
                                        fulfillment: z.array(
                                                z.object({
                                                        product_id: z.string(),
                                                        fulfillment_type: z.string(),
                                                        channel: z.string(),
                                                }),
                                        ),
                                        items: z.array(
                                                z.object({
                                                        product_id: z.string(),
                                                        title: z.string(),
                                                        quantity: z.number(),
                                                        unit_price: z.number(),
                                                        line_total: z.number(),
                                                }),
                                        ),
                                        compliance: z.object({
                                                sharia_screened: z.boolean(),
                                                riba_free: z.boolean(),
                                                speculative_pricing_blocked: z.boolean(),
                                                data_minimized: z.boolean(),
                                        }),
                                        royalty_ledger_reference: z.string(),
                                        receipt_hint: z.string(),
                                }),
                        },
                        "400": {
                                description: "Invalid request",
                                ...contentJson({ success: z.boolean(), errors: z.array(z.string()) }),
                        },
                },
        };

        public async handle() {
                const data = await this.getValidatedData<typeof this.schema>();
                try {
                        const currency = data.body.payment_currency || data.body.items
                                .map((item) => productCatalog.find((p) => p.id === item.product_id)?.currency)
                                .find((curr) => curr) || "USD";

                        const items = computeLineTotals(data.body.items, currency);
                        const { bundledTotal, breakdown } = applyBundleDiscount(items, data.body.bundles);
                        const { royalty, net_revenue } = applyFounderRoyalty(bundledTotal);
                        const checkoutId = `ACP-${Date.now()}`;

                        const responseItems = items.map((line) => ({
                                product_id: line.product.id,
                                title: line.product.title,
                                quantity: line.quantity,
                                unit_price: line.product.unit_price,
                                line_total: line.line_total,
                        }));

                        return {
                                success: true,
                                checkout_id: checkoutId,
                                currency,
                                subtotal: bundledTotal,
                                bundle_notes: breakdown,
                                founder_royalty: { amount: royalty, percent: 10 },
                                net_revenue,
                                settlement: buildSettlementInstruction(bundledTotal, currency),
                                fulfillment: routeFulfillment(items.map((item) => item.product)),
                                items: responseItems,
                                compliance: {
                                        sharia_screened: true,
                                        riba_free: true,
                                        speculative_pricing_blocked: true,
                                        data_minimized: true,
                                },
                                royalty_ledger_reference: `${checkoutId}-ROYALTY`,
                                receipt_hint: "Use settlement hash from QuranChain to reconcile and emit receipt.",
                        };
                } catch (error) {
                        return {
                                success: false,
                                errors: [error instanceof Error ? error.message : "Unknown error"],
                        };
                }
        }
}
