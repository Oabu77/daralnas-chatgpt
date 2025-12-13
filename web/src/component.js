const h = (tag, props = {}, children = []) => {
        const el = document.createElement(tag);
        Object.entries(props).forEach(([key, value]) => {
                if (value === undefined || value === null) return;
                el.setAttribute(key, value);
        });

        const normalized = Array.isArray(children) ? children : [children];
        normalized.forEach((child) => {
                if (child === undefined || child === null) return;
                el.append(typeof child === "string" ? document.createTextNode(child) : child);
        });

        return el;
};

export function render(root, state) {
        const { chain = "", gasLimit = 0, out = {} } = state ?? {};

        root.replaceChildren();

        const refreshBtn = h(
                "button",
                { style: "padding:6px 10px; margin-top:12px;" },
                "Refresh Widget Only",
        );
        refreshBtn.addEventListener("click", async () => {
                await window.openai?.callTool?.("refresh_widget", {});
        });

        root.append(
                h("h3", {}, "Gas Estimator"),
                h("div", {}, ["Chain: ", h("code", {}, chain)]),
                h("div", {}, ["Gas limit: ", h("code", {}, String(gasLimit))]),
                h("div", {}, ["Estimated (wei): ", h("code", {}, out.estimatedCostWei ?? "-")]),
                (() => {
                        const wrap = h("div", { style: "margin-top:12px;" });
                        const input = h("input", {
                                id: "gl",
                                type: "number",
                                min: "1",
                                value: String(gasLimit),
                                style: "padding:6px; width:140px;",
                        });
                        const btn = h("button", { style: "padding:6px 10px; margin-left:6px;" }, "Recalculate");
                        btn.addEventListener("click", async () => {
                                const gl = Number(input.value || gasLimit);
                                await window.openai?.callTool?.("estimate_gas", { chain, gasLimit: gl });
                        });
                        wrap.append(input, btn);
                        return wrap;
                })(),
                refreshBtn,
        );
}
