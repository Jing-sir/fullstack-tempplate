# AI 编码规则

本规则适用于所有在此仓库中工作的 AI 助手和人工贡献者。

## 优先阅读

- 修改行为前先读 `README.md`。
- Go 代码遵循 `docs/standards/go.md` 中的完整规范（以下为核心摘要）。
- Redis 使用遵循 `docs/standards/redis.md`。
- PostgreSQL 遵循 `docs/standards/database.md`。

---

## 注释语言要求（强制）

**项目中所有注释必须使用中文**，包括但不限于：

- 包级注释、函数/方法注释
- 结构体字段注释
- 复杂逻辑的行内注释
- TODO / FIXME 注释

```go
// ✅ 正确
// CreateUser 创建新用户，校验用户名唯一性后写入数据库
func (s *UserService) CreateUser(ctx context.Context, input CreateUserInput) (model.PublicUser, error) {

// ❌ 错误
// CreateUser creates a new user and checks username uniqueness
func (s *UserService) CreateUser(ctx context.Context, input CreateUserInput) (model.PublicUser, error) {
```

---

## 项目架构

- HTTP Handler 层位于 `internal/handler`。
- 业务逻辑层位于 `internal/service`。
- SQL 和 Redis 访问层位于 `internal/repository`。
- 应用装配层位于 `internal/app`。
- 运行时配置层位于 `internal/config`。
- 禁止重新引入全局 DB、Redis、JWT 或 Service 依赖。

---

## 命名规范

### 文件命名

蛇形小写，名词在前，动词/限定词在后：

```
user_repository.go    ✅
auth_middleware.go    ✅
iv_service.go         ✅
utils.go              ❌  // 过于笼统，拆成具体功能文件
```

### 类型命名

| 职责 | 后缀 | 示例 |
|------|------|------|
| 数据库操作 | `Repo` | `UserRepo` |
| HTTP 处理 | `Handler` | `UserHandler` |
| 业务服务 | `Service` | `UserService` |
| 接口 | 用途名词 | `UserStore`、`Notifier` |
| 配置 | `Config` | `DBConfig` |
| 请求/响应 DTO | `Input`/`Result` | `CreateUserInput`、`LoginResult` |

- 接口不加 `I` 前缀（Go 惯例）
- 不用 `Manager`、`Helper`、`Util` 等语义模糊的后缀

### 函数命名

- 构造函数统一 `NewXxx`，返回指针
- 布尔返回值函数用 `Is`/`Has`/`Can` 前缀
- 方法名描述意图而非实现（`Cancel` 而非 `UpdateStatusToCanceled`）

### 常量

- 使用大驼峰（公开）或小驼峰（私有），不用全大写
- 枚举常量带类型前缀分组：`OrderStatusPending`、`OrderStatusPaid`

---

## 代码分层原则

### 职责边界（强制）

```
Handler 层：解析请求 → 调 service → 映射错误为 HTTP 状态码，不含业务逻辑
Service 层：业务规则和流程编排，不写 SQL，不感知 HTTP
Repository 层：数据库 CRUD，不含业务逻辑，不调外部服务
```

- Handler 不写业务逻辑
- Service 不返回 HTTP 状态码
- Repository 不调 Service

### 接口定义在消费方

接口由使用者（Service 层）定义，Repository 层自动满足，无需显式声明：

```go
// service/interfaces.go — 接口定义在消费方
type UserStore interface {
    Create(ctx context.Context, user model.User) error
    GetByUsername(ctx context.Context, username string) (*model.User, error)
}
```

### 依赖注入

使用构造函数注入，禁止全局变量、`init()` 初始化业务依赖：

```go
// ✅ 构造函数注入
func NewUserService(users UserStore, iv *IVService, jwt *config.JWTManager) *UserService

// ❌ 禁止
var globalDB *sql.DB
func init() { globalDB = ... }
```

---

## 错误处理

### 核心原则

> 错误只处理一次：要么向上传递，要么在此处理，不要既 log 又 return。

```go
// ✅ 只传递，加上下文
return fmt.Errorf("create user: %w", err)

// ❌ 双重处理
log.Error("create user failed", err)
return err
```

### 错误分层

- Repository 层返回 sentinel error，隐藏 DB 实现细节（`ErrNotFound` 而非 `sql.ErrNoRows`）
- Service 层将 Repository 错误转换为业务错误
- Handler 层将业务错误映射为 HTTP 状态码

### 禁止丢弃错误

```go
// ❌ 禁止
someFunc()
_ = someFunc()  // 除非有注释说明原因

// ✅ 有意忽略须加中文注释
defer func() { _ = tx.Rollback(ctx) }()  // 已 commit 的事务 Rollback 是 no-op
```

### 禁止裸字符串比较错误

```go
// ❌ 脆弱，消息变动就静默失效
if err.Error() == "not found" { ... }

// ✅
if errors.Is(err, ErrUserNotFound) { ... }
```

---

## 并发与 Context

- 所有涉及 IO（DB、Redis、HTTP）的函数第一个参数必须是 `context.Context`
- 不把 `context` 存入结构体
- 不在业务函数中传 `context.Background()`，只在程序顶层和测试中使用
- 使用 `errgroup` 管理并发任务，明确生命周期

