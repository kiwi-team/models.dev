# 新模型价格配置指南

本文说明如何在本项目中新增模型及价格。适用于 ToIO 和其他 Provider，覆盖按 Token、按次、缓存、推理、音频、上下文分层、混合计费和特殊模式价格。

## 1. 核心规则

### 1.1 区分基础模型和 Provider 模型

| 类型 | 路径 | 内容 |
| --- | --- | --- |
| 基础模型元数据 | `models/<lab-id>/<model-id>.toml` | 名称、能力、模态、限制、发布日期等与 Provider 无关的信息 |
| Provider 模型 | `providers/<provider-id>/models/.../<api-model-id>.toml` | Provider 价格、推理控制、状态和真实差异 |

`cost` 是 Provider 专属字段，不能写入 `models/`。

如果 Provider 不是模型开发方，Provider 模型必须使用：

```toml
base_model = "<lab-id>/<model-id>"
```

文件名去掉 `.toml` 后就是模型 ID。TOML 中不要写 `id` 字段。

### 1.2 所有价格必须是 USD

- Token 价格单位：USD/百万 Token。
- `request` 价格单位：USD/次。
- 其他货币必须先换算为 USD。
- 汇率、换算日期和价格来源写在文件第一行开始的注释中。
- 不确定计费单位时不要猜测，也不要把 CNY、EUR 等数值直接当成 USD。

## 2. 开始前收集信息

新增模型前至少确认：

- Provider API 使用的模型 ID。
- 模型实际开发方和基础模型 ID。
- 官方模型名称与说明。
- 发布日期和最近更新时间。
- 输入和输出模态。
- 上下文长度和最大输出长度。
- 是否支持附件、推理、工具调用和开放权重。
- 价格币种和计费单位。
- 输入、输出、缓存、推理、音频等价格明细。
- 是否存在上下文长度分层价格。
- 是否存在固定按次费用。
- 推理模型在当前 Provider 上支持哪些控制方式。
- 价格来源 URL 或本地来源文件及访问日期。

## 3. 确定 ToIO 模型和基础模型

### 3.1 检查 ToIO 模型文件

```bash
rg -n "<api-model-id>" providers/toio/models
```

如果文件已经存在，更新这个 ToIO 模型文件；如果不存在，准备创建新文件。

### 3.2 确定基础模型

根据模型开发方、版本和官方文档确定 `<lab-id>/<model-id>`，然后搜索基础模型元数据：

```bash
rg -n "<model-id>|base_model = \"<lab-id>/<model-id>\"" models providers
```

### 3.3 决定要创建的文件

| 情况 | 操作 |
| --- | --- |
| ToIO 模型文件已经存在 | 更新该文件中的 ToIO 价格和真实 Provider 差异 |
| 基础模型元数据存在，但 ToIO 模型文件不存在 | 新增 ToIO Provider 模型并指向已有 `base_model` |
| 基础模型元数据不存在 | 先新增完整基础模型，再新增 ToIO Provider 模型和价格 |
| 不能确认模型开发方或版本 | 暂停配置，先查官方模型身份 |

## 4. 新增基础模型元数据

如果 `models/<lab-id>/<model-id>.toml` 不存在，先创建完整基础模型文件：

```toml
name = "Example Model"
description = "模型的用途、定位和主要能力"
family = "example"
release_date = "2026-08-21"
last_updated = "2026-08-21"
attachment = false
reasoning = false
temperature = true
tool_call = false
structured_output = false
open_weights = false

[limit]
context = 128_000
output = 16_384

[modalities]
input = ["text"]
output = ["text"]
```

新基础模型必须提供：

- `name`
- `description`
- `release_date`
- `last_updated`
- `attachment`
- `reasoning`
- `tool_call`
- `open_weights`
- `[limit]`
- `[modalities]`

不要为了通过验证填写猜测值。无法确认时应继续查找官方资料。

## 5. 新增 Provider 模型

路径：

```text
providers/<provider-id>/models/.../<api-model-id>.toml
```

第三方 Provider 的最小配置通常是：

```toml
# Pricing: https://example.com/pricing (accessed 2026-08-21)
base_model = "<lab-id>/<model-id>"

[cost]
input = 1.00
output = 4.00
```

