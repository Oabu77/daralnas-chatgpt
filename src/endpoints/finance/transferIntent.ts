import { contentJson, OpenAPIRoute } from "chanfana";
import { AppContext } from "../../types";
import { z } from "zod";

const AuthorizationMethod = z.enum([
        "hardware_signer",
        "multisig",
        "smart_contract_escrow",
        "exchange_api",
]);

const RiskLevel = z.enum(["low", "medium", "high"]);

export class TransferIntentEndpoint extends OpenAPIRoute {
        public schema = {
                tags: ["Finance"],
                summary: "Prepare a revenue-first transfer intent with safety controls",
                operationId: "finance-transfer-intent",
                request: {
                        body: contentJson(
                                z.object({
                                        purpose: z.string().min(3).describe("Business justification for the transfer"),
                                        amount: z.number().positive().describe("Gross amount before fees"),
                                        asset: z.string().min(2).describe("Asset symbol, e.g., USDC"),
                                        destination: z
                                                .string()
                                                .min(8)
                                                .describe("Destination account, wallet, or bank reference"),
                                        chain: z.string().min(2).describe("Chain or rail the transfer will use"),
                                        authorization: AuthorizationMethod.describe(
                                                "Required approval method with Founder or delegated signer",
                                        ),
                                        expedite: z.boolean().optional().default(false),
                                        riskLevel: RiskLevel.default("medium"),
                                        dailyLimitRemaining: z
                                                .number()
                                                .positive()
                                                .optional()
                                                .describe("Remaining approved limit for the day on this rail"),
                                }),
                        ),
                },
                responses: {
                        "200": {
                                description: "Returns the planned transfer intent and revenue hooks",
                                ...contentJson({
                                        success: z.boolean(),
                                        result: z.object({
                                                halted: z.boolean(),
                                                approval: z.object({
                                                        required: z.literal(true),
                                                        method: AuthorizationMethod,
                                                        steps: z.array(z.string()),
                                                }),
                                                feeBreakdown: z.object({
                                                        founderRoyalty: z.number(),
                                                        platformFee: z.number(),
                                                        networkFee: z.number(),
                                                        totalFees: z.number(),
                                                        feeNotes: z.array(z.string()),
                                                }),
                                                settlementPlan: z.object({
                                                        grossAmount: z.number(),
                                                        netAmountToDestination: z.number(),
                                                        asset: z.string(),
                                                        chain: z.string(),
                                                }),
                                                riskChecks: z.array(z.string()),
                                                metering: z.object({
                                                        billableUnits: z.number(),
                                                        expedited: z.boolean(),
                                                }),
                                                auditTrail: z.array(
                                                        z.object({
                                                                action: z.string(),
                                                                actor: z.string(),
                                                                timestamp: z.string(),
                                                        }),
                                                ),
                                        }),
                                }),
                        },
                        "423": {
                                description: "Transfers are halted by Founder command",
                                ...contentJson({
                                        success: z.boolean(),
                                        errors: z.array(
                                                z.object({
                                                        code: z.number(),
                                                        message: z.string(),
                                                }),
                                        ),
                                }),
                        },
                },
        };