---

## 类型系统（强制）

### 禁止 `interface{}` / `any` 作为业务参数或返回值

```go
// ❌ 禁止
func Process(input interface{}) interface{}

// ✅ 使用具体类型
func Process(input CreateUserInput) (*model.User, error)
```

### 枚举/状态值使用强类型

```go
// ❌ 裸字符串，散落各处
func UpdateStatus(id, status string) error

// ✅ 强类型枚举
type UserStatus int
const (
    UserStatusActive   UserStatus = 1
    UserStatusDisabled UserStatus = 0
)
func UpdateStatus(id string, status UserStatus) error
```

### 禁止在 init() 中初始化业务依赖

```go
// ❌ init() 执行顺序难预测，出错无法返回
func init() {
    db, _ = sql.Open(...)
}

// ✅ 在 main/app.Run 中显式初始化，错误立即 fatal
```

### 构造函数统一返回指针

```go
// ✅
func NewUserService(...) *UserService { return &UserService{...} }

// ❌
func NewUserService(...) UserService { return UserService{...} }
```

---

## API 设计

- 资源用名词复数，动作用 HTTP 方法表达
- 路径使用蛇形小写：`/api/v1/users`
- 所有公开 HTTP 端点必须带版本前缀，当前版本 `/api/v1`
- 登录接口固定为 `POST /api/v1/login`
- 重大不兼容变更升版本号（`/api/v2`），旧版本保留至少 6 个月

### 统一响应结构

```json
// 成功
{ "code": 200, "msg": "请求成功", "data": { ... } }

// 失败
{ "code": 400, "msg": "参数错误", "data": null }
```

---

## 安全

- 所有外部输入在入口处（Handler 层）校验，校验失败立即返回
- SQL 参数**必须**使用占位符，禁止字符串拼接用户输入
- 密码存储使用 bcrypt，禁止 MD5/SHA1
- 日志中不打印密码、Token 明文、密钥
- 禁止将密码、密钥、证书硬编码在代码或配置文件模板中
- 禁止将业务逻辑放在 Handler 中

---

## 配置管理

- 禁止在代码中硬编码密钥、凭据、主机、端口或环境特定值
- 新增配置项时同步更新 `.env.example`
- 配置加载后立即校验，失败直接 fatal 退出（见 `internal/config/config.go`）

---

## 数据库

- 使用参数化 SQL，禁止字符串拼接
- 避免 `SELECT *`，只查需要的列
- 数据库 schema 变更必须新增迁移文件，禁止修改已合并的迁移
- 新增 `NOT NULL` 列必须提供默认值

---

## 验证要求

完成任务前运行：

```bash
go test ./...
go vet ./...
go build ./...
```

如果修改了文件，还需运行：

```bash
git diff --check
```

### 自测要求（强制）

**每次实现新接口或修改已有接口后，必须用 curl 自测所有改动点**，包括：

1. 服务正常启动（所有路由打印到控制台）
2. 登录接口返回 `code: 200` 和有效 token
3. 新增的每个接口至少发一次带 token 的真实请求，验证返回结构符合预期
4. 关键写操作（新增/更新/删除）执行后，通过查询接口或数据库确认数据已落盘
5. 中间件（如操作日志）验证异步写入确实写入数据库，total > 0

自测模板：
```bash
# 1. 拿 IV
IV_RESP=$(curl -s http://localhost:8800/api/v1/security/iv)
IV_ID=$(echo $IV_RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['iv_id'])")
IV=$(echo $IV_RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['iv'])")

# 2. 加密密码（需和后端 PASSWORD_CRYPTO_KEY 一致）
ENCRYPTED=$(node -e "
const crypto = require('crypto');
const key = crypto.createHash('sha256').update(process.env.PASSWORD_CRYPTO_KEY || 'dev-crypto-key-16b').digest();
const iv = Buffer.from('$IV', 'hex');
const c = crypto.createCipheriv('aes-256-gcm', key, iv);
let e = c.update('$PASSWORD','utf8','base64'); e += c.final('base64');
const t = c.getAuthTag();
console.log(Buffer.concat([Buffer.from(e,'base64'), t]).toString('base64'));
")

# 3. 登录拿 token
TOKEN=$(curl -s -X POST http://localhost:8800/api/v1/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$ENCRYPTED\",\"iv_id\":\"$IV_ID\"}" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 4. 测接口
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8800/api/v1/<接口> | python3 -m json.tool
```

---

## AI 护栏

- 保留用户编辑，不回退无关文件
- 优先小而直接的修改，避免投机性抽象
- 匹配现有代码风格和包边界
- 非必要不添加依赖
- Handler 层不写业务逻辑
- Service/Repository 层不返回 HTTP 状态码
- 不用 Redis 作为业务数据的唯一来源
- 不创建依赖本地机器状态的迁移文件

## 不确定时

- 选择更简单的实现，符合当前架构
- 仅在决策不明显时添加简短的中文注释
- 若变更会影响 API 兼容性、数据保留、认证或生产配置，请先确认