使用 `base_model` 后，只写 Provider 的真实差异。不要重复基础模型中相同的 `name`、`description`、日期、能力、模态或限制。

如果 Provider 的限制确实不同，可以覆盖对应字段：

```toml
base_model = "<lab-id>/<model-id>"

[limit]
context = 64_000
output = 8_192

[cost]
input = 1.00
output = 4.00
```

如果需要删除继承字段：

```toml
base_model = "<lab-id>/<model-id>"
base_model_omit = ["limit.input"]
```

## 6. 支持的价格类型

`[cost]` 支持以下字段：

| 字段 | 单位 | 用途 |
| --- | --- | --- |
| `input` | USD/百万 Token | 普通输入 Token |
| `output` | USD/百万 Token | 普通输出 Token |
| `request` | USD/次 | 固定单次请求费用 |
| `reasoning` | USD/百万 Token | 单独计价的推理 Token |
| `cache_read` | USD/百万 Token | 缓存读取 Token |
| `cache_write` | USD/百万 Token | 缓存写入 Token |
| `input_audio` | USD/百万音频 Token | 音频输入 Token |
| `output_audio` | USD/百万音频 Token | 音频输出 Token |

必须遵守以下约束：

- `input` 和 `output` 必须同时出现。
- 只有 `request` 的模型应省略 `input` 和 `output`。
- `[cost]` 至少包含一组 Token 价格或一个 `request` 价格。
- `reasoning`、缓存和音频价格不能脱离 `input`/`output` 单独存在。
- 所有价格必须大于或等于 `0`。
- 免费 Token 模型仍要同时写 `input = 0` 和 `output = 0`。
- 输出免费的嵌入模型应写 `output = 0`，不能省略 `output`。

## 7. 各类价格配置模板

### 7.1 标准按 Token 计费

```toml
[cost]
input = 1.25
output = 10.00
```

### 7.2 免费 Token 模型

```toml
[cost]
input = 0
output = 0
```

### 7.3 输入计费、输出免费

常见于嵌入模型：

```toml
[cost]
input = 0.10
output = 0
```

### 7.4 缓存读取和写入

```toml
[cost]
input = 2.00
output = 8.00
cache_read = 0.20
cache_write = 2.50
```

只配置 Provider 明确公布的缓存价格。不要根据输入价格自行猜测倍率。

### 7.5 推理 Token 单独计价

```toml
[cost]
input = 1.00
output = 4.00
reasoning = 4.00
```

只有模型 `reasoning = true` 时才能配置 `cost.reasoning`。`reasoning` 价格和 `reasoning_options` 是不同概念：前者是价格，后者是 API 控制方式。

### 7.6 音频 Token 价格

```toml
[cost]
input = 0.50
output = 2.00
input_audio = 8.00
output_audio = 16.00
```

音频字段也是每百万音频 Token 的 USD 价格。按音频秒数或分钟计费不能直接写入 `input_audio`。

### 7.7 固定按次计费

适用于每次 API 请求都有固定费用，并且一次请求就是一个稳定计费单位的模型：

```toml
[cost]
request = 0.24
```

示例：

```toml
# Pricing: toio-model-price.json (accessed 2026-08-20)
base_model = "lightricks/ltx-2.3-pro"

[cost]
request = 0.24
```

### 7.8 免费按次模型

```toml
[cost]
request = 0
```

只有价格源明确表示免费时才能这样配置。

### 7.9 Token 加固定请求费

如果 Provider 同时收取 Token 费用和固定请求费：

```toml
[cost]
input = 1.00
output = 4.00
request = 0.01
```

不要因为模型存在最低消费就自动使用 `request`。只有固定费用独立于 Token 用量时才适用。

### 7.10 按上下文长度分层计费

基础价格写在 `[cost]`，超过阈值后的完整价格写入 `[[cost.tiers]]`：

```toml
[cost]
input = 2.50
output = 15.00
cache_read = 0.25

[[cost.tiers]]
tier = { type = "context", size = 200_000 }
input = 5.00
output = 22.50
cache_read = 0.50
```

多个阈值使用多个 tier：

```toml
[cost]
input = 1.00
output = 4.00

[[cost.tiers]]
tier = { type = "context", size = 128_000 }
input = 2.00
output = 8.00

[[cost.tiers]]
tier = { type = "context", size = 512_000 }
input = 4.00
output = 16.00
```

