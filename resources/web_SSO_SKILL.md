---
name: web-sso-integration
description: "为 Booster 的 Web 业务接入或迁移公司统一 SSO。当任务涉及 PKCE 登录、OAuth 回调、Token 存储与刷新、路由鉴权，或存量应用旧 Token 和 region 合规迁移时使用。适配目标项目现有技术栈，不依赖任何特定业务仓库。"
---

# Web SSO 接入

为目标 Web 应用接入公司统一 SSO。以目标项目的技术栈、目录、认证存储和请求封装为准，做最小改动。

本文档已经包含完成接入所需的环境地址、授权参数、Token 接口和浏览器部署要求，不依赖其他本地文件。需要核对最新服务端定义时，可查看 SSO 接口文档：

`https://booster.feishu.cn/wiki/ISvZw0tX8in4Q8kgx7hcpqZhn8g`

## 先判断接入模式

- **纯 Web SPA / 公开客户端**：使用本 Skill 的浏览器端 Authorization Code + PKCE 全流程。
- **已有 BFF 或服务端会话**：不要把 Token 改存到浏览器。保留服务端持有 verifier、换 Token 和会话 Cookie 的架构，只复用本 Skill 的授权参数、安全校验和验收要求；需要先确认后端接口约定。
- **无法判断**：检查现有登录回调、Cookie、服务端路由和 Token 存储后再决定，不能因为项目有 Web 页面就默认使用 SPA 方案。

## 先了解目标项目

修改前读取目标仓库的 `AGENTS.md`、代码规范和测试要求，并定位：

- 构建工具及环境变量规则。
- 路由入口、受保护路由和通配路由。
- 当前登录流程、Token 存储 key 和退出逻辑。
- 业务请求封装、401 / 403 处理和并发请求行为。
- 当前应用是新应用，还是浏览器中可能保留旧 Token 的存量应用。

优先复用目标项目已有模块和模式。不要预设 React、Vite、固定目录或固定文件名；示例代码按目标技术栈改写。

## 编码前提

开始任何代码修改前，必须先从用户输入中取得：

1. 目标业务的 `client_id`。
2. 目标项目明确的 `callbackPath`。它必须是页面路由并以 `/` 开头；禁止使用 `/oauth`、`/oauth/*`、`/api` 或其他接口前缀，避免与 Token API 和业务 API 冲突。没有项目约定时可建议 `/sso/callback`，但必须由用户确认。

任一值缺失时，不执行接入、不修改环境变量或代码，也不猜测或自行选择。直接请用户先前往 SSO 配置平台创建或补全公开客户端：

`https://api-dev.booster.tech/admin/oauth/oauthclient/`

提示用户在平台填写 Client ID，并将各环境的 `window.location.origin + callbackPath` 完整地址加入 Redirect uris 白名单。用户带回 `client_id` 和确认后的 `callbackPath` 后再继续。

取得这两个值后再确认：

