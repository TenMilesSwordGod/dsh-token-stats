window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-token-stats",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");

		//#region locales
		/** `token-stats` namespace dictionaries (header chip + stats panel). */
		const NS = "token-stats";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"chip.title": "Token 用量",
			"panel.title": "Token 用量统计",
			"panel.subtitle": "每个模型每天消耗的 tokens 与费用（来自本机会话日志）",
			"all": "全部模型",
			"provider": "服务商",
			"model": "模型",
			"today": "今日",
			"last7": "近 7 天",
			"last30": "近 30 天",
			"total": "累计",
			"tokens": "tokens",
			"activeDays": "活跃天数",
			"input": "输入",
			"output": "输出",
			"cacheRead": "缓存读取",
			"cacheWrite": "缓存写入",
			"mode.tokens": "Tokens",
			"mode.cost": "费用",
			"price": "价格",
			"price.title": "价格设置",
			"price.subtitle": "美元 / 每百万 tokens · 费用按事件发生时间计价，深夜折扣自动生效",
			"price.save": "保存",
			"price.saved": "已保存",
			"price.sync": "同步最新价格",
			"price.syncing": "同步中…",
			"price.synced": "已同步 {n} 个模型",
			"price.syncFailed": "同步失败：{error}",
			"price.reset": "恢复默认",
			"price.source.default": "默认",
			"price.source.openrouter": "OpenRouter",
			"price.source.manual": "手动",
			"price.source.estimated": "估算",
			"price.offpeak": "深夜折扣",
			"price.offpeak.hint": "UTC {start}–{end} · ×{multiplier}",
			"price.perM": "/1M",
			"price.note": "DeepSeek 默认深夜折扣：UTC 16:30–00:30（北京时间 00:30–08:30）；「同步最新价格」从 OpenRouter 拉取并匹配你使用过的模型",
			"price.needRestart": "服务端需要重启后才能使用价格功能",
			"est": "估算",
			"offpeakApplied": "（深夜 ×{multiplier}）",
			"refresh": "刷新",
			"close": "关闭",
			"updatedAt": "更新于 {time}",
			"loading": "加载中…",
			"loadFailed": "加载失败：{error}",
			"retry": "重试",
			"noData": "还没有任何 token 用量数据。开始对话后，这里会显示每天的用量热力图。",
			"legendLess": "少",
			"legendMore": "多",
			"todayMarker": "今天",
			"cellDetail": "{date} · 输入 {input} · 输出 {output} · 总计 {total}",
			"cellEmpty": "{date} · 无用量",
			"modelTotal": "{model}：{total}",
			"weeks": "近 {weeks} 周",
			"variant.label": "配色",
			"variant.github": "GitHub 绿",
			"variant.ocean": "海洋蓝",
			"variant.ember": "余烬橙",
			"variant.violet": "梦境紫",
			"variant.teal": "翠竹青",
			"month.0": "1月", "month.1": "2月", "month.2": "3月", "month.3": "4月",
			"month.4": "5月", "month.5": "6月", "month.6": "7月", "month.7": "8月",
			"month.8": "9月", "month.9": "10月", "month.10": "11月", "month.11": "12月",
			"weekday.0": "一", "weekday.1": "二", "weekday.2": "三", "weekday.3": "四",
			"weekday.4": "五", "weekday.5": "六", "weekday.6": "日"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"chip.title": "Tokens",
			"panel.title": "Token Usage",
			"panel.subtitle": "Tokens and cost per model per day (from local session logs)",
			"all": "All models",
			"provider": "Provider",
			"model": "Model",
			"today": "Today",
			"last7": "Last 7 days",
			"last30": "Last 30 days",
			"total": "Total",
			"tokens": "tokens",
			"activeDays": "Active days",
			"input": "Input",
			"output": "Output",
			"cacheRead": "Cache read",
			"cacheWrite": "Cache write",
			"mode.tokens": "Tokens",
			"mode.cost": "Cost",
			"price": "Pricing",
			"price.title": "Pricing",
			"price.subtitle": "USD per 1M tokens · cost is priced at event time, off-peak discounts apply automatically",
			"price.save": "Save",
			"price.saved": "Saved",
			"price.sync": "Sync latest prices",
			"price.syncing": "Syncing…",
			"price.synced": "Synced {n} models",
			"price.syncFailed": "Sync failed: {error}",
			"price.reset": "Reset to default",
			"price.source.default": "Default",
			"price.source.openrouter": "OpenRouter",
			"price.source.manual": "Manual",
			"price.source.estimated": "Estimated",
			"price.offpeak": "Off-peak",
			"price.offpeak.hint": "UTC {start}–{end} · ×{multiplier}",
			"price.perM": "/1M",
			"price.note": "DeepSeek off-peak default: UTC 16:30–00:30 (Beijing 00:30–08:30); \"Sync latest prices\" pulls from OpenRouter and matches your models",
			"price.needRestart": "The server needs a restart to enable pricing",
			"est": "est.",
			"offpeakApplied": " (off-peak ×{multiplier})",
			"refresh": "Refresh",
			"close": "Close",
			"updatedAt": "Updated {time}",
			"loading": "Loading…",
			"loadFailed": "Failed to load: {error}",
			"retry": "Retry",
			"noData": "No token usage yet. Start a conversation and this heatmap will show each day's usage.",
			"legendLess": "Less",
			"legendMore": "More",
			"todayMarker": "Today",
			"cellDetail": "{date} · {input} in · {output} out · {total} total",
			"cellEmpty": "{date} · no usage",
			"modelTotal": "{model}: {total}",
			"weeks": "Last {weeks} weeks",
			"variant.label": "Palette",
			"variant.github": "GitHub",
			"variant.ocean": "Ocean",
			"variant.ember": "Ember",
			"variant.violet": "Violet",
			"variant.teal": "Teal",
			"month.0": "Jan", "month.1": "Feb", "month.2": "Mar", "month.3": "Apr",
			"month.4": "May", "month.5": "Jun", "month.6": "Jul", "month.7": "Aug",
			"month.8": "Sep", "month.9": "Oct", "month.10": "Nov", "month.11": "Dec",
			"weekday.0": "M", "weekday.1": "T", "weekday.2": "W", "weekday.3": "T",
			"weekday.4": "F", "weekday.5": "S", "weekday.6": "S"
		};
		//#endregion

		//#region widget stylesheet (claimed by the module loader for reload disposal)
		const css = `
.dshtk-root{position:relative;display:inline-flex;align-items:center}
.dshtk-chip{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1;cursor:pointer;user-select:none;transition:border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),background var(--ds-transition-duration-fast) var(--ds-ease-in-out),color var(--ds-transition-duration-fast) var(--ds-ease-in-out)}
.dshtk-chip:hover{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshtk-chip:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshtk-chip[data-open='true']{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary)}
.dshtk-chip-icon{display:inline-flex;transition:color var(--ds-transition-duration) var(--ds-ease-in-out)}
.dshtk-chip-label{font-weight:500}
.dshtk-chip-count{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dshtk-panel{position:absolute;top:calc(100% + 8px);right:0;width:min(660px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 80px));display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 12px 40px var(--dsw-alias-bg-mask-2);z-index:60;overflow:hidden;animation:dshtk-pop-in var(--ds-transition-duration) var(--ds-ease-in-out);transform-origin:top right}
@keyframes dshtk-pop-in{from{opacity:0;transform:scale(.97) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
.dshtk-panel-header{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dshtk-panel-title{flex:1;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dshtk-panel-sub{font-size:11px;color:var(--dsw-alias-label-caption);margin-top:1px}
.dshtk-mode{display:inline-flex;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-specific-selector)}
.dshtk-mode-btn{border:none;background:transparent;padding:3px 10px;border-radius:6px;font-size:11px;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out),color var(--ds-transition-duration-fast) var(--ds-ease-in-out)}
.dshtk-mode-btn[data-active]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dshtk-variants{display:inline-flex;align-items:center;gap:4px;padding:0 2px}
.dshtk-variant{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:50%;background:transparent;cursor:pointer;transition:transform var(--ds-transition-duration-fast) var(--ds-ease-in-out),border-color var(--ds-transition-duration) var(--ds-ease-in-out),box-shadow var(--ds-transition-duration) var(--ds-ease-in-out)}
.dshtk-variant:hover{transform:scale(1.18)}
.dshtk-variant[data-active]{border-color:var(--dsw-alias-label-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-2),0 0 0 3.5px var(--dsw-alias-label-primary)}
.dshtk-variant-dot{width:9px;height:9px;border-radius:50%;transition:background-color var(--ds-transition-duration) var(--ds-ease-in-out)}
.dshtk-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dshtk-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshtk-iconbtn[data-accent]{color:var(--dsw-alias-state-business-primary)}
.dshtk-body{display:flex;flex-direction:column;gap:12px;padding:12px 14px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent}
.dshtk-body::-webkit-scrollbar{width:8px}
.dshtk-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshtk-body::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2)}
.dshtk-pills{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dshtk-pill-caption{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);margin-right:2px}
.dshtk-pill{display:inline-flex;align-items:center;gap:6px;max-width:300px;padding:3px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;cursor:pointer;font-family:var(--ds-font-family-code);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),color var(--ds-transition-duration-fast) var(--ds-ease-in-out),background var(--ds-transition-duration-fast) var(--ds-ease-in-out)}
.dshtk-pill:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}
.dshtk-pill[data-active]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-state-business-primary)}
.dshtk-pill-total{margin-left:auto;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-family:inherit}
.dshtk-pill-provider{opacity:.6}
.dshtk-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.dshtk-card{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.dshtk-card-value{font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);transition:color var(--ds-transition-duration) var(--ds-ease-in-out)}
.dshtk-card-sub{font-size:11px;color:var(--dsw-alias-label-caption)}
.dshtk-card-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshtk-heat{position:relative;user-select:none;overflow:hidden}
.dshtk-heat-inner{position:relative}
.dshtk-month{position:absolute;top:0;font-size:11px;line-height:20px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dshtk-wd{position:absolute;font-size:10px;line-height:11px;text-align:right;color:var(--dsw-alias-label-tertiary)}
.dshtk-cellwrap{position:absolute}
.dshtk-cell{display:block;width:9px;height:9px;border-radius:2px;border:1px solid rgba(27,31,35,.06);box-sizing:border-box;cursor:default;transition:background-color var(--ds-transition-duration) var(--ds-ease-in-out),transform .16s var(--ds-ease-in-out)}
.dshtk-cell:hover{transform:scale(1.3);border-color:rgba(27,31,35,.18)}
.dshtk-tip{position:fixed;z-index:220;pointer-events:none;transform:translate(-50%,-100%);max-width:300px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00,#fff);box-shadow:0 10px 28px var(--dsw-alias-bg-mask-2);font-size:11px;line-height:1.55;animation:dshtk-tip-in .16s var(--ds-ease-in-out)}
@keyframes dshtk-tip-in{from{opacity:0;transform:translate(-50%,-94%) scale(.96)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}
.dshtk-tip-date{font-weight:600;opacity:.8}
.dshtk-tip-total{display:flex;align-items:baseline;gap:6px;margin-top:3px;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.dshtk-tip-total-unit{font-size:10px;font-weight:400;opacity:.7}
.dshtk-tip-rows{display:flex;flex-direction:column;gap:2px;margin-top:5px;font-variant-numeric:tabular-nums}
.dshtk-tip-row{display:flex;align-items:center;gap:6px;opacity:.92}
.dshtk-tip-dot{width:6px;height:6px;border-radius:50%;flex:none}
.dshtk-tip-row-label{opacity:.72;margin-right:auto}
.dshtk-tip-row-cost{opacity:.8}
.dshtk-tip-note{border-top:1px solid rgba(255,255,255,.14);margin-top:5px;padding-top:4px;font-size:10px;opacity:.72;line-height:1.5}
.dshtk-tip-empty{margin-top:3px;font-size:11px;opacity:.8}
.dshtk-today{position:absolute;transform:translateX(-50%);bottom:2px;font-size:9px;line-height:9px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dshtk-legend{position:absolute;left:30px;bottom:2px;display:flex;align-items:center;gap:6px;font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dshtk-swatch{display:block;width:9px;height:9px;border-radius:2px;border:1px solid rgba(27,31,35,.06);transition:background-color var(--ds-transition-duration) var(--ds-ease-in-out)}
.dshtk-footer{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 14px 12px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums}
.dshtk-state{padding:30px 14px;text-align:center;font-size:12px;color:var(--dsw-alias-label-caption);line-height:1.6}
.dshtk-retry{border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-business-primary);font-size:12px;padding:4px 12px;cursor:pointer;margin-top:8px}
.dshtk-mask{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:32px;background:var(--dsw-alias-bg-mask-1);animation:dshtk-fade-in var(--ds-transition-duration) var(--ds-ease-in-out)}
@keyframes dshtk-fade-in{from{opacity:0}to{opacity:1}}
.dshtk-modal{display:flex;flex-direction:column;width:min(680px,100%);max-height:min(600px,calc(100vh - 64px));border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 16px 48px var(--dsw-alias-bg-mask-3);overflow:hidden;animation:dshtk-pop-in var(--ds-transition-duration) var(--ds-ease-in-out)}
.dshtk-modal-header{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dshtk-modal-title{flex:1;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dshtk-modal-body{display:flex;flex-direction:column;gap:10px;padding:12px 14px;overflow-y:auto;scrollbar-width:thin}
.dshtk-modal-note{font-size:11px;color:var(--dsw-alias-label-caption);line-height:1.6}
.dshtk-price-row{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.dshtk-price-head{display:flex;align-items:center;gap:8px}
.dshtk-price-model{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshtk-price-source{flex:none;font-size:10px;padding:0 6px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary)}
.dshtk-price-source[data-source='openrouter']{color:var(--dsw-alias-state-success-primary)}
.dshtk-price-source[data-source='manual']{color:var(--dsw-alias-state-business-primary)}
.dshtk-price-source[data-source='estimated']{color:var(--dsw-alias-state-warn-primary)}
.dshtk-price-reset{margin-left:auto;flex:none;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:11px;cursor:pointer;padding:2px 4px;border-radius:4px}
.dshtk-price-reset:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.dshtk-price-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.dshtk-price-field{display:flex;flex-direction:column;gap:2px}
.dshtk-price-field label{font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dshtk-price-input{width:100%;box-sizing:border-box;height:24px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);font-size:11px;font-family:var(--ds-font-family-code);outline:none}
.dshtk-price-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshtk-price-input[data-invalid]{border-color:var(--dsw-alias-state-error-primary)}
.dshtk-price-offpeak{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dshtk-check{display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
.dshtk-check input{accent-color:var(--dsw-alias-state-business-primary)}
.dshtk-price-mini{width:56px;box-sizing:border-box;height:22px;padding:0 5px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);font-size:11px;font-family:var(--ds-font-family-code);outline:none}
.dshtk-price-mini:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshtk-modal-actions{display:flex;align-items:center;gap:8px;padding:10px 14px 12px;border-top:1px solid var(--dsw-alias-border-l1)}
.dshtk-modal-status{flex:1;font-size:11px;color:var(--dsw-alias-label-caption)}
.dshtk-btn{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;padding:5px 12px;cursor:pointer;transition:border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),color var(--ds-transition-duration-fast) var(--ds-ease-in-out)}
.dshtk-btn:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}
.dshtk-btn:disabled{opacity:.5;cursor:default}
.dshtk-btn-primary{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground)}
.dshtk-btn-primary:hover{opacity:.9;color:var(--dsw-alias-label-primary-foreground)}
@media (prefers-reduced-motion: reduce){.dshtk-panel,.dshtk-tip,.dshtk-modal,.dshtk-mask{animation:none !important}}
`;
		//#endregion

		//#region helpers
		/** Level-0 neutral cell color per mode (no usage). */
		const NEUTRAL = { light: "#ebedf0", dark: "#161b22" };
		/** Color variants: 4 intensity levels per mode, keyed by locale id. */
		const VARIANTS = [
			{ id: "github", light: ["#9be9a8", "#40c463", "#30a14e", "#216e39"], dark: ["#0e4429", "#006d32", "#26a641", "#39d353"] },
			{ id: "ocean", light: ["#a9c9f0", "#6ea4e0", "#3a7bd0", "#2059a8"], dark: ["#16395f", "#1e5490", "#2f74b8", "#4b97dd"] },
			{ id: "ember", light: ["#ffd9ad", "#ffab5e", "#f08a2e", "#cc6a14"], dark: ["#5a2d0d", "#8a4a16", "#c26e22", "#ef9a3d"] },
			{ id: "violet", light: ["#d9c6f2", "#b08be4", "#8259cc", "#5d3aa6"], dark: ["#341d63", "#4a2b8f", "#6b45c4", "#8f6ae0"] },
			{ id: "teal", light: ["#bdeee0", "#6fd6b8", "#33b391", "#178a6c"], dark: ["#0d4038", "#14604f", "#1f8a70", "#35b894"] }
		];
		/** Full 5-color scale for a variant + mode (index 0 = no usage). */
		function scaleFor(variant, dark) {
			return [dark ? NEUTRAL.dark : NEUTRAL.light, ...(dark ? variant.dark : variant.light)];
		}
		/** Look up a variant by id, defaulting to the first. */
		function variantOf(id) {
			return VARIANTS.find((v) => v.id === id) ?? VARIANTS[0];
		}
		const CELL = 9;
		const GAP = 2;
		const STEP = CELL + GAP;
		const WEEKS = 53;
		const LABEL_COL = 30;
		const LABEL_ROW = 20;

		/** Local calendar-day key for a Date. */
		function localKey(d) {
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return `${y}-${m}-${day}`;
		}

		/** 0 = Monday .. 6 = Sunday. */
		function mondayIndex(date) {
			return (date.getDay() + 6) % 7;
		}

		/** Thousands-separated integer. */
		function formatInt(n) {
			return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		/**
		* Compact figure with a sensible unit suffix: 999 -> 999, 1_234 -> 1.2K,
		* 10_000 -> 10K, 2_400_000 -> 2.4M, 123_000_000 -> 123M, 1.5e9 -> 1.5B.
		* Decimals only where they matter; never a trailing ".0".
		*/
		function formatCompact(n) {
			if (!Number.isFinite(n) || n <= 0) return "0";
			const fmt = (v) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
			if (n < 1000) return String(Math.round(n));
			if (n < 999_500) return `${fmt(n / 1000)}K`;
			if (n < 999_500_000) return `${fmt(n / 1_000_000)}M`;
			return `${fmt(n / 1_000_000_000)}B`;
		}

		/** Sum a {day: bucket} table over the trailing `days` days (incl. today). */
		function sumWindow(byDay, days, now) {
			let total = 0;
			let cost = 0;
			for (const key of Object.keys(byDay)) {
				const y = Number(key.slice(0, 4));
				const m = Number(key.slice(5, 7)) - 1;
				const d = Number(key.slice(8, 10));
				const date = new Date(y, m, d);
				const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - date) / 86400000);
				if (diff >= 0 && diff < days) {
					total += byDay[key].total;
					cost += byDay[key].cost ?? 0;
				}
			}
			return { total, cost };
		}

		/** Build the 53-week Monday-first calendar cells + month labels. */
		function buildCalendar(byDay, now, t, metric) {
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const dow = mondayIndex(today);
			const endOfWeek = new Date(today);
			endOfWeek.setDate(today.getDate() + (6 - dow));
			const start = new Date(endOfWeek);
			start.setDate(endOfWeek.getDate() - (WEEKS * 7 - 1));
			const cells = [];
			const monthLabels = [];
			let max = 0;
			for (let i = 0; i < WEEKS * 7; i++) {
				const date = new Date(start);
				date.setDate(start.getDate() + i);
				const dayKey = localKey(date);
				const bucket = byDay[dayKey];
				const value = bucket === void 0 ? 0 : (metric === "cost" ? (bucket.cost ?? 0) : bucket.total);
				if (value > max) max = value;
				cells.push({ date, dayKey, bucket, value });
				if (date.getDate() === 1) monthLabels.push({ col: Math.floor(i / 7), label: t(`month.${date.getMonth()}`) });
			}
			return { cells, monthLabels, max, today };
		}

		/** Quantize a daily total onto the 0..4 GitHub scale. */
		function levelOf(total, max) {
			if (total <= 0) return 0;
			if (max <= 0) return 1;
			return 1 + Math.min(3, Math.floor((3 * total) / max));
		}

		/** Totals over a {day: bucket} table (tokens + USD cost). */
		function totalsOf(byDay) {
			let total = 0;
			let active = 0;
			let cost = 0;
			for (const day of Object.keys(byDay)) {
				const b = byDay[day];
				total += b.total;
				active += b.total > 0 ? 1 : 0;
				cost += b.cost ?? 0;
			}
			return { total, active, cost };
		}

		/** USD figure: $0, $0.0034, $1.23, $12.34, $1,234, $1.2K. */
		function formatMoney(n) {
			if (!Number.isFinite(n) || n <= 0) return "$0";
			if (n < 0.01) return `$${n.toFixed(4)}`;
			if (n < 100) return `$${n.toFixed(2)}`;
			if (n < 100_000) return `$${Math.round(n).toLocaleString("en-US")}`;
			return `$${formatCompact(n)}`;
		}

		/** Whether a bucket table carries cost data (server restarted with pricing). */
		function hasCostData(byDay) {
			for (const day of Object.keys(byDay)) {
				if (typeof byDay[day].cost === "number") return true;
			}
			return false;
		}

		/** Split a `provider/model` combo key; slash-less keys get null provider. */
		function splitCombo(key) {
			const slash = key.lastIndexOf("/");
			if (slash <= 0) return { provider: null, model: key };
			return { provider: key.slice(0, slash), model: key.slice(slash + 1) };
		}

		/** Merge several {day: bucket} tables into one summed table. */
		function mergeTables(tables) {
			const out = {};
			for (const table of tables) {
				for (const day of Object.keys(table)) {
					const b = table[day];
					let t = out[day];
					if (t === void 0) t = out[day] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0, cost: 0, costInput: 0, costOutput: 0, costCacheRead: 0, costCacheWrite: 0 };
					t.input += b.input;
					t.output += b.output;
					t.cacheRead += b.cacheRead;
					t.cacheWrite += b.cacheWrite;
					t.reasoning += b.reasoning;
					t.total += b.total;
					t.cost += b.cost ?? 0;
					t.costInput += b.costInput ?? 0;
					t.costOutput += b.costOutput ?? 0;
					t.costCacheRead += b.costCacheRead ?? 0;
					t.costCacheWrite += b.costCacheWrite ?? 0;
				}
			}
			return out;
		}
		//#endregion

		//#region components
		/** The heatmap grid for one data table, with a shared hover tooltip. */
		function Heatmap({ byDay, t, dark, variant, metric, prices, priceKeys }) {
			const now = react.useMemo(() => new Date(), []);
			const { cells, monthLabels, max, today } = react.useMemo(() => buildCalendar(byDay, now, t, metric), [byDay, now, t, metric]);
			const scale = scaleFor(variant, dark);
			const width = LABEL_COL + WEEKS * STEP - GAP;
			// +24: room for the legend and the "今天" marker below the grid rows.
			const height = LABEL_ROW + 7 * STEP - GAP + 24;
			const todayKey = localKey(today);
			const todayIdx = cells.findIndex((c) => c.dayKey === todayKey);
			const todayCol = todayIdx === -1 ? -1 : Math.floor(todayIdx / 7);
			/** Active tooltip: the hovered cell + the anchor point (cell top-center). */
			const [tip, setTip] = react.useState(null);
			const showTimer = react.useRef(null);
			const hideTimer = react.useRef(null);
			const tipRef = react.useRef(null);

			react.useEffect(() => () => {
				if (showTimer.current !== null) clearTimeout(showTimer.current);
				if (hideTimer.current !== null) clearTimeout(hideTimer.current);
			}, []);

			// Keep the bubble inside the viewport horizontally.
			react.useEffect(() => {
				if (tip === null || tipRef.current === null) return;
				const rect = tipRef.current.getBoundingClientRect();
				let left = tip.x;
				left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8));
				tipRef.current.style.left = `${left}px`;
				tipRef.current.style.top = `${tip.y}px`;
			}, [tip]);

			const onCellEnter = (event, cell) => {
				if (hideTimer.current !== null) {
					clearTimeout(hideTimer.current);
					hideTimer.current = null;
				}
				if (showTimer.current !== null) clearTimeout(showTimer.current);
				const el = event.currentTarget;
				showTimer.current = setTimeout(() => {
					if (el === null || !el.isConnected) return;
					const rect = el.getBoundingClientRect();
					setTip({ cell, x: rect.left + rect.width / 2, y: rect.top - 8 });
				}, 140);
			};
			const onCellLeave = () => {
				if (showTimer.current !== null) {
					clearTimeout(showTimer.current);
					showTimer.current = null;
				}
				hideTimer.current = setTimeout(() => setTip(null), 150);
			};

			const tipLevel = tip === null ? 0 : levelOf(tip.cell.value, max);
			const showCost = metric === "cost";
			// For the price note: only when a single combo is selected.
			const singlePrice = priceKeys.length === 1 ? (prices?.[priceKeys[0]] ?? null) : null;
			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					react_jsx_runtime.jsx("div", {
						className: "dshtk-heat",
						children: react_jsx_runtime.jsxs("div", {
							className: "dshtk-heat-inner",
							style: { width, height },
							children: [
								monthLabels.map((m) => react_jsx_runtime.jsx("span", {
									className: "dshtk-month",
									style: { left: LABEL_COL + m.col * STEP },
									children: m.label
								}, m.col)),
								Array.from({ length: 7 }, (_, row) => react_jsx_runtime.jsx("span", {
									className: "dshtk-wd",
									style: { left: 0, top: LABEL_ROW + row * STEP, width: LABEL_COL - 6 },
									children: t(`weekday.${row}`)
								}, row)),
								cells.map((c, i) => {
									const level = levelOf(c.value, max);
									const key = c.dayKey;
									const isToday = key === todayKey;
									const fill = scale[level];
									const cellTitle = c.value > 0
										? t("cellDetail", { date: key, input: formatInt(c.bucket?.input ?? 0), output: formatInt(c.bucket?.output ?? 0), total: formatInt(c.bucket?.total ?? 0) })
										: t("cellEmpty", { date: key });
									return react_jsx_runtime.jsx("div", {
										className: "dshtk-cellwrap",
										style: {
											left: LABEL_COL + Math.floor(i / 7) * STEP,
											top: LABEL_ROW + (i % 7) * STEP,
											...(isToday ? { zIndex: 3 } : {})
										},
										children: react_jsx_runtime.jsx("span", {
											className: "dshtk-cell",
											"aria-label": cellTitle,
											style: {
												backgroundColor: fill,
												...(isToday ? { boxShadow: "0 0 0 1.5px var(--dsw-alias-state-business-primary)" } : {})
											},
											onMouseEnter: (event) => onCellEnter(event, c),
											onMouseLeave: onCellLeave
										})
									}, key);
								}),
								todayIdx !== -1 ? react_jsx_runtime.jsx("span", {
									className: "dshtk-today",
									style: { left: LABEL_COL + todayCol * STEP + CELL / 2, bottom: 2 },
									children: t("todayMarker")
								}) : null,
								react_jsx_runtime.jsxs("div", {
									className: "dshtk-legend",
									children: [
										react_jsx_runtime.jsx("span", { children: t("legendLess") }),
										[0, 1, 2, 3, 4].map((lv) => react_jsx_runtime.jsx("span", {
											className: "dshtk-swatch",
											style: { backgroundColor: scale[lv] }
										}, lv)),
										react_jsx_runtime.jsx("span", { children: t("legendMore") })
									]
								})
							]
						})
					}),
					tip !== null ? react_dom.createPortal(react_jsx_runtime.jsxs("div", {
						className: "dshtk-tip",
						ref: tipRef,
						role: "tooltip",
						children: [
							react_jsx_runtime.jsx("div", { className: "dshtk-tip-date", children: tip.cell.dayKey }),
							tip.cell.value > 0 ? react_jsx_runtime.jsxs(react.Fragment, {
								children: [
									showCost
										? react_jsx_runtime.jsxs("div", {
											className: "dshtk-tip-total",
											children: [
												react_jsx_runtime.jsx("span", { children: formatMoney(tip.cell.bucket?.cost ?? 0) }),
												react_jsx_runtime.jsx("span", { className: "dshtk-tip-total-unit", children: `${formatCompact(tip.cell.bucket?.total ?? 0)} ${t("tokens")}` })
											]
										})
										: react_jsx_runtime.jsxs("div", {
											className: "dshtk-tip-total",
											children: [
												react_jsx_runtime.jsx("span", { children: formatCompact(tip.cell.bucket?.total ?? 0) }),
												react_jsx_runtime.jsx("span", { className: "dshtk-tip-total-unit", children: t("tokens") })
											]
										}),
									react_jsx_runtime.jsx("div", {
										className: "dshtk-tip-rows",
										children: showCost
											? [
												["input", tip.cell.bucket?.input ?? 0, tip.cell.bucket?.costInput ?? 0],
												["output", tip.cell.bucket?.output ?? 0, tip.cell.bucket?.costOutput ?? 0],
												["cacheRead", tip.cell.bucket?.cacheRead ?? 0, tip.cell.bucket?.costCacheRead ?? 0],
												["cacheWrite", tip.cell.bucket?.cacheWrite ?? 0, tip.cell.bucket?.costCacheWrite ?? 0]
											].filter(([, tokens]) => tokens > 0).map(([kind, tokens, cost]) => react_jsx_runtime.jsxs("div", {
												className: "dshtk-tip-row",
												children: [
													react_jsx_runtime.jsx("span", {
														className: "dshtk-tip-dot",
														style: { backgroundColor: scale[Math.max(1, tipLevel)] }
													}),
													react_jsx_runtime.jsx("span", { className: "dshtk-tip-row-label", children: t(kind) }),
													react_jsx_runtime.jsx("span", { children: `${formatCompact(tokens)} ${t("tokens")}` }),
													react_jsx_runtime.jsx("span", { className: "dshtk-tip-row-cost", children: formatMoney(cost) })
												]
											}, kind))
											: [
												["input", tip.cell.bucket?.input ?? 0],
												["output", tip.cell.bucket?.output ?? 0],
												["cacheRead", tip.cell.bucket?.cacheRead ?? 0],
												["cacheWrite", tip.cell.bucket?.cacheWrite ?? 0]
											].filter(([, v]) => v > 0).map(([kind, value]) => react_jsx_runtime.jsxs("div", {
												className: "dshtk-tip-row",
												children: [
													react_jsx_runtime.jsx("span", {
														className: "dshtk-tip-dot",
														style: { backgroundColor: scale[Math.max(1, tipLevel)] }
													}),
													react_jsx_runtime.jsx("span", { className: "dshtk-tip-row-label", children: t(kind) }),
													react_jsx_runtime.jsx("span", { children: formatCompact(value) })
												]
											}, kind))
									}),
									singlePrice !== null ? react_jsx_runtime.jsxs("div", {
										className: "dshtk-tip-note",
										children: [
											`${t("input")} $${singlePrice.input}/M · ${t("output")} $${singlePrice.output}/M`,
											singlePrice.offPeak !== void 0 ? ` · ${t("offpeakApplied", { multiplier: singlePrice.offPeak.multiplier })}` : ""
										]
									}) : null
								]
							}) : react_jsx_runtime.jsx("div", {
								className: "dshtk-tip-empty",
								children: t("cellEmpty", { date: tip.cell.dayKey })
							})
						]
					}), document.body) : null
				]
			});
		}

		/** Claude-style palette switcher: a row of variant swatch dots. */
		function VariantPicker({ t, dark, variantId, onPick }) {
			return react_jsx_runtime.jsx("div", {
				className: "dshtk-variants",
				role: "group",
				"aria-label": t("variant.label"),
				children: VARIANTS.map((v) => {
					const active = v.id === variantId;
					const color = scaleFor(v, dark)[3];
					return react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dshtk-variant",
						"data-active": active || undefined,
						title: t(`variant.${v.id}`),
						"aria-label": t(`variant.${v.id}`),
						"aria-pressed": active,
						onClick: () => onPick(v.id),
						children: react_jsx_runtime.jsx("span", {
							className: "dshtk-variant-dot",
							style: { backgroundColor: color }
						})
					}, v.id);
				})
			});
		}

		/** Summary cards: 今日 / 近7天 / 近30天 / 累计 (tokens or cost). */
		function Cards({ byDay, t, metric }) {
			const now = react.useMemo(() => new Date(), []);
			const todayKey = localKey(now);
			const todayB = byDay[todayKey];
			const last7 = sumWindow(byDay, 7, now);
			const last30 = sumWindow(byDay, 30, now);
			const { total, active, cost } = totalsOf(byDay);
			const showCost = metric === "cost";
			const items = [
				[t("today"), showCost ? formatMoney(todayB?.cost ?? 0) : formatCompact(todayB?.total ?? 0), showCost ? `${formatCompact(todayB?.total ?? 0)} ${t("tokens")}` : t("tokens")],
				[t("last7"), showCost ? formatMoney(last7.cost) : formatCompact(last7.total), showCost ? `${formatCompact(last7.total)} ${t("tokens")}` : t("tokens")],
				[t("last30"), showCost ? formatMoney(last30.cost) : formatCompact(last30.total), showCost ? `${formatCompact(last30.total)} ${t("tokens")}` : t("tokens")],
				[t("total"), showCost ? formatMoney(cost) : formatCompact(total), showCost ? `${formatCompact(total)} ${t("tokens")} · ${active} ${t("activeDays")}` : `${active} ${t("activeDays")}`]
			];
			return react_jsx_runtime.jsx("div", {
				className: "dshtk-cards",
				children: items.map(([label, value, sub]) => react_jsx_runtime.jsxs("div", {
					className: "dshtk-card",
					children: [
						react_jsx_runtime.jsx("div", { className: "dshtk-card-label", children: label }),
						react_jsx_runtime.jsx("div", { className: "dshtk-card-value", children: value }),
						react_jsx_runtime.jsx("div", { className: "dshtk-card-sub", children: sub })
					]
				}, label))
			});
		}

		/** Price editor modal: edit per-model rates, sync from OpenRouter, reset. */
		function PriceModal({ t, open, onClose, modelParts, onChanged }) {
			const [table, setTable] = react.useState(null);
			const [draft, setDraft] = react.useState(null);
			const [status, setStatus] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [needRestart, setNeedRestart] = react.useState(false);

			const load = react.useCallback(async () => {
				try {
					const res = await fetch("/token-stats/prices", { headers: { accept: "application/json" } });
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const json = await res.json();
					const loaded = json.models ?? {};
					// Seed rows for models with no entry yet (estimated defaults) so
					// the fields are filled in and editable from the first open.
					const seeded = { ...loaded };
					for (const m of modelParts) {
						if (seeded[m] === void 0) seeded[m] = { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1 };
					}
					setTable(loaded);
					setDraft(seeded);
					setNeedRestart(false);
				} catch {
					setNeedRestart(true);
				}
			}, [modelParts]);

			react.useEffect(() => {
				if (!open) return;
				setStatus("");
				setBusy(false);
				void load();
			}, [open, load]);

			if (!open) return null;

			const rowModels = modelParts.length > 0 ? modelParts : (table !== null ? Object.keys(table) : []);
			const setField = (model, field, value) => setDraft((d) => ({ ...d, [model]: { ...(d[model] ?? {}), [field]: value } }));
			const valid = (v) => v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;

			const save = async () => {
				const models = {};
				let ok = true;
				for (const model of rowModels) {
					const d = draft?.[model];
					if (d === void 0) continue;
					const fields = ["input", "output", "cacheRead", "cacheWrite"];
					if (!fields.every((f) => valid(d[f]))) { ok = false; continue; }
					const [input, output, cacheRead, cacheWrite] = fields.map((f) => Number(d[f]));
					const entry = { input, output, cacheRead, cacheWrite };
					if (d.offPeakOn === true) {
						const multiplier = Number(d.offPeakMultiplier);
						const startUtc = Number(d.offPeakStart);
						const endUtc = Number(d.offPeakEnd);
						if (![multiplier, startUtc, endUtc].every((v) => Number.isFinite(v) && v >= 0) || multiplier <= 0 || multiplier > 1 || startUtc > 24 || endUtc <= startUtc || endUtc > 48) { ok = false; continue; }
						entry.offPeak = { multiplier, startUtc, endUtc };
					}
					models[model] = entry;
				}
				if (!ok) {
					setStatus("⚠ 有无效数值");
					return;
				}
				setBusy(true);
				setStatus("");
				try {
					const res = await fetch("/token-stats/prices", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ models })
					});
					const json = await res.json().catch(() => null);
					if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
					// Reload the merged table: the POST response only echoes the raw
					// saved entries, not the defaults, and a stale draft would blank
					// the other rows and let a later save zero them out.
					await load();
					setStatus(t("price.saved"));
					onChanged();
				} catch (error) {
					setStatus(`⚠ ${String(error instanceof Error ? error.message : error)}`);
				} finally {
					setBusy(false);
				}
			};

			const sync = async () => {
				setBusy(true);
				setStatus(t("price.syncing"));
				try {
					const res = await fetch("/token-stats/prices/sync", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ models: rowModels })
					});
					const json = await res.json().catch(() => null);
					if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
					await load();
					setStatus(t("price.synced", { n: json.updated ?? 0 }));
					onChanged();
				} catch (error) {
					setStatus(t("price.syncFailed", { error: String(error instanceof Error ? error.message : error) }));
				} finally {
					setBusy(false);
				}
			};

			const resetModel = async (model) => {
				setBusy(true);
				try {
					const res = await fetch("/token-stats/prices", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ models: { [model]: null } })
					});
					const json = await res.json().catch(() => null);
					if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
					await load();
					onChanged();
				} catch (error) {
					setStatus(`⚠ ${String(error instanceof Error ? error.message : error)}`);
				} finally {
					setBusy(false);
				}
			};

			return react_dom.createPortal(react_jsx_runtime.jsxs("div", {
				className: "dshtk-mask",
				onPointerDown: (event) => { if (event.target === event.currentTarget) onClose(); },
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "dshtk-modal",
						role: "dialog",
						"aria-label": t("price.title"),
						children: [
							react_jsx_runtime.jsxs("div", {
								className: "dshtk-modal-header",
								children: [
									react_jsx_runtime.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
										react_jsx_runtime.jsx("div", { className: "dshtk-modal-title", children: t("price.title") }),
										react_jsx_runtime.jsx("div", { className: "dshtk-panel-sub", children: t("price.subtitle") })
									] }),
									react_jsx_runtime.jsx("button", {
										type: "button",
										className: "dshtk-iconbtn",
										title: t("close"),
										"aria-label": t("close"),
										onClick: onClose,
										children: react_jsx_runtime.jsx("svg", { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", children: react_jsx_runtime.jsx("path", { d: "M6 6l12 12M18 6 6 18" }) })
									})
								]
							}),
							needRestart
								? react_jsx_runtime.jsx("div", { className: "dshtk-state", children: t("price.needRestart") })
								: react_jsx_runtime.jsxs(react.Fragment, {
									children: [
										react_jsx_runtime.jsx("div", {
											className: "dshtk-modal-body",
											children: rowModels.length === 0
												? react_jsx_runtime.jsx("div", { className: "dshtk-state", children: t("noData") })
												: rowModels.map((model) => {
													const d = draft?.[model] ?? {};
													const source = table?.[model]?.source ?? "estimated";
													const offPeak = d.offPeak !== void 0 ? d.offPeak : table?.[model]?.offPeak;
													const offPeakOn = d.offPeakOn === true || (d.offPeakOn !== false && offPeak !== void 0);
													const inputs = [
														["input", d.input, table?.[model]?.input],
														["output", d.output, table?.[model]?.output],
														["cacheRead", d.cacheRead, table?.[model]?.cacheRead],
														["cacheWrite", d.cacheWrite, table?.[model]?.cacheWrite]
													];
													return react_jsx_runtime.jsxs("div", {
														className: "dshtk-price-row",
														children: [
															react_jsx_runtime.jsxs("div", {
																className: "dshtk-price-head",
																children: [
																	react_jsx_runtime.jsx("span", { className: "dshtk-price-model", title: model, children: model }),
																	react_jsx_runtime.jsx("span", { className: "dshtk-price-source", "data-source": source, children: t(`price.source.${source}`) }),
																	react_jsx_runtime.jsx("button", {
																		type: "button",
																		className: "dshtk-price-reset",
																		disabled: busy,
																		onClick: () => resetModel(model),
																		children: t("price.reset")
																	})
																]
															}),
															react_jsx_runtime.jsx("div", {
																className: "dshtk-price-fields",
																children: inputs.map(([field, value, fallback]) => react_jsx_runtime.jsxs("div", {
																	className: "dshtk-price-field",
																	children: [
																		react_jsx_runtime.jsx("label", { children: `${t(field)} ${t("price.perM")}` }),
																		react_jsx_runtime.jsx("input", {
																			type: "number",
																			className: "dshtk-price-input",
																			min: "0",
																			step: "0.001",
																			value: value !== void 0 ? value : (fallback ?? ""),
																			"data-invalid": !valid(value !== void 0 ? value : (fallback ?? "")) ? "true" : undefined,
																			onChange: (e) => setField(model, field, e.target.value)
																		})
																	]
																}, field))
															}),
															react_jsx_runtime.jsxs("div", {
																className: "dshtk-price-offpeak",
																children: [
																	react_jsx_runtime.jsxs("label", { className: "dshtk-check", children: [
																		react_jsx_runtime.jsx("input", {
																			type: "checkbox",
																			checked: offPeakOn,
																			onChange: (e) => setField(model, "offPeakOn", e.target.checked)
																		}),
																		react_jsx_runtime.jsx("span", { children: t("price.offpeak") })
																	] }),
																	offPeakOn ? react_jsx_runtime.jsxs(react.Fragment, {
																		children: [
																			react_jsx_runtime.jsx("label", { className: "dshtk-check", children: [
																				"×",
																				react_jsx_runtime.jsx("input", {
																					className: "dshtk-price-mini",
																					type: "number",
																					min: "0.05",
																					max: "1",
																					step: "0.05",
																					value: d.offPeakMultiplier ?? offPeak?.multiplier ?? 0.5,
																					onChange: (e) => setField(model, "offPeakMultiplier", e.target.value)
																				})
																			] }),
																			react_jsx_runtime.jsx("label", { className: "dshtk-check", children: [
																				"UTC",
																				react_jsx_runtime.jsx("input", {
																					className: "dshtk-price-mini",
																					type: "number",
																					min: "0",
																					max: "24",
																					step: "0.5",
																					value: d.offPeakStart ?? offPeak?.startUtc ?? 16.5,
																					onChange: (e) => setField(model, "offPeakStart", e.target.value)
																				}),
																				"–",
																				react_jsx_runtime.jsx("input", {
																					className: "dshtk-price-mini",
																					type: "number",
																					min: "0",
																					max: "48",
																					step: "0.5",
																					value: d.offPeakEnd ?? offPeak?.endUtc ?? 24.5,
																					onChange: (e) => setField(model, "offPeakEnd", e.target.value)
																				})
																			] })
																		]
																	}) : null
																]
															})
														]
													}, model);
												})
										}),
										react_jsx_runtime.jsx("div", { className: "dshtk-modal-note", style: { padding: "0 14px" }, children: t("price.note") }),
										react_jsx_runtime.jsxs("div", {
											className: "dshtk-modal-actions",
											children: [
												react_jsx_runtime.jsx("span", { className: "dshtk-modal-status", children: status }),
												react_jsx_runtime.jsx("button", { type: "button", className: "dshtk-btn", disabled: busy, onClick: sync, children: busy && status === t("price.syncing") ? t("price.syncing") : t("price.sync") }),
												react_jsx_runtime.jsx("button", { type: "button", className: "dshtk-btn dshtk-btn-primary", disabled: busy, onClick: save, children: t("price.save") })
											]
										})
									]
								})
						]
					})
				]
			}), document.body);
		}

		/** Top-right header chip + popover panel. */
		function TokenStatsWidget({ t }) {
			const [open, setOpen] = react.useState(false);
			const [data, setData] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [provSel, setProvSel] = react.useState("__all__");
			const [mdlSel, setMdlSel] = react.useState("__all__");
			const [rev, setRev] = react.useState(0);
			const [dark, setDark] = react.useState(() => (typeof window !== "undefined" && window.matchMedia !== void 0 ? window.matchMedia("(prefers-color-scheme: dark)").matches : false));
			const [mode, setMode] = react.useState(() => {
				try {
					return localStorage.getItem("dsh.tokenStats.mode") ?? "tokens";
				} catch {
					return "tokens";
				}
			});
			// Palette variant (persisted so the choice sticks across reloads).
			const [variantId, setVariantId] = react.useState(() => {
				try {
					return localStorage.getItem("dsh.tokenStats.variant") ?? "github";
				} catch {
					return "github";
				}
			});
			const variant = variantOf(variantId);
			const pickVariant = (id) => {
				setVariantId(id);
				try {
					localStorage.setItem("dsh.tokenStats.variant", id);
				} catch {
					/* private mode etc. */
				}
			};
			const [pricesOpen, setPricesOpen] = react.useState(false);
			const rootRef = react.useRef(null);

			react.useEffect(() => {
				let alive = true;
				const media = typeof window !== "undefined" && window.matchMedia !== void 0 ? window.matchMedia("(prefers-color-scheme: dark)") : void 0;
				const onMedia = () => setDark(Boolean(media?.matches));
				media?.addEventListener?.("change", onMedia);
				const load = async () => {
					try {
						const res = await fetch("/token-stats", { headers: { accept: "application/json" } });
						if (!res.ok) throw new Error(`HTTP ${res.status}`);
						const json = await res.json();
						if (alive) {
							setData(json);
							setError(null);
						}
					} catch (cause) {
						if (alive) setError(String(cause instanceof Error ? cause.message : cause));
					}
				};
				load();
				const timer = setInterval(load, 30_000);
				return () => {
					alive = false;
					clearInterval(timer);
					media?.removeEventListener?.("change", onMedia);
				};
			}, [rev]);

			// Close on Escape / outside click.
			react.useEffect(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					if (rootRef.current !== null && event.target instanceof Node && !rootRef.current.contains(event.target)) setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open]);

			const models = data?.models ?? [];
			const combos = react.useMemo(() => models.map((key) => ({ key, ...splitCombo(key) })), [models]);
			const hasProviders = combos.some((c) => c.provider !== null);
			const providers = react.useMemo(() => [...new Set(combos.map((c) => c.provider).filter((p) => p !== null))].sort(), [combos]);
			const modelsForProv = react.useMemo(() => {
				const list = provSel === "__all__"
					? [...new Set(combos.map((c) => c.model))]
					: [...new Set(combos.filter((c) => c.provider === provSel).map((c) => c.model))];
				return list.sort();
			}, [combos, provSel]);

			const byDay = react.useMemo(() => {
				if (data === null) return null;
				if (provSel === "__all__" && mdlSel === "__all__") return data.all ?? {};
				const keys = combos.filter((c) => {
					if (provSel !== "__all__" && c.provider !== provSel) return false;
					if (mdlSel !== "__all__" && c.model !== mdlSel) return false;
					return true;
				}).map((c) => c.key);
				if (keys.length === 0) return {};
				if (keys.length === 1) return data.byModel?.[keys[0]] ?? {};
				return mergeTables(keys.map((k) => data.byModel?.[k] ?? {}));
			}, [data, combos, provSel, mdlSel]);

			const selectedKeys = react.useMemo(() => {
				if (data === null) return [];
				return combos.filter((c) => {
					if (provSel !== "__all__" && c.provider !== provSel) return false;
					if (mdlSel !== "__all__" && c.model !== mdlSel) return false;
					return true;
				}).map((c) => c.key);
			}, [data, combos, provSel, mdlSel]);

			const modelParts = react.useMemo(() => [...new Set(combos.map((c) => c.model))], [combos]);

			const pickProvider = (id) => {
				setProvSel(id);
				if (mdlSel === "__all__") return;
				const offered = id === "__all__"
					? combos.some((c) => c.model === mdlSel)
					: combos.some((c) => c.provider === id && c.model === mdlSel);
				if (!offered) setMdlSel("__all__");
			};

			const pickMode = (m) => {
				setMode(m);
				try {
					localStorage.setItem("dsh.tokenStats.mode", m);
				} catch {
					/* private mode etc. */
				}
			};

			const todayTotal = react.useMemo(() => {
				if (data === null) return null;
				const key = localKey(new Date());
				const b = data.all?.[key];
				if (b === void 0) return 0;
				return mode === "cost" ? (b.cost ?? 0) : b.total;
			}, [data, mode]);

			const costReady = data !== null && hasCostData(data.all ?? {});

			const refresh = () => setRev((v) => v + 1);

			let body;
			if (error !== null) {
				body = react_jsx_runtime.jsxs("div", {
					className: "dshtk-state",
					children: [
						react_jsx_runtime.jsx("div", { children: t("loadFailed", { error }) }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dshtk-retry", onClick: refresh, children: t("retry") })
					]
				});
			} else if (data === null) {
				body = react_jsx_runtime.jsx("div", { className: "dshtk-state", children: t("loading") });
			} else if (byDay === null || totalsOf(byDay).total === 0) {
				body = react_jsx_runtime.jsx("div", { className: "dshtk-state", children: t("noData") });
			} else if (mode === "cost" && !costReady) {
				body = react_jsx_runtime.jsx("div", { className: "dshtk-state", children: t("price.needRestart") });
			} else {
				body = react_jsx_runtime.jsxs(react.Fragment, {
					children: [
						react_jsx_runtime.jsx(Cards, { byDay, t, metric: mode }),
						react_jsx_runtime.jsx(Heatmap, { byDay, t, dark, variant, metric: mode, prices: data?.prices, priceKeys: selectedKeys })
					]
				});
			}

			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "dshtk-root",
						ref: rootRef,
						children: [
							react_jsx_runtime.jsxs("button", {
								type: "button",
								className: "dshtk-chip",
								"data-open": open || undefined,
								title: t("chip.title"),
								"aria-haspopup": "dialog",
								"aria-expanded": open,
								onClick: () => setOpen((current) => !current),
								children: [
									react_jsx_runtime.jsx("span", {
										className: "dshtk-chip-icon",
										"aria-hidden": "true",
										style: { color: scaleFor(variant, dark)[3] },
										children: react_jsx_runtime.jsx("svg", {
											width: 13,
											height: 13,
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: 2.2,
											strokeLinecap: "round",
											children: react_jsx_runtime.jsx("path", { d: "M4 20V10M10 20V4M16 20v-7M22 20H2" })
										})
									}),
									react_jsx_runtime.jsx("span", { className: "dshtk-chip-label", children: t("chip.title") }),
									todayTotal !== null && todayTotal > 0 ? react_jsx_runtime.jsx("span", {
										className: "dshtk-chip-count",
										children: mode === "cost" ? formatMoney(todayTotal) : formatCompact(todayTotal)
									}) : null
								]
							}),
							open ? react_jsx_runtime.jsxs("div", {
								className: "dshtk-panel",
								role: "dialog",
								"aria-label": t("panel.title"),
								children: [
									react_jsx_runtime.jsxs("div", {
										className: "dshtk-panel-header",
										children: [
											react_jsx_runtime.jsxs("div", {
												style: { flex: 1, minWidth: 0 },
												children: [
													react_jsx_runtime.jsx("div", { className: "dshtk-panel-title", children: t("panel.title") }),
													react_jsx_runtime.jsx("div", { className: "dshtk-panel-sub", children: t("panel.subtitle") })
												]
											}),
											react_jsx_runtime.jsx(ModeToggle, { t, mode, onMode: pickMode }),
											react_jsx_runtime.jsx(VariantPicker, { t, dark, variantId, onPick: pickVariant }),
											react_jsx_runtime.jsx("button", {
												type: "button",
												className: "dshtk-iconbtn",
												"data-accent": costReady ? "true" : undefined,
												title: t("price"),
												"aria-label": t("price"),
												onClick: () => setPricesOpen(true),
												children: react_jsx_runtime.jsx("svg", {
													width: 14,
													height: 14,
													viewBox: "0 0 24 24",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: 2,
													strokeLinecap: "round",
													children: react_jsx_runtime.jsx("path", { d: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" })
												})
											}),
											react_jsx_runtime.jsx("button", {
												type: "button",
												className: "dshtk-iconbtn",
												title: t("refresh"),
												"aria-label": t("refresh"),
												onClick: refresh,
												children: react_jsx_runtime.jsx("svg", {
													width: 14,
													height: 14,
													viewBox: "0 0 24 24",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: 2,
													strokeLinecap: "round",
													children: react_jsx_runtime.jsx("path", { d: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" })
												})
											}),
											react_jsx_runtime.jsx("button", {
												type: "button",
												className: "dshtk-iconbtn",
												title: t("close"),
												"aria-label": t("close"),
												onClick: () => setOpen(false),
												children: react_jsx_runtime.jsx("svg", {
													width: 13,
													height: 13,
													viewBox: "0 0 24 24",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: 2.2,
													strokeLinecap: "round",
													children: react_jsx_runtime.jsx("path", { d: "M6 6l12 12M18 6 6 18" })
												})
											})
										]
									}),
									react_jsx_runtime.jsxs("div", {
										className: "dshtk-body",
										children: [
											models.length > 0 ? (() => {
												const allLabel = t("all");
												const pillRow = (caption, options) => react_jsx_runtime.jsx("div", {
													className: "dshtk-pills",
													children: [
														react_jsx_runtime.jsx("span", { className: "dshtk-pill-caption", children: caption }),
														...options.map(([value, label, total, active, onClick]) => {
															const slash = label.lastIndexOf("/");
															const providerPart = slash > 0 ? label.slice(0, slash) : null;
															const modelPart = slash > 0 ? label.slice(slash + 1) : label;
															return react_jsx_runtime.jsxs("button", {
																type: "button",
																className: "dshtk-pill",
																"data-active": active || undefined,
																title: label,
																onClick,
																children: [
																	react_jsx_runtime.jsx("span", {
																		style: { overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 },
																		children: providerPart === null ? modelPart : react_jsx_runtime.jsxs(react.Fragment, {
																			children: [
																				react_jsx_runtime.jsx("span", { className: "dshtk-pill-provider", children: providerPart }),
																				"/",
																				modelPart
																			]
																		})
																	}),
																	react_jsx_runtime.jsx("span", { className: "dshtk-pill-total", children: `${formatCompact(total)} ${t("tokens")}` })
																]
															}, value);
														})
													]
												});
												const provTotal = (value) => value === "__all__"
													? (data?.all ? totalsOf(data.all).total : 0)
													: totalsOf(mergeTables(combos.filter((c) => c.provider === value).map((c) => data.byModel?.[c.key] ?? {}))).total;
												const mdlTotal = (value) => {
													const keys = combos.filter((c) => (value === "__all__" || c.model === value) && (provSel === "__all__" || c.provider === provSel)).map((c) => c.key);
													if (keys.length === 0) return 0;
													return keys.length === 1 ? totalsOf(data.byModel?.[keys[0]] ?? {}).total : totalsOf(mergeTables(keys.map((k) => data.byModel?.[k] ?? {}))).total;
												};
												if (hasProviders) {
													return react_jsx_runtime.jsxs(react.Fragment, {
														children: [
															pillRow(t("provider"), [
																["__all__", allLabel, provTotal("__all__"), provSel === "__all__", () => pickProvider("__all__")],
																...providers.map((p) => [p, p, provTotal(p), provSel === p, () => pickProvider(p)])
															]),
															pillRow(t("model"), [
																["__all__", allLabel, mdlTotal("__all__"), mdlSel === "__all__", () => setMdlSel("__all__")],
																...modelsForProv.map((m) => [m, m, mdlTotal(m), mdlSel === m, () => setMdlSel(m)])
															])
														]
													});
												}
												return pillRow(t("model"), [
													["__all__", allLabel, provTotal("__all__"), mdlSel === "__all__", () => setMdlSel("__all__")],
													...models.map((m) => [m, m, mdlTotal(m), mdlSel === m, () => setMdlSel(m)])
												]);
											})() : null,
											body
										]
									}),
									react_jsx_runtime.jsxs("div", {
										className: "dshtk-footer",
										children: [
											data !== null ? react_jsx_runtime.jsx("span", {
												children: t("updatedAt", { time: new Date(data.generatedAt).toLocaleTimeString() })
											}) : null,
											data !== null && models.length > 0
												? react_jsx_runtime.jsx("span", {
													children: models.map((m) => t("modelTotal", { model: m, total: formatInt(totalsOf(data.byModel?.[m] ?? {}).total) })).join("   ·   ")
												})
												: react_jsx_runtime.jsx("span", { children: t("weeks", { weeks: WEEKS }) })
										]
									})
								]
							}) : null
						]
					}),
					react_jsx_runtime.jsx(PriceModal, {
						t,
						open: pricesOpen,
						onClose: () => setPricesOpen(false),
						modelParts,
						onChanged: refresh
					})
				]
			});
		}

		/** Segmented Tokens / Cost toggle. */
		function ModeToggle({ t, mode, onMode }) {
			return react_jsx_runtime.jsx("div", {
				className: "dshtk-mode",
				role: "group",
				"aria-label": "mode",
				children: [["tokens", t("mode.tokens")], ["cost", t("mode.cost")]].map(([value, label]) => react_jsx_runtime.jsx("button", {
					type: "button",
					className: "dshtk-mode-btn",
					"data-active": mode === value || undefined,
					"aria-pressed": mode === value,
					onClick: () => onMode(value),
					children: label
				}, value))
			});
		}
		//#endregion

		//#region plugin entry
		/** Required services: slot machinery and the locale registry. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register the dictionaries and the top-right
		* header-utilities widget (same seat as the memory widget).
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const styleElement = document.createElement("style");
			styleElement.textContent = css;
			document.head.appendChild(styleElement);
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-token-stats: dictionaries");
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "token-stats",
				order: 10,
				locale: NS
			}, TokenStatsWidget));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