注意：

- `size` 是该价格档开始生效的上下文长度。
- 同一个模型不能出现重复 `size`。
- 每个 tier 都要写完整的 `input` 和 `output`。
- TOML 中不要写 `cost.context_over_200k`，这是生成器提供给旧消费者的兼容字段。

### 7.11 特殊模式价格

如果同一模型 ID 通过真实 API 参数启用高速、优先级或其他模式，可以配置实验模式价格：

```toml
[cost]
input = 5.00
output = 25.00
cache_read = 0.50

[experimental.modes.fast]
cost = { input = 30.00, output = 150.00, cache_read = 3.00 }
provider = { body = { service_tier = "priority" } }
```

只有当前 Provider 确实支持该请求参数时才配置。不要把完全不同的模型 ID 当成一个模式。

## 8. 当前 Schema 无法准确表达的价格

以下计费方式不能在没有额外约束时直接写成固定 `request`：

- 按图片张数计费，而且一次请求可生成多张图片。
- 按图片分辨率、质量或尺寸动态计费。
- 按视频秒数、帧数或分辨率计费。
- 按音频秒数或分钟计费。
- 按字符、字节、搜索次数或工具调用次数计费。
- 价格由复杂表达式决定，且无法转换为上下文 tier。
- 同一个 API 模型 ID 根据请求参数出现多种无法枚举的价格。

处理方法：

1. 如果不同计费规格有不同且稳定的 API 模型 ID，可以分别创建 Provider 模型文件，并为每个 ID 配置固定 `request`。
2. 如果请求模式能由固定请求参数启用，可以评估使用 `experimental.modes`。
3. 如果价格随数量、时长或分辨率变化，当前 Schema 不能无损表达时，不要发布一个误导性的固定价格。
4. 确实需要支持新单位时，应先扩展 Schema、SDK、序列化器、网页展示和测试，再添加价格数据。

## 9. ToIO 价格转换

当前 `toio-model-price.json` 使用以下规则。每次导入前必须重新确认价格元数据没有变化。

### 9.1 按次价格

当：

```text
quota_type = 1
```

使用：

```text
request = model_price
```

例如：

```json
{
  "model_name": "ltx-2-3-pro",
  "quota_type": 1,
  "model_price": 0.24
}
```

转换为：

```toml
[cost]
request = 0.24
```

### 9.2 Token 价格

当前 ToIO 配置中：

```text
quota_per_unit = 500000
quota_display_type = USD
```

因此：

```text
input  = model_ratio * 2
output = input * completion_ratio
cache_read = input * cache_ratio
cache_write = input * create_cache_ratio
```

只在对应 ratio 存在且语义明确时写缓存字段。

### 9.3 复杂表达式

如果存在 `billing_expr` 或 `billing_mode = "tiered_expr"`：

1. 先读懂表达式中的变量和阈值。
2. 上下文长度分层转换为 `[[cost.tiers]]`。
3. 固定请求费和 Token 费并存时使用混合配置。
4. 不能无损转换时不要使用简单倍率公式。

### 9.4 ToIO 新模型配置流程

1. 在 ToIO 价格数据中找到准确的 `model_name`。
2. 确认 `quota_type`、价格字段、币种和计费单位。
3. 确认模型开发方和基础模型 ID。
4. 基础模型元数据不存在时，先创建完整的 `models/<lab-id>/<model-id>.toml`。
5. 创建或更新 `providers/toio/models/<model_name>.toml`。
6. 按本节规则转换并填写 ToIO 价格。
7. 运行验证并检查生成结果。

## 10. 推理模型配置

当基础模型设置：

```toml
reasoning = true
```

Provider 模型必须配置 `reasoning_options`。

### 10.1 固定档位

```toml
reasoning_options = [
  { type = "effort", values = ["low", "medium", "high"] },
]
```

### 10.2 二进制开关

```toml
# Toggle: thinking.type = enabled|disabled
reasoning_options = [
  { type = "toggle" },
]
```

### 10.3 推理 Token 预算

```toml
# Budget: thinking_budget (integer reasoning tokens)
reasoning_options = [
  { type = "budget_tokens", min = 1_024, max = 32_768 },
]
```

