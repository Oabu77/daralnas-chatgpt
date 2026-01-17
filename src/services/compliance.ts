const DEFAULT_BLOCKLIST = [
        "alcohol",
        "gambling",
        "riba",
        "weapons",
        "adult",
        "tobacco",
];

export type ComplianceResult = {
        blocked: boolean;
        reason?: string;
};

export function enforceShariaCompliance(category: string | undefined, env: Env): ComplianceResult {
        const blocklist = (env.SHARIA_BLOCKLIST || DEFAULT_BLOCKLIST.join(","))
                .split(",")
                .map((item) => item.trim().toLowerCase())
                .filter(Boolean);
        if (!category) {
                return { blocked: false };
        }
        const normalized = category.toLowerCase();
        if (blocklist.some((term) => normalized.includes(term))) {
                return { blocked: true, reason: `Category ${category} is prohibited under Sharia` };
        }
        return { blocked: false };
}

export function evaluateZakat(amountCents: number, env: Env): boolean {
        const threshold = Number(env.ZAKAT_REVIEW_THRESHOLD_CENTS || "250000");
        return amountCents >= threshold;
}