1. 目标业务已在 [SSO 配置平台](https://api-dev.booster.tech/admin/oauth/oauthclient/) 创建或选定公开客户端。
2. 各环境最终使用的完整 `redirect_uri` 已加入 Redirect uris 白名单；协议、域名、端口、路径和末尾斜杠都必须匹配。
3. 登录请求、换 Token 请求和配置平台中的 `redirect_uri` 完全一致。

除非用户明确要求，不修改 SSO 配置平台。

本地回调包含端口时，固定开发服务器端口并开启等价于 Vite `strictPort` 的行为；端口被占用时直接报错，不能自动漂移到未登记端口。

## 实施流程

### 1. 配置接入参数

目标项目通常只需要配置 SSO 登录站、SSO API 和 Client ID，并集中定义用户确认的 `callbackPath`。Redirect URI 默认由当前业务站点的 `window.location.origin + callbackPath` 生成，不要求接入方为每个环境填写变量。先沿用项目现有的配置方式；不能因为项目没有环境变量文件就擅自新增 `.env`、改构建命令或引入新的配置系统。

按以下顺序选择配置载体：

1. 复用现有配置模块、环境变量、运行时配置或部署注入方式。
2. 项目没有配置机制且部署环境固定时，允许把 SSO 地址、API 地址、Client ID 和回调路径集中写在一个配置模块中；这些是公开信息，但不能散落在登录、回调和刷新代码里。
3. 只有多环境值确实不同且现有方式无法表达时，才增加最小必要的环境配置或运行时配置，并同步目标项目的构建、部署和说明文件。
4. `client_secret`、Token 和其他密钥在任何情况下都不能进入 Web 前端源码、环境变量或构建产物。

如果目标项目使用 Vite 环境变量，可以配置：

```ini
VITE_SSO_BASE_URL=<SSO 登录站 origin>
VITE_SSO_API_BASE_URL=<SSO API origin>
VITE_SSO_CLIENT_ID=<目标业务 client_id>
```

公司 SPA 环境地址：

| 环境 | SSO 登录站 | SSO API |
| --- | --- | --- |
| 开发 | `https://sso-dev.booster.tech` | `https://api-dev.booster.tech` |
| 生产 | `https://sso.booster.tech` | `https://api.booster.tech` |

以上地址于 2026-09-01 确认。开发登录站使用 `sso-dev.booster.tech`，不要使用旧地址 `sso-dev-new.booster.tech`；如果接口文档与此处不一致，先向 SSO 负责人核实，不能自行切换。

不要把 `/sso/callback` 固定到所有项目中，它只能作为建议值。使用用户确认的 `callbackPath`，并再次检查它没有占用 `/oauth`、`/api` 等接口前缀，再在运行时使用当前业务站点 origin 生成完整 Redirect URI。本地、开发、预发和生产会自动各回各的，但每个实际生成的完整地址仍必须提前登记到 Client ID 的 Redirect uris 白名单中。

不要默认增加 Redirect URI 环境变量。只有应用部署在子路径、回调不跟随当前 origin，或项目已有明确的运行时回调配置时才允许覆盖；发起登录和换 Token 必须调用同一个方法取得最终地址。

登录站只用于页面跳转，SSO API 用于换取和刷新 Token。前端构建配置是公开信息，只能放地址和 Client ID，禁止放 `client_secret`。

配置前先列出目标项目的部署矩阵：本地开发、开发部署、预发和生产分别使用什么构建命令与 mode，是否复用同一份产物，运行时 hostname 是什么，以及 SSO API 走相对代理还是绝对地址。然后按以下规则落值：

- Vite 的 `.env.<mode>` 是构建期输入；`vite build --mode development` 也会读取 `.env.development`，其中的值会写入产物，不能把它误认为只服务于本地开发服务器。
- 预发与生产复用同一份产物时，不能依靠两套构建期环境变量区分。需要不同值时，使用项目已有的运行时配置；只有 hostname 稳定且规则已确认时，才按 hostname 选择。
- 本地开发与开发部署共用一个 mode，但本地需要代理、部署需要直连时，可让 `localhost` / `127.0.0.1` 固定返回相对 API 地址走开发服务器代理，其他 hostname 读取构建配置中的绝对 API 地址。本地判断的优先级应高于环境变量。
- 本地和部署回调路径相同时，优先用 `window.location.origin + callbackPath` 生成 Redirect URI，并分别将实际完整地址加入白名单，避免把部署域名烤进本地产物。
- 是否提交 `.env.development`、`.env.production` 由目标仓库规则决定。`.env.example` 写说明或占位值；只有确认属于公开配置时才能提交实际地址和 Client ID，任何密钥都不能提交。

### 2. 处理存量应用旧 Token

合规改造要求账号补齐 `region`，所有存量账号必须重新经过一次 SSO 登录。

如果目标应用以前自行实现过登录，在应用启动和旧登录态判断之前执行一次性迁移：

```ts
const OLD_TOKEN_MIGRATION_KEY = 'has_cleared_old_token'

if (localStorage.getItem(OLD_TOKEN_MIGRATION_KEY) !== 'true') {
  // 使用目标应用真实的旧认证 key；不要照抄占位名称
  localStorage.removeItem(OLD_ACCESS_TOKEN_KEY)
  localStorage.removeItem(OLD_REFRESH_TOKEN_KEY)

  localStorage.setItem(OLD_TOKEN_MIGRATION_KEY, 'true')
  const { pathname, search, hash } = window.location

  // 复用鉴权守卫对公开/受保护路由的判断，不要另写一份路径名单
  if (routeRequiresAuth(pathname)) {
    await startSsoLogin(`${pathname}${search}${hash}`)
    return
  }
}
```

无论旧 Token 是否仍有效，首次进入迁移版本都要：

1. 仅删除目标应用的旧认证数据，不调用 `localStorage.clear()`。
2. 写入 `has_cleared_old_token=true`。
3. 复用鉴权守卫的路由定义判断当前页面是否需要鉴权，不能为迁移逻辑单独维护另一份路径名单。
4. 当前是受保护页面时才跳转 SSO，并保留当前站内页面。
5. 当前是公开页面时继续访问，不得因为清理旧 Token 强制登录；之后进入受保护页面时再由鉴权守卫进入 SSO。
6. 后续访问看到标记后不再重复清理。

新应用没有历史 Token，不添加该逻辑。

### 3. 实现配置和 PKCE 工具

集中读取 SSO 登录站、SSO API 和 Client ID，去除 origin 末尾多余 `/`；集中定义回调路径，并由当前业务站点 origin 生成 Redirect URI。

实现：

- 随机 `code_verifier`，长度符合 RFC 7636 的 43～128 字符要求。
- `code_challenge = base64url(SHA-256(code_verifier))`。
- 随机 nonce，用于 state 校验。
- URL-safe base64 编解码。

`code_verifier` 只保存在当前标签页的 `sessionStorage`，不得进入 URL、日志或埋点。

`sessionStorage` 是标签页级存储。新标签页直接打开受保护路由时会生成自己的 PKCE 上下文并重新进入 SSO；当前 SSO 不维护中央登录状态，因此这是预期行为。

### 4. 发起登录

每次登录：

1. 生成 verifier、challenge 和 nonce。
2. 在 `sessionStorage` 保存 verifier 和 nonce。
3. 把 nonce 和可选的登录前站内路径 `returnTo` 编入 `state`。
4. 跳转 `${SSO_BASE_URL}/login`。

登录 URL 包含：

```text
client_id=<client_id>
redirect_uri=<redirect_uri>
response_type=code
code_challenge=<code_challenge>
code_challenge_method=S256
state=<state>
next=/oauth/authorize
lang=cn|en
```

必须满足：

- 同一页面生命周期内的并发登录触发只执行一次，避免覆盖 PKCE 上下文。
- `returnTo` 只接受以 `/` 开头的本站相对路径，拒绝 `//`、绝对 URL 和回调页自身。
- `state` 不存放 Token、用户资料等敏感数据。
- Web Crypto 不可用时提示使用 `localhost` 或 HTTPS，不无限加载。

### 5. 增加鉴权守卫和公开回调

- 所有受保护业务路由统一套鉴权守卫。
- 无 Access Token 时，将当前 `pathname + search + hash` 传给登录流程。
- 跳转期间不渲染业务内容。
- 回调路由不套鉴权守卫，并注册在通配路由之前。

回调处理顺序：

1. 一次性读取 `code`、`state`、`error` 和 `error_description`。
2. 立即清理地址栏查询参数。
3. 读取并删除本地登录上下文。
4. 校验 state nonce；失败时不请求 Token。
5. 用 code 和 verifier 换取 Token。
6. 保存 Token，校验 `returnTo` 后返回登录前页面；无合法路径时回首页。
7. 失败时显示可重试状态，日志中不输出 code 或 Token。

授权码只能使用一次。框架的开发检查机制可能重复执行生命周期回调，必须保证换 Token 只执行一次；不要为解决局部问题随意关闭目标项目的全局开发检查。

部署环境必须为回调路径提供 SPA fallback，直接打开完整回调 URL 时也要返回应用入口，不能返回 404。不要未经用户授权新增 nginx、CDN 或其他部署配置；发现缺少 fallback 时，明确告知业务方需要配置的行为。

### 6. 实现认证客户端和 Token 存储

向 `${SSO_API_BASE_URL}/oauth/token` 发送 JSON：

```json
{
  "grant_type": "authorization_code",
  "client_id": "<client_id>",
  "code": "<code>",
  "code_verifier": "<code_verifier>",
  "redirect_uri": "<redirect_uri>"
}
```

换 Token 成功响应是 OAuth 平铺结构：

```json
{
  "access_token": "<access_token>",
  "refresh_token": "<refresh_token>",
  "token_type": "Bearer",
  "expires_in": 0,
  "scope": "<scope>"
}
```

OAuth 错误响应可能包含 `error` 和 `error_description`。统一处理超时、网络错误、非 JSON 响应和 OAuth 错误；收到 2xx 但没有非空 `access_token` 时也必须判定失败。认证端点使用独立客户端，除非目标项目的请求层已经能正确处理 OAuth 平铺响应。

`expires_in` 是可选字段，当前 Web 接入不依赖它启动定时刷新，只在业务请求出现未授权时刷新。尤其不要把 `expires_in: 0` 直接解释为需要立即刷新；若业务要做主动刷新，先确认服务端对该字段的定义。

将 Token 读写集中到一个模块。若使用 `localStorage`，要评估 XSS 风险；安全要求更高时与后端评估 BFF + HttpOnly Cookie，不在前端单方面改变会话协议。

当前 SSO 不维护中央登录状态，每次进入登录站都按未登录处理。业务退出只清除本业务的 Token 和未完成的登录上下文，无需接入中央注销。

客户端写完后，先在开发环境验证端点和响应协议，避免凭路径名称猜测：

```bash
curl -i -X POST "$SSO_API_BASE_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -i -X POST "$SSO_API_BASE_URL/api/v1/auth/token/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh":"invalid-probe"}'
```

当前预期是：空换 Token 请求到达 OAuth 端点并返回 400 类 OAuth 错误；无效 Refresh Token 到达刷新端点并返回 401 类业务错误。出现 404、HTML 页面或重定向到登录页，说明域名或路径错误。只对开发环境使用无效占位值探测，不向日志或命令历史写入真实 Token。

### 7. 接入业务请求和 401 刷新

业务请求发送前读取最新 Access Token：

```http
Authorization: Bearer <access_token>
```

先确认目标业务怎样表达“未授权”：有的接口使用 HTTP 401，有的使用 HTTP 200 加业务信封 `code: 401`。请求层应将项目实际采用的形式归一为未授权，再进入同一套刷新流程；不能只凭本 Skill 假定所有非零业务码都需要重新登录。

业务接口判定为未授权时：

1. 有 Refresh Token 才请求 `${SSO_API_BASE_URL}/api/v1/auth/token/refresh`，请求体为 `{ "refresh": "<refresh_token>" }`。
2. 并发 401 共享同一个刷新任务，只发起一次刷新。
3. 同时保存响应中的新 Access Token 和新 Refresh Token，适配 Refresh Token 轮换。
4. 使用最新 Access Token 重放原请求一次。
5. 无 Refresh Token、刷新失败或重放后仍为 401 时，清理登录态并重新走 SSO。
6. 403 按无权限处理，不触发重新登录。

刷新请求不要进入业务请求的 401 刷新拦截器，避免循环。

刷新成功响应使用业务信封，与换 Token 接口不同：

```json
{
  "code": 0,
  "message": "",
  "data": {
    "access": "<new_access_token>",
    "refresh": "<new_refresh_token>"
  }
}
```

Refresh Token 会轮换，刷新成功后必须同时保存 `data.access` 和 `data.refresh`。

### 8. 确认浏览器网络链路

跳转登录站是页面导航，不受 XHR CORS 限制。换 Token 和刷新 Token 是浏览器请求，需要满足以下一种方式：

- SSO API 放行业务站点 Origin、`POST` 和 `Content-Type`。
- 本地开发使用项目已有开发服务器代理，将 `/oauth` 和 `/api/v1/auth/*` 转发到开发 SSO API。

如果目标项目已有反向代理或 BFF，沿用现有链路，不重复增加代理。登录站只返回前端页面，不能把登录站的 `/oauth/*` 当作 Token API。

## 验证

根据目标项目测试框架覆盖：

- PKCE challenge 符合 RFC 7636，verifier 和 nonce 每次随机。
- state 正常往返；篡改 state、缺少上下文时不换 Token。
- 外部 `returnTo`、协议相对 URL 和回调页自身被拒绝。
- 并发触发登录时只跳转一次。
- 回调成功后恢复 pathname、query 和 hash。
- Token 接口超时、错误、非 JSON 或缺少 Access Token 时失败。
- 业务请求携带最新 Access Token。
- 并发 401 只刷新一次，各请求最多重放一次。
- 刷新成功后保存轮换后的两个 Token；失败后重新登录。
- 存量应用首次升级会清旧 Token 并写迁移标记；从受保护页面进入时跳转 SSO 并保留原地址。
- 存量应用首次升级从公开页面进入时不跳转，之后访问受保护页面才进入 SSO。
- 403 不触发重新登录。
- 日志、埋点和截图不包含 code、verifier 或 Token。
- 本地换 Token 和刷新请求没有 CORS 问题，部署环境使用目标项目既有代理或已获 SSO API CORS 放行。
- 直接打开回调 URL 能加载应用并进入回调处理，不会被托管服务返回 404。

运行目标项目规定的 build、lint、typecheck 和 test，不假设包管理器或命令。

## 完成标准

- Client ID 和最终 Redirect URI 与目标环境匹配。
- callbackPath 已由用户确认，且未使用 `/oauth`、`/api` 等接口前缀。
- 无 Token 访问受保护页面会进入 SSO，回调后恢复原页面。
- HTTP 401、业务信封 401、刷新失败和 403 的行为与目标后端约定一致。
- 存量应用按需完成一次性旧 Token 迁移；新应用没有无用迁移代码。
- SSO 负责认证用户，业务后端继续校验组织、角色和数据权限。
- 项目门禁通过，无密钥或认证凭证进入代码和日志。
