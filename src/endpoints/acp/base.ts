import { z } from "zod";
import { productCatalog, type Product } from "../../data/catalog";

export const orderItemSchema = z.object({
        product_id: z.string(),
        quantity: z.number().int().min(1),
});

export const bundleSchema = z.object({
        bundle_id: z.string().min(3).optional(),
        product_ids: z.array(z.string()).min(2),
        label: z.string().min(3).optional(),
});

export const customerSchema = z.object({
        name: z.string().min(1),
        contact: z.string().min(3),
        country: z.string().min(2),
});

export const checkoutRequestSchema = z.object({
        customer: customerSchema,
        items: z.array(orderItemSchema).min(1),
        bundles: z.array(bundleSchema).optional(),
        payment_currency: z.enum(["USD", "QCN", "HALAL_STABLE"]).optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const founderRoyaltyPercent = 0.1;

export const findProduct = (id: string): Product | undefined =>
        productCatalog.find((product) => product.id === id);

export const ensureShariaCompliance = (products: Product[]) => {
        const violating = products.find(
                (product) =>
                        !product.sharia_constraints.riba_free ||
                        !product.sharia_constraints.gharar_free ||
                        !product.sharia_constraints.haram_excluded,
        );

        if (violating) {
                throw new Error(`Product ${violating.id} failed Sharia compliance checks.`);
        }
};

export const computeLineTotals = (items: CheckoutRequest["items"], currency?: string) => {
        const enriched = items.map((item) => {
                const product = findProduct(item.product_id);
                if (!product) {
                        throw new Error(`Unknown product: ${item.product_id}`);
                }
                if (currency && product.currency !== currency) {
                        throw new Error(
                                `Currency mismatch for ${product.id}: expected ${currency}, found ${product.currency}`,
                        );
                }

                return {
                        product,
                        quantity: item.quantity,
                        line_total: Number((product.unit_price * item.quantity).toFixed(2)),
                };
        });

        ensureShariaCompliance(enriched.map((entry) => entry.product));

        return enriched;
};

export const applyBundleDiscount = (
        items: ReturnType<typeof computeLineTotals>,
        bundles?: CheckoutRequest["bundles"],
) => {
        if (!bundles || bundles.length === 0) {
                return { bundledTotal: items.reduce((sum, item) => sum + item.line_total, 0), breakdown: [] as string[] };
        }

        const breakdown: string[] = [];
        let total = items.reduce((sum, item) => sum + item.line_total, 0);

        bundles.forEach((bundle) => {
                const matchedProducts = items.filter((line) => bundle.product_ids.includes(line.product.id));
                if (matchedProducts.length === bundle.product_ids.length) {
                        const bundleValue = matchedProducts.reduce((sum, line) => sum + line.line_total, 0);
                        const discount = Number((bundleValue * 0.05).toFixed(2));
                        total = Number((total - discount).toFixed(2));
                        breakdown.push(
                                `${bundle.label || bundle.bundle_id || "bundle"}: 5% halal bundle concession applied (-${discount})`,
                        );
                }
        });

        return { bundledTotal: total, breakdown };
};

export const applyFounderRoyalty = (subtotal: number) => {
        const royalty = Number((subtotal * founderRoyaltyPercent).toFixed(2));
        return {
                royalty,
                net_revenue: Number((subtotal - royalty).toFixed(2)),
        };
};

export const buildSettlementInstruction = (total: number, currency: string) => ({
        scheme: "quranchain" as const,
        amount: total,
        currency,
        requires_private_key: false,
        ledger_memo: "ACP->DarCommerce orchestrated payment; ACP does not custody keys.",
});

export const routeFulfillment = (products: Product[]) =>
        products.map((product) => ({
                product_id: product.id,
                fulfillment_type: product.fulfillment_type,
                channel: product.fulfillment_type === "shipment" ? "OliveExpress" : "DarCommerce Gateway",
        }));