要求：

- 选项必须是当前 Provider API 真实支持的控制方式。
- 不要默认所有推理模型都支持 `low`、`medium`、`high`。
- 不支持用户控制但始终推理的模型使用 `reasoning_options = []`。
- `toggle` 的确切请求字段必须写在文件顶部注释中。
- `max_tokens` 不是推理预算，不能因此添加 `budget_tokens`。

## 11. 来源与注释

价格来源和换算依据应放在 TOML 第一项之前：

```toml
# Pricing: https://example.com/pricing (accessed 2026-08-21)
# Currency conversion: CNY to USD at 7.20 CNY/USD on 2026-08-21.
# Calculation: 18 CNY / 7.20 = 2.50 USD per million input tokens.
base_model = "example/example-model"
```

原因：同步器可能删除中间注释，但会保留文件顶部的连续注释块。

## 12. 新增 Provider

如果 Provider 本身还不存在，需要创建：

```text
providers/<provider-id>/
  provider.toml
  logo.svg
  models/
```

`provider.toml` 示例：

```toml
name = "Example Provider"
npm = "@ai-sdk/openai-compatible"
env = ["EXAMPLE_API_KEY"]
api = "https://api.example.com/v1"
doc = "https://example.com/docs"
```

`logo.svg` 必须使用 `currentColor`，不能写固定宽高，推荐使用正方形 `viewBox`。

## 13. 验证步骤

每次修改完成后执行：

```bash
bun validate
git diff --check
```

建议再检查目标模型生成结果：

```bash
rg -n "<api-model-id>" providers/<provider-id>/models
```

涉及 Schema、SDK 或网页价格展示时，还要执行相关测试和网页构建：

```bash
bun test packages/core/test/schema.test.ts
bun test packages/core/test/sync.test.ts
bun test packages/web/src/shared.test.ts

cd packages/web
bun run build
```

## 14. 最终检查清单

- [ ] ToIO API 模型 ID 与文件路径一致。
- [ ] 已确认正确的模型开发方和基础模型 ID。
- [ ] ToIO 价格字段与来源数据一致。
- [ ] 第三方 Provider 使用了正确的 `base_model`。
- [ ] 缺失的基础模型元数据已经完整创建。
- [ ] `cost` 只写在 Provider 模型中。
- [ ] 价格币种全部是 USD。
- [ ] Token 价格单位全部是 USD/百万 Token。
- [ ] `request` 单位是 USD/次。
- [ ] `input` 和 `output` 同时存在。
- [ ] 缓存、推理和音频价格没有脱离 Token 基础价格。
- [ ] 上下文分层使用 `[[cost.tiers]]`。
- [ ] 没有手写 `cost.context_over_200k`。
- [ ] 动态数量、时长或分辨率价格没有误写成固定 `request`。
- [ ] 推理模型配置了当前 Provider 的真实 `reasoning_options`。
- [ ] 文件顶部记录了价格来源、访问日期和换算依据。
- [ ] Provider 文件只包含真实覆盖字段。
- [ ] `bun validate` 通过。
- [ ] `git diff --check` 通过。

## 15. 常见错误

### 错误：只按 API ID 判断模型不存在

后果：可能创建重复的基础模型元数据，或把 ToIO 路由指向错误模型。

修正：搜索模型名称、别名和 `base_model`，确认开发方和版本。

### 错误：把按视频秒数价格写成 `request`

后果：不同视频时长显示同一个错误价格。

修正：只有一次请求等于一个固定计费单位时才使用 `request`。

### 错误：只写输入价格

```toml
[cost]
input = 1.00
```

修正：必须同时写输出价格；输出免费时写 `output = 0`。

### 错误：在基础模型中写价格

```toml
# models/example/example-model.toml
[cost]
input = 1.00
output = 4.00
```

修正：把价格移动到 `providers/<provider-id>/models/...`。

### 错误：复制整个基础模型到 Provider 文件

后果：同一元数据出现多份，后续容易漂移。

修正：使用 `base_model`，Provider 文件只保留价格和真实差异。

### 错误：直接写 `context_over_200k`

修正：使用 `[[cost.tiers]]`，兼容字段由生成器自动产生。