        public async handle(c: AppContext) {
                const data = await this.getValidatedData<typeof this.schema>();

                const haltFlag = (c.env as { HALT_ALL_TRANSFERS?: string; HALT_ALL_FINANCIAL_ACTIONS?: string }).
                        HALT_ALL_TRANSFERS;
                const financialLock = (c.env as { HALT_ALL_FINANCIAL_ACTIONS?: string }).HALT_ALL_FINANCIAL_ACTIONS;

                if (haltFlag === "true" || financialLock === "true") {
                        return c.json(
                                {
                                        success: false,
                                        errors: [
                                                {
                                                        code: 9001,
                                                        message:
                                                                "Transfers are halted by Founder command. System is in audit-only mode until explicitly resumed.",
                                                },
                                        ],
                                },
                                423,
                        );
                }

                const founderRoyalty = this.roundCurrency(data.body.amount * 0.1);
                const platformFeeRate = 0.015;
                const platformFee = this.roundCurrency(data.body.amount * platformFeeRate);
                const networkFee = this.roundCurrency(data.body.expedite ? 3.75 : 1.5);

                const totalFees = this.roundCurrency(founderRoyalty + platformFee + networkFee);
                const netAmount = this.roundCurrency(data.body.amount - totalFees);

                const riskChecks = this.buildRiskChecks(data.body.riskLevel, data.body.dailyLimitRemaining);

                const approvalSteps = this.buildApprovalSteps(data.body.authorization, data.body.purpose, data.body.chain);

                const now = new Date().toISOString();
                const auditTrail = [
                        {
                                action: "intent_declared",
                                actor: "OmarAi (preparer)",
                                timestamp: now,
                        },
                        {
                                action: "awaiting_founder_authorization",
                                actor: "Founder/approved signer",
                                timestamp: now,
                        },
                ];

                return {
                        success: true,
                        result: {
                                halted: false,
                                approval: {
                                        required: true,
                                        method: data.body.authorization,
                                        steps: approvalSteps,
                                },
                                feeBreakdown: {
                                        founderRoyalty,
                                        platformFee,
                                        networkFee,
                                        totalFees,
                                        feeNotes: [
                                                "10% Founder royalty applied and ring-fenced",
                                                `Platform fee ${platformFeeRate * 100}% covers orchestration and monitoring`,
                                                data.body.expedite ? "Expedited lane selected; higher network fee applied" : "Standard network fee",
                                        ],
                                },
                                settlementPlan: {
                                        grossAmount: data.body.amount,
                                        netAmountToDestination: netAmount,
                                        asset: data.body.asset,
                                        chain: data.body.chain,
                                },
                                riskChecks,
                                metering: {
                                        billableUnits: data.body.expedite ? 2 : 1,
                                        expedited: data.body.expedite ?? false,
                                },
                                auditTrail,
                        },
                };
        }

        private buildRiskChecks(risk: z.infer<typeof RiskLevel>, dailyLimitRemaining?: number) {
                const checks = ["Sanctions, whitelist, and jurisdiction review required"];
                if (risk === "high") {
                        checks.push("Dual approval required: Founder + compliance");
                }
                if (dailyLimitRemaining !== undefined) {
                        if (dailyLimitRemaining < 0) {
                                checks.push("Daily limit exceeded; block until reset");
                        } else {
                                checks.push(`Daily limit remaining on this rail: ${dailyLimitRemaining}`);
                        }
                }
                return checks;
        }

        private buildApprovalSteps(method: z.infer<typeof AuthorizationMethod>, purpose: string, chain: string) {
                const baseSteps = [
                        `Intent: ${purpose}`,
                        "Risk check and whitelist verification",
                        "Founder or delegated signer reviews fees and net settlement",
                ];

                switch (method) {
                        case "hardware_signer":
                                return [
                                        ...baseSteps,
                                        "Prepare unsigned transaction on secure device",
                                        "Founder signs via hardware wallet; AI broadcasts only after signature",
                                        `Confirm settlement on ${chain} and log immutable receipt`,
                                ];
                        case "multisig":
                                return [
                                        ...baseSteps,
                                        "Create multisig proposal with fee and destination details",
                                        "Collect required cosignatures; enforce founder as mandatory signer",
                                        `Broadcast after quorum; verify on-chain confirmation for ${chain}`,
                                ];
                        case "smart_contract_escrow":
                                return [
                                        ...baseSteps,
                                        "Lock funds in QuranChain escrow with release conditions",
                                        "Trigger release only when contract predicates are met",
                                        `Record escrow release hash on ${chain} and append audit entry`,
                                ];
                        case "exchange_api":
                                return [
                                        ...baseSteps,
                                        "Submit transfer via whitelisted exchange/bank API",
                                        "Require manual approval within exchange UI before execution",
                                        "Reconcile balances and store provider confirmation",
                                ];
                        default:
                                return baseSteps;
                }
        }

        private roundCurrency(value: number) {
                return Math.round((value + Number.EPSILON) * 100) / 100;
        }
}
