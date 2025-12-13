import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { productCatalog } from "../../data/catalog";

export class CatalogEndpoint extends OpenAPIRoute {
        public schema = {
                tags: ["ACP"],
                summary: "List Dar Al-Nas catalog for ACP discovery",
                operationId: "acp-catalog-list",
                responses: {
                        "200": {
                                description: "Full ACP-safe catalog with Sharia controls",
                                ...contentJson({
                                        success: z.boolean(),
                                        products: z.array(
                                                z.object({
                                                        id: z.string(),
                                                        title: z.string(),
                                                        description: z.string(),
                                                        category: z.string(),
                                                        price_model: z.string(),
                                                        currency: z.string(),
                                                        unit_price: z.number(),
                                                        billing_period: z.string().optional(),
                                                        sharia_constraints: z.object({
                                                                riba_free: z.boolean(),
                                                                gharar_free: z.boolean(),
                                                                haram_excluded: z.boolean(),
                                                        }),
                                                        fulfillment_type: z.string(),
                                                        settlement: z.literal("quranchain"),
                                                        vendor: z.literal("Dar Al-Nas Member Entity"),
                                                }),
                                        ),
                                }),
                        },
                },
        };

        public async handle() {
                return {
                        success: true,
                        products: productCatalog,
                };
        }
}
