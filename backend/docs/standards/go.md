# Go 后端开发规范

> 版本：2.1.0  
> 更新：2026-05-24  
> 适用：Go 1.21+，面向中大型后端服务团队

---

## 目录

1. [命名规范](#一命名规范)
2. [代码分层](#二代码分层)
3. [错误处理](#三错误处理)
4. [并发与事务](#四并发与事务)
5. [数据库](#五数据库)
6. [API 设计](#六api-设计)
7. [配置与密钥管理](#七配置与密钥管理)
8. [日志与可观测性](#八日志与可观测性)
9. [测试](#九测试)
10. [安全](#十安全)
11. [类型系统与语言规范](#十一类型系统与语言规范)

---

## 一、命名规范

### 1.1 通用原则

> **名字应该回答"这是什么"，而不是"这怎么实现"**

- 越短越好，但不能牺牲清晰度
- 不加无意义的前缀/后缀：`Manager`、`Helper`、`Util`、`Info`、`Data`
- 缩写只用公认的：`ID`、`URL`、`HTTP`、`API`；不造缩写，不用拼音

### 1.2 文件命名

蛇形小写，名词，反映文件的核心内容：

```
payment_request.go       ✅
api_key_repo.go          ✅
middleware_auth.go       ❌  // 反过来，auth_middleware.go
utils.go                 ❌  // 过于笼统，拆成具体功能文件
helpers.go               ❌
```

### 1.3 包名

单个小写单词，与目录名一致：

```go
package repository   ✅
package service      ✅
package auth         ✅

package repositoryLayer  ❌
package srv              ❌  // 过度缩写
```

例外：测试辅助包可加 `_test` 后缀。

### 1.4 类型命名

大驼峰，**携带语义后缀**：

| 职责 | 后缀 | 示例 |
|------|------|------|
| 数据库操作 | `Repo` | `OrderRepo` |
| HTTP/gRPC 处理 | `Handler` | `OrderHandler` |
| 业务服务 | `Service` | `OrderService` |
| 接口（依赖抽象） | 用途名词 | `OrderStore`、`Notifier`、`Mailer` |
| 配置 | `Config` | `DBConfig`、`ServerConfig` |
| 请求/响应 DTO | `Req`/`Resp` 或 `Input`/`Output` | `CreateOrderReq`、`CreateOrderResp` |

```go
// ✅
type OrderRepo struct{}
type OrderHandler struct{}
type OrderStore interface{}   // 接口，不加 I 前缀

// ❌
type OrderRepositoryImpl struct{}
type IOrderStore interface{}  // Go 不用 I 前缀
type OrderManager struct{}    // Manager 语义模糊
```

### 1.5 函数命名

动词开头，描述意图而非实现：

```go
// ✅ 构造函数
func NewOrderRepo(pool *pgxpool.Pool) *OrderRepo

// ✅ 方法命名体现意图
func (r *OrderRepo) GetByID(ctx, id)
func (r *OrderRepo) ListByMerchant(ctx, merchantID)
func (s *OrderService) Cancel(ctx, orderID, reason)   // 不叫 UpdateStatusToCanceled

// ✅ 布尔返回：Is/Has/Can 前缀
func (o *Order) IsExpired() bool
func (u *User) HasPermission(code string) bool

// ❌
func (r *OrderRepo) QueryOrderByIDFromDatabase(ctx, id)  // 冗余
func process(ctx, data interface{}) interface{}           // 过于模糊
```

### 1.6 变量命名

- 作用域越小，名字可以越短：循环变量用 `i`、`v` 完全合理
- 作用域越大，名字必须越具体
- 避免用类型名做变量名：`string` → 用 `name`；`error` → 用 `err`

```go
// ✅ 短作用域，短名字
for i, v := range items { ... }

// ✅ 长作用域，描述性名字
var defaultRequestExpirySeconds = 1800

// ❌ 用类型名做变量名
var string = "hello"
var error = someFunc()

// ❌ 单字母用于大作用域
var s *Service  // 应该是 svc 或 orderSvc
```

### 1.7 常量

- Go 不用全大写，用大驼峰（公开）或小驼峰（私有）
- 枚举类常量用有意义的前缀分组

```go
// ✅
const DefaultPageSize = 20
const maxRetryCount = 3

type OrderStatus string
const (
    OrderStatusPending   OrderStatus = "PENDING"
    OrderStatusPaid      OrderStatus = "PAID"
    OrderStatusExpired   OrderStatus = "EXPIRED"
    OrderStatusCanceled  OrderStatus = "CANCELED"
)

// ❌
const DEFAULT_PAGE_SIZE = 20       // 全大写
const PENDING OrderStatus = "PENDING"
```

---

## 二、代码分层

### 2.1 职责边界

```
┌─────────────────────────────────────────────┐
│  Handler（接收层）                            │
│  · 解析请求参数                               │
│  · 调用 service                              │
│  · 把 service 错误映射为 HTTP/gRPC 状态码     │
│  · 不含任何业务判断逻辑                       │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  Service（业务层）                            │
│  · 业务规则、流程编排                         │
│  · 调用 repository 接口（不是具体实现）        │
│  · 调用外部服务（PSP、邮件、短信等）           │
│  · 不写任何 SQL，不感知 HTTP/gRPC             │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  Repository（数据层）                         │
│  · 数据库 CRUD                               │
│  · 返回 domain 类型，不返回 DB 行类型         │
│  · 不含业务逻辑，不调外部服务                 │
└─────────────────────────────────────────────┘
```

### 2.2 接口定义在消费方

Go 接口应由**使用者**定义，而不是实现者：

```go
// ✅ 接口定义在 service 包（使用方）
// service/interfaces.go
package service

type OrderStore interface {
    Create(ctx context.Context, order *domain.Order) error
    GetByID(ctx context.Context, id string) (*domain.Order, error)
    UpdateStatus(ctx context.Context, id string, status domain.OrderStatus) error
}

// repository 包自动满足接口，无需声明
// repository/order_repo.go
package repository

type OrderRepo struct{ pool *pgxpool.Pool }

func (r *OrderRepo) Create(ctx context.Context, order *domain.Order) error { ... }
func (r *OrderRepo) GetByID(ctx context.Context, id string) (*domain.Order, error) { ... }
func (r *OrderRepo) UpdateStatus(ctx context.Context, id string, status domain.OrderStatus) error { ... }
```

### 2.3 依赖注入

使用构造函数注入，不使用全局变量、`init()` 或 `sync.Once` 做服务初始化：

```go
// ✅ 构造函数注入，依赖清晰可测
type OrderService struct {
    orders   OrderStore
    notifier Notifier
    logger   *zap.Logger
}

func NewOrderService(orders OrderStore, notifier Notifier, logger *zap.Logger) *OrderService {
    return &OrderService{orders: orders, notifier: notifier, logger: logger}
}

// ❌ 全局变量，难以测试
var globalDB *sql.DB
var globalLogger *zap.Logger
```

### 2.4 保持函数小而专注

- 一个函数只做一件事
- 超过 3 个参数考虑用结构体
- 超过 50 行考虑拆分
- 嵌套超过 3 层时用 early return 减少嵌套

```go
// ❌ 嵌套深，难以阅读
func Process(req Request) error {
    if req.Valid() {
        if user, err := getUser(req.UserID); err == nil {
            if user.Active {
                // ... 真正的逻辑
            } else {
                return ErrInactive
            }
        } else {
            return err
        }
    } else {
        return ErrInvalid
    }
    return nil
}

// ✅ early return，逻辑清晰
func Process(req Request) error {
    if !req.Valid() {
        return ErrInvalid
    }
    user, err := getUser(req.UserID)
    if err != nil {
        return err
    }
    if !user.Active {
        return ErrInactive
    }
    // ... 真正的逻辑
    return nil
}
```

---

## 三、错误处理

### 3.1 核心原则

> **错误只处理一次。要么处理它，要么向上传递，不要既 log 又 return。**

```go
// ❌ 错误被处理了两次（既 log 又 return）
if err := repo.Save(ctx, order); err != nil {
    log.Error("save order failed", zap.Error(err))  // 处理了
    return err                                       // 又传递了
}

// ✅ 只传递，让上层决定如何处理
if err := repo.Save(ctx, order); err != nil {
    return fmt.Errorf("save order: %w", err)
}

// ✅ 或只处理（降级、告警），不再传递
if err := notifier.Send(ctx, event); err != nil {
    log.Warn("notify failed, continuing", zap.Error(err))
    // 不 return，业务继续
}
```

### 3.2 错误分层

每一层转换错误的语义，不向上透传底层细节：

```go
// repository 层：返回 sentinel error，隐藏 DB 实现细节
var ErrNotFound = errors.New("not found")

func (r *OrderRepo) GetByID(ctx context.Context, id string) (*Order, error) {
    err := r.pool.QueryRow(ctx, sql, id).Scan(...)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, ErrNotFound  // 不暴露 pgx 细节
    }
    return order, err
}

// service 层：转换为业务错误
func (s *OrderService) Get(ctx context.Context, id, callerID string) (*Order, error) {
    order, err := s.orders.GetByID(ctx, id)
    if errors.Is(err, repository.ErrNotFound) {
        return nil, ErrOrderNotFound  // 业务级别错误
    }
    if order.MerchantID != callerID {
        return nil, ErrOrderNotFound  // 跨租户访问也返回 NotFound，不泄露资源存在性
    }
    return order, nil
}

// handler 层：转换为协议错误码
func mapErr(err error) *connect.Error {
    switch {
    case errors.Is(err, service.ErrOrderNotFound):
        return connect.NewError(connect.CodeNotFound, err)
    case errors.Is(err, service.ErrOrderAlreadyPaid):
        return connect.NewError(connect.CodeFailedPrecondition, err)
    default:
        return connect.NewError(connect.CodeInternal, errors.New("internal error"))
    }
}
```

### 3.3 错误包装

- 使用 `fmt.Errorf("上下文: %w", err)` 包装，保留调用链
- 包装信息用英文小写，不加句号，描述"在做什么时出错"

```go
// ✅
return fmt.Errorf("create payment order: %w", err)
return fmt.Errorf("lock address for request %s: %w", requestID, err)

// ❌
return fmt.Errorf("Error: %v", err)          // 大写，没上下文
return fmt.Errorf("failed to create order")  // 丢失原始 error
```

### 3.4 自定义错误类型

业务错误携带结构化信息，便于 handler 层精确处理：

```go
type BizError struct {
    Code    string
    Message string
    Status  int  // HTTP 状态码
}

func (e *BizError) Error() string { return e.Code + ": " + e.Message }

var (
    ErrNotFound    = &BizError{Code: "not_found",    Message: "resource not found",   Status: 404}
    ErrForbidden   = &BizError{Code: "forbidden",    Message: "access denied",        Status: 403}
    ErrOrderExpired = &BizError{Code: "order_expired", Message: "order has expired",  Status: 422}
)
```

### 3.5 禁止丢弃错误

```go
// ❌ 禁止
someFunc()
_ = someFunc()    // 除非有注释说明原因

// ✅ 有意忽略须注释
defer func() { _ = tx.Rollback(ctx) }()  // 已 commit 的事务 Rollback 是 no-op

// ✅ 启动时的错误必须 fatal
logger, err := zap.NewProduction()
if err != nil {
    log.Fatal("init logger failed:", err)
}
```

---

## 四、并发与事务

### 4.1 Context 规范

- 所有涉及 IO（DB、gRPC、HTTP）的函数第一个参数必须是 `context.Context`
- 不把 `context` 存入结构体
- 不传 `context.Background()` 给业务函数，只在程序顶层和测试中使用

```go
// ✅
func (r *OrderRepo) GetByID(ctx context.Context, id string) (*Order, error)

// ❌
type OrderService struct {
    ctx context.Context  // 不存入结构体
}
```

### 4.2 Goroutine 管理

- 启动 goroutine 必须明确谁负责等待它退出（`sync.WaitGroup` 或 `errgroup`）
- 使用 `errgroup` 管理并发任务，自动传播错误和取消

```go
// ✅ 用 errgroup 管理并发，明确生命周期
g, ctx := errgroup.WithContext(ctx)

g.Go(func() error {
    return sweeper.Run(ctx)
})
g.Go(func() error {
    return natsConsumer.Run(ctx)
})

if err := g.Wait(); err != nil {
    logger.Error("worker exited", zap.Error(err))
}
```

### 4.3 事务标准模式

```go
// 固定三步骤：Begin → defer Rollback → Commit
func (r *Repo) TransactionalWrite(ctx context.Context, ...) error {
    tx, err := r.pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer func() { _ = tx.Rollback(ctx) }()  // 已 commit 后调用是 no-op

    if err := step1(ctx, tx); err != nil {
        return err  // 触发 defer Rollback
    }
    if err := step2(ctx, tx); err != nil {
        return err
    }

    return tx.Commit(ctx)
}
```

### 4.4 事务内禁止耗时操作

事务持有数据库锁，事务内不允许：

```go
// ❌ 事务内调远程服务（持锁期间阻塞其他请求）
tx.Begin()
result := callExternalAPI()  // 可能超时几秒
tx.Commit()

// ✅ 先做外部调用，再开事务写库
result := callExternalAPI()
tx.Begin()
writeResultToDB(result)
tx.Commit()
```

### 4.5 竞态防护

共享资源使用 `sync.Mutex` 或原子操作，并注释说明保护的是什么：

```go
type AddressPool struct {
    mu    sync.Mutex
    free  []string  // mu 保护 free 和 locked
    locked map[string]struct{}
}

func (p *AddressPool) Lock() (string, error) {
    p.mu.Lock()
    defer p.mu.Unlock()
    // ...
}
```

---

## 五、数据库

### 5.1 SQL 管理

- 优先使用 **sqlc** 生成类型安全的 SQL 代码，减少手写 SQL 的错误
- 所有 SQL 语句放在 `.sql` 文件中，不在 Go 代码里散落 SQL 字符串
- 动态查询（分页、条件过滤）在 repository 层封装，写清注释

### 5.2 索引与查询

- 高频查询字段必须有索引，新增查询时评估是否需要新增索引
- 避免 `SELECT *`，只查需要的列
- 批量操作用批处理，不循环单条 INSERT/UPDATE

```go
// ❌ 循环单条插入
for _, item := range items {
    db.Exec("INSERT INTO ...", item)
}

// ✅ 批量插入
db.Exec("INSERT INTO ... VALUES ($1,$2),($3,$4),...", args...)
```

### 5.3 金额规范

| 场景 | 规范 |
|------|------|
| 数据库存储 | `NUMERIC(38,18)` 或 `BIGINT`（分为单位）|
| Go 层传递 | `string`（NUMERIC）或 `int64`（分）|
| 业务计算 | `shopspring/decimal` |
| 绝对禁止 | `float32` / `float64` |

```go
// ✅ 金额用 decimal 计算
fee := decimal.NewFromString(amount).Mul(decimal.NewFromFloat(0.006))

// ❌ 浮点数计算金额，精度不可控
fee := amount * 0.006
```

### 5.4 迁移文件规范

- 文件命名：`{timestamp}_{动词_描述}.up.sql`，如 `20260511_add_payment_request_table.up.sql`
- up/down 文件成对提交，down 必须完整回滚 up 的所有变更
- 已合并的迁移**禁止修改**，只能新增版本
- 新增 NOT NULL 列必须提供默认值，禁止直接对存量表加无默认值的 NOT NULL 列

```sql
-- ✅ 安全的加列
ALTER TABLE orders ADD COLUMN retry_count INT NOT NULL DEFAULT 0;

-- ❌ 危险：存量数据会报错
ALTER TABLE orders ADD COLUMN retry_count INT NOT NULL;
```

### 5.5 慢查询与超时

- 每个连接配置 `statement_timeout` 防止慢查询拖垮服务
- 每个连接配置 `idle_in_transaction_session_timeout` 防止事务泄露

```toml
[db]
statement_timeout_ms         = 5000   # 5s 超时
idle_in_tx_timeout_ms        = 10000  # 事务空闲 10s 强制断开
```

---

## 六、API 设计

### 6.1 REST 接口规范

- 资源用名词复数，动作用 HTTP 方法表达
- 路径用小写蛇形：`/v1/payment_requests`

```
POST   /v1/orders              创建订单
GET    /v1/orders/{id}         查询单个订单
GET    /v1/orders              查询列表
PATCH  /v1/orders/{id}         部分更新
DELETE /v1/orders/{id}         删除

POST   /v1/orders/{id}/cancel  业务动作（不是 CRUD 的操作）
```

### 6.2 响应体规范

统一响应结构，成功和失败格式一致：

```json
// 成功
{
  "data": { ... }
}

// 失败
{
  "code": "order_not_found",
  "message": "the requested order does not exist"
}

// 列表
{
  "data": [...],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 100
  }
}
```

### 6.3 版本控制

- URL 版本：`/v1/`、`/v2/`（路径前缀，简单直接）
- 新增字段向前兼容，删除字段必须经历弃用期
- 重大不兼容变更升大版本，旧版本保留至少 6 个月

### 6.4 幂等性

- `POST` 接口通过客户端提供的 `Idempotency-Key` 请求头实现幂等
- 服务端以 `(merchant_id, idempotency_key)` 为唯一键去重
- 幂等窗口期建议 24 小时

### 6.5 分页

- 默认分页，禁止不分页的列表接口
- 推荐 cursor 分页（性能好，适合实时数据），offset 分页用于后台管理

```
// cursor 分页（推荐）
GET /v1/orders?after=ord_01JVXXX&limit=20

// offset 分页（管理后台）
GET /v1/orders?page=2&size=20
```

---

## 七、配置与密钥管理

### 7.1 配置加载优先级

```
密钥管理系统（Vault / AWS Secrets Manager）   ← 最高优先级，生产必须
    ↓ 覆盖
环境变量（K8s Secret 注入）
    ↓ 覆盖
配置文件（TOML / YAML）
    ↓ 覆盖
代码默认值                                    ← 最低优先级，仅供本地开发
```

### 7.2 分类管理

| 类型 | 存放位置 | 示例 |
|------|---------|------|
| 非敏感配置 | 配置文件 / ConfigMap | 端口、超时、日志级别 |
| 敏感配置 | 环境变量（K8s Secret）| DB 用户名、JWT Secret |
| 高安全凭据 | Vault / KMS | DB 密码、加密密钥、签名密钥 |

**绝对禁止**：密码、密钥、证书出现在代码仓库（包括配置文件模板中的真实值）。

### 7.3 配置结构体规范

```go
type Config struct {
    Server   ServerConfig   `toml:"server"`
    DB       DBConfig       `toml:"db"`
    Log      LogConfig      `toml:"log"`
}

// ✅ 配置加载后立即校验，失败直接 fatal 退出
func Load(path string) (*Config, error) {
    cfg := &Config{}
    if _, err := toml.DecodeFile(path, cfg); err != nil {
        return nil, fmt.Errorf("decode config: %w", err)
    }
    if err := cfg.validate(); err != nil {
        return nil, fmt.Errorf("invalid config: %w", err)
    }
    return cfg, nil
}
```

### 7.4 本地开发配置

提供 `configs/app.example.toml` 模板（不含敏感值），开发者复制为 `configs/app.toml`：

```toml
# configs/app.example.toml（提交到仓库，作为模板）
[db]
host     = "127.0.0.1"
port     = 5432
database = "myapp_dev"
username = "myapp"
password = "REPLACE_ME"        # 不填真实密码
```

---

## 八、日志与可观测性

### 8.1 日志

**使用结构化日志**（Zap / slog），禁止字符串拼接：

```go
// ✅
logger.Info("order created",
    zap.String("order_id", order.ID),
    zap.String("merchant_id", order.MerchantID),
    zap.String("amount", order.Amount),
)

// ❌
logger.Info("order created: " + order.ID + " merchant: " + order.MerchantID)
```

**日志级别使用原则**：

| 级别 | 场景 | 频率要求 |
|------|------|---------|
| `Debug` | 开发调试，详细中间状态 | 生产关闭 |
| `Info` | 关键业务节点（下单、支付成功、用户登录）| 低频 |
| `Warn` | 可恢复的异常（重试、降级、非核心失败）| 中频，需监控 |
| `Error` | 需要人介入的错误（DB 故障、第三方不可用）| 低频，必须告警 |

**日志必须包含的上下文**：

```go
// 关键操作日志必须包含：request_id / trace_id、业务 ID、用户/商户 ID
logger.Info("payment completed",
    zap.String("trace_id", traceID),
    zap.String("request_id", req.ID),
    zap.String("merchant_id", req.MerchantID),
    zap.Duration("duration", time.Since(start)),
)
```

### 8.2 Metrics

每个服务暴露 Prometheus metrics，至少包含：

- HTTP/gRPC 请求数、延迟（P50/P95/P99）、错误率
- 数据库连接池使用情况
- 业务核心指标（订单成功率、支付金额等）

```go
var (
    requestTotal = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total number of HTTP requests",
    }, []string{"method", "path", "status"})

    requestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Buckets: prometheus.DefBuckets,
    }, []string{"method", "path"})
)
```

### 8.3 Tracing

使用 OpenTelemetry 标准 SDK，关键函数加 span：

```go
func (s *OrderService) Create(ctx context.Context, in CreateInput) (*Order, error) {
    ctx, span := tracer.Start(ctx, "OrderService.Create")
    defer span.End()

    span.SetAttributes(
        attribute.String("merchant.id", in.MerchantID),
        attribute.String("currency", in.Currency),
    )
    // ...
}
```

### 8.4 健康检查

每个服务提供两个端点：

```
GET /healthz/live    # 存活检查：进程是否活着（K8s livenessProbe）
GET /healthz/ready   # 就绪检查：DB/依赖是否可用（K8s readinessProbe）
```

---

## 九、测试

### 9.1 测试分层策略

```
           /\
          /单\        单元测试：service 层，mock 依赖
         / 元 \       快、多、覆盖业务逻辑分支
        /______\
       /        \
      /  集 成   \     集成测试：repository 层，真实 DB
     /            \    中速、覆盖 SQL 正确性
    /______________\
   /                \
  /   端 到 端（E2E）  \   E2E 测试：关键业务流程
 /____________________\  慢、少、验证整体流程
```

### 9.2 测试命名

```go
// 格式：Test + 被测方法 + _ + 场景
func TestOrderService_Create_HappyPath(t *testing.T)
func TestOrderService_Create_DuplicateIdempotencyKey(t *testing.T)
func TestOrderService_Cancel_AlreadyPaid_ReturnsError(t *testing.T)
```

### 9.3 单元测试写法

Service 层依赖接口，测试时注入 stub：

```go
func TestCreateOrder_Success(t *testing.T) {
    // Arrange
    store := &stubOrderStore{
        createFn: func(ctx context.Context, o *Order) error { return nil },
    }
    svc := NewOrderService(store, noopNotifier{}, zaptest.NewLogger(t))

    // Act
    out, err := svc.Create(context.Background(), CreateInput{
        MerchantID: "mch_test",
        Amount:     "100.00",
        Currency:   "USDT",
    })

    // Assert
    require.NoError(t, err)
    assert.Equal(t, "mch_test", out.Order.MerchantID)
}
```

### 9.4 表驱动测试

多个相似场景用表驱动，减少重复代码：

```go
func TestMapError(t *testing.T) {
    tests := []struct {
        name     string
        input    error
        wantCode connect.Code
    }{
        {"not found",     ErrNotFound,   connect.CodeNotFound},
        {"forbidden",     ErrForbidden,  connect.CodePermissionDenied},
        {"internal",      errors.New("db error"), connect.CodeInternal},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            got := mapErr(tc.input)
            assert.Equal(t, tc.wantCode, connect.CodeOf(got))
        })
    }
}
```

### 9.5 测试质量要求

- Service 层核心业务逻辑：**≥ 70%** 覆盖率
- 不追求 100%：不测 getter/setter、不测框架代码、不测 main 函数
- 重点测**边界条件**和**异常路径**，而不是只测 happy path
- 每个 bug 修复必须补充对应的回归测试

### 9.6 测试辅助原则

```go
// ✅ 失败立即停止（require），而不是继续执行（assert）
user, err := svc.GetUser(ctx, "u1")
require.NoError(t, err)        // 失败直接 Fatal，后续不执行
assert.Equal(t, "Alice", user.Name)  // 失败标记但继续执行

// ✅ 使用 t.Helper() 标记辅助函数，让错误指向调用处
func mustCreateOrder(t *testing.T, svc *OrderService, input CreateInput) *Order {
    t.Helper()
    order, err := svc.Create(context.Background(), input)
    require.NoError(t, err)
    return order
}
```

---

## 十、安全

### 10.1 输入校验

- 所有外部输入（HTTP 请求、gRPC 请求、消息队列消息）在入口处验证
- 验证失败立即返回，不向下传递非法数据
- 使用白名单校验，而不是黑名单

```go
// ✅ 在 handler 入口处校验
func (h *Handler) CreateOrder(ctx context.Context, req *connect.Request[pb.CreateOrderReq]) (...) {
    if req.Msg.Amount == "" {
        return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("amount required"))
    }
    amt, err := decimal.NewFromString(req.Msg.Amount)
    if err != nil || amt.LessThanOrEqual(decimal.Zero) {
        return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("amount must be positive"))
    }
    // 通过校验后再调 service
}
```

### 10.2 SQL 注入防护

- **所有** SQL 参数使用占位符，禁止字符串拼接用户输入
- 动态拼 SQL 时只允许拼结构（列名白名单、运算符），不允许拼用户输入

```go
// ✅ 参数化查询
pool.QueryRow(ctx, "SELECT * FROM orders WHERE id = $1", orderID)

// ❌ 字符串拼接，SQL 注入风险
pool.QueryRow(ctx, "SELECT * FROM orders WHERE id = '" + orderID + "'")
```

### 10.3 敏感数据处理

- 日志中不打印：密码、密钥、Token 明文、完整卡号
- 密码存储使用强哈希算法（Argon2id、bcrypt），禁止 MD5/SHA1
- API Key 明文只在创建时返回一次，数据库只存 HMAC 摘要

```go
// ✅ 密码用 Argon2id 哈希
hash, err := argon2id.CreateHash(password, argon2id.DefaultParams)

// ❌ 禁止
hash := md5.Sum([]byte(password))
```

### 10.4 身份鉴权

- 每个接口明确标注鉴权要求，不依赖"默认拒绝"的隐性假设
- 鉴权和授权分离：先验证身份（你是谁），再验证权限（你能做什么）
- 敏感操作（删除、修改权限）记录操作审计日志

### 10.5 多租户隔离

- **每个数据库查询必须包含 `tenant_id` / `merchant_id` 条件**
- Service 层从鉴权上下文提取租户 ID，不信任客户端传参

```go
// ✅ 从鉴权上下文取，不信任请求参数
func (s *OrderService) List(ctx context.Context, q ListQuery) ([]*Order, error) {
    callerID := auth.MustFromContext(ctx).MerchantID  // 从鉴权上下文取
    return s.orders.ListByMerchant(ctx, callerID, q)
}
```

### 10.6 依赖安全

```bash
# 定期扫描依赖漏洞
govulncheck ./...

# 保持依赖最新
go get -u ./...   # 小版本更新
```

---

## 十一、类型系统与语言规范

### 11.1 大小写的语言级别含义

Go 的大小写是**语言级别的访问控制**，不是风格约定，编译器强制执行。

| 大小写 | 可见性 | 适用范围 |
|--------|--------|----------|
| 首字母大写（exported） | 包外可见 | 公开 API、接口、类型、常量 |
| 首字母小写（unexported） | 仅包内可见 | 内部实现、私有字段、包内工具函数 |

**核心原则：最小暴露原则** — 能小写的绝不大写，只暴露必要的 API 边界。

```go
// ✅ 仅暴露必要的类型和方法
type OrderService struct {
    repo   orderStore   // 小写：内部依赖，外部无需感知
    logger *zap.Logger  // 小写：内部实现细节
}

// 大写：公开构造函数，外部唯一入口
func NewOrderService(repo orderStore, logger *zap.Logger) *OrderService {
    return &OrderService{repo: repo, logger: logger}
}

// 大写：公开业务方法
func (s *OrderService) Create(ctx context.Context, in CreateInput) (*Order, error) { ... }

// 小写：内部辅助逻辑，包外不应直接调用
func (s *OrderService) validateInput(in CreateInput) error { ... }
```

**结构体字段可见性规则**：

```go
// ✅ DTO/领域对象：字段大写，供 JSON 序列化和跨包读取
type CreateOrderReq struct {
    MerchantID string          `json:"merchant_id"`
    Amount     string          `json:"amount"`
    Currency   string          `json:"currency"`
}

// ✅ 内部状态结构体：字段小写，通过方法暴露
type addressPool struct {
    mu     sync.Mutex
    free   []string
    locked map[string]struct{}
}

func (p *addressPool) Available() int {
    p.mu.Lock()
    defer p.mu.Unlock()
    return len(p.free)
}
```

**常见错误**：

```go
// ❌ 把内部实现结构全部大写暴露出去
type orderRepoImpl struct {
    Pool   *pgxpool.Pool  // Pool 大写，外部可直接操作 DB 连接池，破坏封装
    Cache  *redis.Client  // 同上
}

// ❌ 接口方法首字母小写，导致接口方法包外无法实现
type OrderStore interface {
    create(ctx context.Context, o *Order) error  // 包外实现类无法满足此接口
}
```

---

### 11.2 数据类型与指针的使用规范

#### 何时使用指针，何时使用值类型

| 场景 | 推荐 | 原因 |
|------|------|------|
| 方法需要修改接收者状态 | 指针接收者 `*T` | 值接收者是副本，修改无效 |
| 结构体较大（>64 字节） | 指针 | 避免栈上大量拷贝 |
| 表达"可能为空"的语义 | 指针 | `nil` 表示缺失/未设置 |
| 函数返回领域对象 | 指针 | 便于后续修改，传递成本低 |
| 小的值类型（`int`、`bool`、`string`、小结构体） | 值类型 | 无需堆分配，GC 压力小 |
| 方法不修改接收者，且类型较小 | 值接收者 | 更简单，线程安全 |

**指针表达"可空"语义**：

```go
// ✅ 用指针表示字段可能不存在
type Order struct {
    ID          string
    CompletedAt *time.Time  // nil 表示未完成，非 nil 表示已完成时间
    RefundedAt  *time.Time
}

// ❌ 用零值表示不存在，语义不清晰
type Order struct {
    CompletedAt time.Time   // 零值 time.Time{} 无法区分"未完成"和"时间戳恰好是零值"
}
```

**方法接收者一致性**：同一类型的所有方法，要么全用指针接收者，要么全用值接收者，禁止混用。

```go
// ✅ 统一用指针接收者
func (s *OrderService) Create(...) error  { ... }
func (s *OrderService) Cancel(...) error  { ... }
func (s *OrderService) validate(...) error { ... }

// ❌ 混用，接口满足判断会出错
func (s OrderService)  Create(...) error  { ... }  // 值接收者
func (s *OrderService) Cancel(...) error  { ... }  // 指针接收者
```

**函数参数传递**：

```go
// ✅ 传指针：大结构体、需要修改、表达可空
func ProcessOrder(ctx context.Context, order *Order) error { ... }

// ✅ 传值：小类型、配置、不可变输入（更安全，调用方无需担心函数改了数据）
func FormatAmount(amount decimal.Decimal) string { ... }
func ValidateCurrency(currency string) bool { ... }

// ❌ 对 string/int/bool 使用指针，无收益且引入 nil 风险
func SetName(name *string) { ... }
```

**明确禁止的指针用法**：

```go
// ❌ 返回局部变量指针并在循环外使用（循环变量问题，Go 1.22 前常见坑）
var ptrs []*int
for i := 0; i < 3; i++ {
    ptrs = append(ptrs, &i)  // Go 1.21 及以前：所有指针指向同一个 i
}

// ✅ 显式复制
for i := 0; i < 3; i++ {
    v := i
    ptrs = append(ptrs, &v)
}

// ❌ 解引用前不检查 nil
func process(order *Order) {
    fmt.Println(order.ID)  // order 可能为 nil，直接 panic
}

// ✅ 先检查
func process(order *Order) error {
    if order == nil {
        return errors.New("order is nil")
    }
    fmt.Println(order.ID)
    return nil
}
```

---

### 11.3 强制规范与明确建议

以下规范**强制执行**，代码评审中发现必须修改后才能合并。

#### 强制：禁止 `interface{}` / `any` 作为业务参数或返回值

```go
// ❌ 禁止：类型信息丢失，调用方需要大量类型断言，运行时易 panic
func Process(input interface{}) interface{} { ... }
func (r *Repo) Find(filter map[string]interface{}) ([]interface{}, error) { ... }

// ✅ 使用具体类型或泛型
func Process(input CreateOrderReq) (*Order, error) { ... }
func (r *Repo) FindByFilter(filter OrderFilter) ([]*Order, error) { ... }
```

#### 强制：不使用裸 `error` 字符串比较

```go
// ❌ 字符串比较脆弱，一旦消息改动就静默失效
if err.Error() == "not found" { ... }

// ✅ 使用 errors.Is / errors.As
if errors.Is(err, ErrNotFound) { ... }

var bizErr *BizError
if errors.As(err, &bizErr) { ... }
```

#### 强制：goroutine 内不允许裸 recover，必须有日志和指标

```go
// ❌ 吞掉 panic，无任何可观测性
go func() {
    defer func() { recover() }()
    doWork()
}()

// ✅ recover 后记录日志和指标，方便排查
go func() {
    defer func() {
        if r := recover(); r != nil {
            logger.Error("goroutine panic", zap.Any("panic", r), zap.Stack("stack"))
            panicCounter.Inc()
        }
    }()
    doWork()
}()
```

#### 强制：禁止在 init() 中初始化业务依赖

```go
// ❌ init() 执行顺序难以预测，无法传入依赖，出错无法返回 error
func init() {
    db, _ = sql.Open("postgres", os.Getenv("DB_URL"))
    logger, _ = zap.NewProduction()
}

// ✅ 在 main 中显式初始化，错误立即 fatal
func main() {
    logger, err := zap.NewProduction()
    if err != nil {
        log.Fatal("init logger:", err)
    }
    db, err := pgxpool.New(ctx, cfg.DB.DSN())
    if err != nil {
        logger.Fatal("init db", zap.Error(err))
    }
}
```

#### 强制：slice/map 作为函数参数时，函数内不得修改原始数据（除非文档明确说明）

```go
// ❌ 直接修改传入的 slice，调用方无法预期
func Deduplicate(ids []string) []string {
    sort.Strings(ids)  // 修改了调用方的 ids
    // ...
}

// ✅ 操作副本，或在函数名/注释中明确说明会修改原始数据
func Deduplicate(ids []string) []string {
    cp := make([]string, len(ids))
    copy(cp, ids)
    sort.Strings(cp)
    // ...
}
```

---

### 11.4 明确数据类型，禁止依赖隐式推断

**凡是能明确指定类型的地方，必须明确指定**，不依赖编译器推断来表达业务语义。

#### 变量声明时明确类型

```go
// ❌ 类型由字面量决定，语义不明确，后续修改容易引入精度问题
timeout := 30          // int？秒？毫秒？
fee := 0.006           // float64，金额计算禁止用浮点

// ✅ 明确类型，语义清晰
var timeout time.Duration = 30 * time.Second
var feeRate = decimal.NewFromFloat(0.006)      // 使用 decimal，避免浮点精度问题

// ✅ 或使用类型别名强化语义
type Seconds int
const DefaultTimeout Seconds = 30
```

#### 函数签名必须写完整类型，禁止裸 any

```go
// ❌ 参数和返回值类型模糊
func BuildFilter(params map[string]any) any { ... }

// ✅ 输入输出类型完整、具体
type OrderFilter struct {
    MerchantID string
    Status     OrderStatus
    DateFrom   time.Time
    DateTo     time.Time
}

func BuildFilter(params OrderFilter) *sqlc.ListOrdersParams { ... }
```

#### channel 必须指定元素类型，禁止 `chan interface{}`

```go
// ❌
events := make(chan interface{}, 100)

// ✅
events := make(chan PaymentEvent, 100)
```

#### 枚举/状态值使用强类型，禁止裸 string / int

```go
// ❌ 裸字符串状态，散落各处难以重构
func UpdateStatus(id string, status string) error { ... }
// 调用方: UpdateStatus("ord_1", "paid")  或 "PAID"？"Paid"？无从判断

// ✅ 强类型枚举，编译器保障
type OrderStatus string
const (
    OrderStatusPending  OrderStatus = "PENDING"
    OrderStatusPaid     OrderStatus = "PAID"
    OrderStatusExpired  OrderStatus = "EXPIRED"
    OrderStatusCanceled OrderStatus = "CANCELED"
)

func UpdateStatus(id string, status OrderStatus) error { ... }
// 调用方: UpdateStatus("ord_1", OrderStatusPaid)  — 一目了然
```

#### map 键值类型明确

```go
// ❌ 键值类型模糊，运行时类型断言风险
var cache map[string]interface{}

// ✅ 明确值类型
var orderCache map[string]*Order
var rateTable map[string]decimal.Decimal
```

---

### 11.5 Go 指针与目录结构的关系

#### 跨包指针传递原则

指针在不同层（handler / service / repository）之间传递时，遵循**数据流向单向传递**原则：请求数据向下传，领域对象向上返回，不得向上层传递底层实现的内部指针。

```
internal/
├── handler/         ← 接收 HTTP/gRPC 请求，持有 *service.OrderService（依赖指针）
│   └── order_handler.go
├── service/         ← 持有接口（不持有 *repository.OrderRepo 指针）
│   ├── interfaces.go          // 定义 OrderStore 接口
│   └── order_service.go
├── repository/      ← 持有 *pgxpool.Pool（基础设施指针，不暴露给上层）
│   └── order_repo.go
└── domain/          ← 纯数据结构，无外部依赖，只含值类型和标准库指针
    └── order.go
```

**各层指针使用规范**：

```go
// handler 层：持有 service 的指针，不持有 repo 指针
// handler/order_handler.go
type OrderHandler struct {
    svc *service.OrderService  // ✅ 通过 service 层操作，不直接引用 repo
}

// service 层：依赖接口，不持有具体实现指针
// service/order_service.go
type OrderService struct {
    orders service.OrderStore   // ✅ 接口，不是 *repository.OrderRepo
    logger *zap.Logger
}

// repository 层：持有基础设施指针，不暴露给上层
// repository/order_repo.go
type OrderRepo struct {
    pool *pgxpool.Pool   // ✅ DB 连接池指针，只在 repo 层使用，不向上暴露
}
```

#### domain 包禁止持有基础设施指针

```go
// ❌ domain 对象携带 DB 连接，破坏领域模型纯洁性
type Order struct {
    ID   string
    db   *pgxpool.Pool   // 严禁：domain 对象不能感知持久化层
}

// ✅ domain 对象只含业务数据和标准库类型
type Order struct {
    ID          string
    MerchantID  string
    Amount      decimal.Decimal
    Status      OrderStatus
    CreatedAt   time.Time
    CompletedAt *time.Time   // 可空用指针，但只用标准库类型
}
```

#### 构造函数统一返回指针

项目中所有结构体的构造函数（`NewXxx`）**统一返回指针**，不返回值类型，保持一致性并避免隐性拷贝：

```go
// ✅ 统一返回指针
func NewOrderService(orders OrderStore, logger *zap.Logger) *OrderService {
    return &OrderService{orders: orders, logger: logger}
}

func NewOrderRepo(pool *pgxpool.Pool) *OrderRepo {
    return &OrderRepo{pool: pool}
}

// ❌ 返回值类型，调用方赋值后续传指针需要取地址，不一致
func NewOrderService(...) OrderService {
    return OrderService{...}
}
```

#### 目录结构中的循环依赖防护

Go 禁止循环导入。通过合理的目录分层和接口定义位置来杜绝循环依赖：

```
// ❌ 循环依赖：service 导入 repository，repository 又导入 service
service → repository → service   // 编译报错

// ✅ 依赖方向单向：handler → service → repository → domain
//    service 通过接口依赖 repository，接口定义在 service 包
//    repository 只导入 domain，不导入 service

internal/domain/     ← 最底层，无内部依赖
internal/repository/ ← 导入 domain
internal/service/    ← 导入 domain，通过接口依赖 repository（接口在 service 包内定义）
internal/handler/    ← 导入 service
```

**接口定义在消费方（service 包）**，repository 包只实现接口，不导入 service 包，从根本上消除循环依赖的可能：

```go
// service/interfaces.go — 接口定义在消费方
package service

type OrderStore interface {
    Create(ctx context.Context, order *domain.Order) error
    GetByID(ctx context.Context, id string) (*domain.Order, error)
}

// repository/order_repo.go — 实现接口，不导入 service 包
package repository

import "yourproject/internal/domain"  // ✅ 只导入 domain

type OrderRepo struct{ pool *pgxpool.Pool }

func (r *OrderRepo) Create(ctx context.Context, order *domain.Order) error { ... }
func (r *OrderRepo) GetByID(ctx context.Context, id string) (*domain.Order, error) { ... }
// OrderRepo 自动满足 service.OrderStore 接口，无需显式声明
```