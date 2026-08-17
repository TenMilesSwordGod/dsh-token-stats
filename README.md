# dsh-token-stats

DeepSeek Harness Web UI 插件：按 **provider / model** 统计每天消耗的 tokens 与费用，渲染成 **GitHub 风格贡献热力图**，支持深夜分时计价、价格表编辑与 **OpenRouter 实时价格同步**。

右上角悬浮部件（与记忆系统同一 slot），点开即看：

- 🗓️ **贡献热力图**：近 53 周、每天一格，颜色深浅 = 当天用量（5 套配色、深浅模式自适应、切换动画）
- 🏷️ **provider / model 两级筛选**：服务商 → 模型，逐项看用量
- 💰 **费用估算**：输入 / 输出 / 缓存读 / 缓存写 **分开计价**（USD / 1M tokens），缓存读写独立计费
- 🌙 **深夜折扣**：按每个事件的实际发生时间（UTC）自动应用分时价格（如 DeepSeek UTC 16:30–00:30 ×0.5）
- 🔄 **价格表更新**：内置默认价 → 手动编辑 → 一键从 OpenRouter 同步最新价格，持久化到 `$DSH_HOME/storages/token-stats-prices.json`

---

## 安装

### 0. 从 GitHub Release 安装（推荐）

每个 `v*` 标签会自动构建并发布 `dsh-token-stats.tgz`（GitHub Actions），一条命令装进 profile：

```bash
bash <(curl -sL https://raw.githubusercontent.com/TenMilesSwordGod/dsh-token-stats/main/scripts/deploy-release.sh)
```

或克隆后手动执行：

```bash
git clone https://github.com/TenMilesSwordGod/dsh-token-stats.git
./dsh-token-stats/scripts/deploy-release.sh         # 默认 latest release + ~/.dsh/profiles/web
./dsh-token-stats/scripts/deploy-release.sh v0.1.0  # 指定版本
```

脚本会：下载 Release 产物 → 注册 `cordis.patch.yml` 插件行（幂等）→ `pnpm add` 装进 profile。之后**重启一次 `dsh web`** 即可。

### 1. 手动安装（开发用）

**方式 A（推荐，跟随 profile 依赖管理）**

在 `/home/liheng/.dsh/profiles/web/package.json` 的 `dependencies` 中加入：

```json
"@deepseek-ai/dsh-token-stats": "file:/path/to/dsh-token-stats"
```

然后在 profile 目录执行：

```bash
cd /home/liheng/.dsh/profiles/web && pnpm install
```

**方式 B（快速）**

将包软链到 profile 的模块兜底目录：

```bash
ln -sfn /path/to/dsh-token-stats /home/liheng/.dsh/profiles/node_modules/@deepseek-ai/dsh-token-stats
```

### 2. 注册插件

在 `/home/liheng/.dsh/profiles/web/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: token-stats
      name: '@deepseek-ai/dsh-token-stats'
```

### 3. 重启 `dsh web`

宿主端（会话日志聚合、价格表、API）在启动时加载，需要重启一次：

```bash
dsh web
```

客户端 bundle 按请求读盘，之后改代码**刷新页面即可**（无需重启）。

---

## 使用

1. 右上角出现 **「Token 用量」** 胶囊（显示今日用量），点击展开面板
2. **Tokens / 费用** 切换：费用模式卡片与热力图按金额着色
3. **服务商 / 模型** 两级胶囊筛选，每个胶囊带该维度的总量
4. 悬停任意格子：tooltip 显示当天明细（输入/输出/缓存读/缓存写各自的 tokens 与费用）
5. 面板头部的 **💰 价格按钮** 打开价格设置：
   - 每个模型 4 个单价（输入/输出/缓存读/缓存写，USD / 1M）
   - 深夜折扣开关 + 倍率 + UTC 时段
   - 「同步最新价格」：从 OpenRouter 拉取并匹配你使用过的模型
   - 「恢复默认」：单行还原内置默认价

---

## 数据来源与计费口径

- **数据来源**：`$DSH_HOME/sessions` 下所有会话日志（`session.jsonl.zstd` / `session.jsonl`），聚合 `request/header`（provider/model）与 `assistant/message` / `assistant/chunk` 的 usage 上报
- **tokens**：`total = 输入 + 输出 + 缓存读 + 缓存写`（reasoning 计入输出，不重复计）
- **费用**：每个 usage 样本按事件发生时刻应用对应价格；若落入该模型的深夜折扣时段，输入与缓存写按折扣倍率计价
- 同一 turn/step 的多次 usage 上报**去重**（后者替换前者），不会重复计费

## HTTP API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/token-stats` | 聚合数据：byModel/all 逐日 bucket（含 `cost` 分量）+ 已解析价格 |
| GET | `/token-stats/prices` | 当前价格表（默认 + 已保存合并） |
| POST | `/token-stats/prices` | 保存价格 `{ "models": { "<key>": <entry> \| null } }`（null = 删除/恢复默认） |
| POST | `/token-stats/prices/sync` | 从 OpenRouter 同步 `{ "models": ["<modelId>", ...] }` |

价格条目格式：

```json
{
  "input": 0.14,
  "output": 0.28,
  "cacheRead": 0.028,
  "cacheWrite": 0.14,
  "offPeak": { "multiplier": 0.5, "startUtc": 16.5, "endUtc": 24.5 }
}
```

单位：**USD / 1M tokens**；`offPeak` 时段为 UTC 小时（浮点），`endUtc` 可 > 24 表示跨午夜。

---

## 目录结构

```
dsh-token-stats/
├── package.json          # dsh.client 声明 + peerDependencies
└── lib/
    ├── index.js          # 宿主端：扫描会话日志、聚合、价格表、API 路由
    └── client.js         # 浏览器端：右上角部件（window.__ModuleLoader__ 格式）
```

## 开发

- 修改 `lib/*.js` 后，需同步到已安装副本（`cp lib/*.js <profile-node_modules>/@deepseek-ai/dsh-token-stats/lib/`）或重新 `pnpm install`
- **宿主端**改动（`index.js`）需重启 `dsh web`；**客户端**改动（`client.js`）刷新页面即可
- 快速检查：`node --check lib/index.js lib/client.js`
- 测试：`npm test`（`scripts/smoke-host.mjs` 冒烟 + `test/host.test.mjs` 单元测试，覆盖计价/价格表/日志扫描/路由/缓存/同步）
- 无头浏览器 E2E：可用本地 HTTP 服务（代理真实 `/token-stats`）+ Chrome CDP 驱动，验证面板/费用/价格弹窗渲染

## License

[MIT](./LICENSE)
