# Safeheron MPC 钱包对接

## 1. 概述

Safeheron 是 UPay 的主流链上钱包方案，采用 **MPC（多方计算）托管**模式，私钥由多方分散持有，无需用户管理私钥。

UPay 通过 **Safeheron Java SDK**（`safeheron-api-sdk-java`，项目本地 lib）+ **Retrofit2** 封装 HTTP 客户端与 Safeheron 平台通信。

---

## 2. 涉及代码位置

| 类型 | 路径 |
|---|---|
| SDK 配置 & 初始化 | `upay-wallet-service/common/safeheron/config/SafeheronRetrofitConfig.java` |
| Dubbo Client 实现层 | `upay-wallet-service/impl/safeheron/` |
| 内部 Service 层 | `upay-wallet-service/service/impl/SafeHeron*.java` |
| 对外 Dubbo 接口 | `upay-wallet-client/interfaces/safeheron/I*.java` |
| 定时任务 | `upay-task/job/safeheron/` |
| 数据模型 | `upay-model/safeheron/` 和 `upay-model/safeheron/v2/` |
| Nacos 配置 | `safeheron.yml`（Nacos 中管理） |

---

## 3. SDK 与连接初始化

### 3.1 SafeheronRetrofitConfig

`SafeheronRetrofitConfig` 在 Spring 启动时通过 `@PostConstruct` 解密 Nacos 中的密钥，然后通过 Retrofit2 注册 Safeheron SDK 的四个 API Service：

```
SafeheronConfig（Nacos 配置）
    ↓ AesWalletUtil.decrypt(value, saltKey)  // AES 解密
SafeheronConfig（明文）
    ↓ RequestInterceptor.create(config)       // 注入签名拦截器
Retrofit 实例（单例，双重检查锁）
    ↓ retrofit.create(XxxApiService.class)
AccountApiService / TransactionApiService / CoinApiService / WhitelistApiService
```

**注册的 Bean：**

| Bean | 用途 |
|---|---|
| `AccountApiService` | 账户 & 地址管理 API |
| `TransactionApiService` | 交易发起 & 查询 API |
| `CoinApiService` | 币种信息 & 余额快照 API |
| `WhitelistApiService` | 白名单管理 API |

### 3.2 关键配置字段（safeheron.yml，Nacos 中加密存储）

| 配置键 | 说明 |
|---|---|
| `saltKey` | AES 解密盐值 |
| `baseUrl` | Safeheron API 基础地址 |
| `apiKey` | API 访问密钥 |
| `rsaPrivateKey` | 业务方 RSA 私钥（请求签名） |
| `safeheronRsaPublicKey` | Safeheron RSA 公钥（验证响应） |
| `safeheronWebhookRsaPublicKey` | Safeheron Webhook RSA 公钥 |
| `webhookRsaPrivateKey` | Webhook 解密私钥 |
| `bizPrivKey` | CoSigner 业务私钥 |
| `apiPubKey` | CoSigner API 公钥 |
| `webhookIp` | Webhook 来源 IP 白名单 |
| `coSignerIp` | CoSigner 来源 IP 白名单 |
| `requestTimeout` | 请求超时（毫秒，默认 20000）|

---

## 4. 核心功能模块

### 4.1 账户 & 地址创建

**入口：** `ISafeHeronAddressService.createSafeHeronAddress(SafeHeronCreateAddressDto)`

**流程：**

```
1. 查询站点支持的币种（WalletSiteCoin → SafeCoinInfo）
2. 获取链信息（blockChainType：EVM / TRON / BTC / SOLANA...）
3. 查询已有账户中哪些可以复用（safeHeronAccountBlockService.excludingAccountsWithBlockType）
4. 不够数量 → 调用 Safeheron API 批量创建账户
   accountApiService.batchCreateAccountV2(BatchCreateAccountRequest)
   - accountName: 账户名称
   - hiddenOnUI: false（展示在 App/Web）
   - count: 创建数量
   - autoFuel: true（自动补 Gas）
   - accountTag: "DEPOSIT"（充值地址）
5. 保存账户到本地 safe_account 表
6. 记录账户支持的链类型（SafeHeronAccountBlock）
7. 为账户添加币种 + 生成地址
   accountApiService.batchCreateAccountCoin(BatchCreateAccountCoinRequest)
   - coinKey: 如 USDT_TRC20、ETH、BTC
   - accountKeyList: 账户 Key 列表
8. 保存 SafeAccountAddress（safe_account_address 表）
9. 保存 WalletAddressV2（业务地址池，wallet_address_v2 表）
   - TRON 地址激活状态初始为 CONFIRMING（需要激活）
   - 其他链地址激活状态为 SUCCESS
```

**数据模型：**

| 表 | 模型 | 说明 |
|---|---|---|
| `safe_account` | `SafeAccount` | Safeheron 账户，`accountType`：1=用户账户 2=系统账户 |
| `safe_account_address` | `SafeAccountAddress` | 账户下的币种地址（含 BTC UTXO 派生地址）|
| `safe_account_coin` | `SafeAccountCoin` | 账户开通的币种 |
| `safe_account_pub_key` | `SafeAccountPubKey` | 账户公钥 |
| `safeheron_account_block` | `SafeHeronAccountBlock` | 账户已开通的链类型（复用判断）|
| `wallet_address_v2` | `WalletAddressV2` | 业务地址池，与 accountId 绑定 |

---

### 4.2 提币（Withdraw）

**入口：** `ISafeHeronTransactionsServiceV2.withdraw(OrderWithdrawDto)`

**流程：**

```
1. 准备提币参数（OrderWithdrawDto.SafeHeronWithdrawData）
   - fromAddress: 来源地址（Safeheron 金库地址）
   - toAddress: 目标地址
   - coinKey: 币种 Key（如 USDT_TRC20）
   - actualReceivedAmount: 实际到账金额
   - customerRefId: 业务唯一ID（防重）
   - note: 备注（通常是订单号）
   - accountSourceTypeEnum: VAULT_ACCOUNT（金库账户）
   - accountTarget: VAULT_ACCOUNT 或 ONE_TIME_ADDRESS（陌生地址）
   - txType: TxTypeEnum.WITHDRAW

2. Redis 缓存 customerRefId（1 分钟，防重放）
   stringRedisTemplate.opsForValue().set(SAFEHERON_CUSTOMER_REF_ID + customerRefId, ...)

3. 查询 from 地址对应的账户 Key
   accountApiService.getAccountByAddress(OneAccountByAddressRequest{address: fromAddress})

4. 构建 CreateTransactionRequest
   - customerRefId: 业务唯一ID
   - coinKey: 币种
   - txFeeLevel: HIGH（高优先级）
   - txAmount: 到账金额
   - treatAsGrossAmount: false（金额不含手续费）
   - sourceAccountKey: from 账户 Key
   - sourceAccountType: VAULT_ACCOUNT
   - destinationAddress: 目标地址
   - destinationAccountType: VAULT_ACCOUNT / ONE_TIME_ADDRESS
   - failOnAml: false（不因 AML 拦截失败）
   - balanceVerifyType: BALANCE_CHECK（余额校验）

5. 本地保存 SafeHeronTransactionsV2（状态：SUBMITTED）
   - 表：safeheron_transactions_v2

6. 调用 Safeheron API 发起交易
   transactionApiService.createTransactionsV3(CreateTransactionRequest)
   → 返回 txKey（Safeheron 交易唯一标识）

7. 保存 txKey 到本地订单，供后续回调关联
```

**提币失败处理：** 抛出 `AppServerException` 触发事务回滚，外层通过补偿记录失败信息。

---

### 4.3 充值 Webhook 回调

**入口 HTTP Controller（upay-external-api 或 upay-wallet-service）：**

原旧版（已注释）：`SafeheronControllerV1 → /v1/safeheron/webhook`
当前新版：由 `SafeHeronCallBackClientImplV2.webhookTransaction(body, ipAddr)` 接收

**流程：**

```
1. IP 白名单校验（config.getWebhookIp()）
2. 解密 WebHook 数据
   webhookConverter.convert(webHook)
   → WebHookBizContent（含 eventType + eventDetail）
3. 按 eventType 分发：
   ├── TRANSACTION_CREATED
   ├── TRANSACTION_STATUS_CHANGED       → safeHeronTransactionsServiceV2.webhookTransaction(TransactionParam)
   ├── TRANSACTION_CUSTOMIZED_CONFIRMING
   ├── WHITELIST_ADDED / UPDATED / REMOVED  → 白名单管理（已注释，待实现）
   └── 其他 → 返回 FAIL

4. webhookTransaction 处理逻辑（SafeHeronTransactionsServiceImplV2）：
   a. 防重处理（Redis Key：safeheron:v2:tx:customer_ref_id: 或 safeheron:v2:tx:tx_key:）
   b. 若订单已存在 → 更新 txKey、hash，直接返回
   c. 若订单不存在 → 构建 SafeHeronTransactionsV2 并保存
      - txType: DEPOSIT（充值）
      - exchangeType: 1=内部转账 2=外部转账（根据 transactionDirection）
   d. 查询目标地址是否在 wallet_address_v2 表（地址归属校验）
   e. 根据 walletSiteId 查询站点币种（WalletSiteCoin）
   f. 创建 Transfer 业务订单（transfer 表）
      - state: CONFIRMING（确认中）
      - walletState: 按 Safeheron 状态映射
      - walletType: SAFE_HERON
      - riskCoinStatus: UNFROZEN（默认未冻结）
      - riskLevel: RISK_LEVEL_LOW
```

---

### 4.4 CoSigner 审批回调

**作用：** Safeheron CoSigner 在提币前向业务方请求审批，业务方校验通过后返回 APPROVE/REJECT。

**入口：** `SafeHeronCallBackClientImplV2.coSignerCallBack(body, ipAddr)`

**流程：**

```
1. IP 白名单校验（config.getCoSignerIp()）
2. 解密审批请求
   coSignerConverter.requestV3Convert(CoSignerCallBackV3)
   → CoSignerBizContentV3（含 approvalId + detail）
3. 校验 detail 类型为 TransactionApproval：
   a. 按 txKey 查询本地 SafeHeronTransactionsV2
   b. 校验金额（txAmount）是否一致
   c. 校验目标地址（destinationAddress）是否一致
   d. 全部通过 → setAction(APPROVE)
   e. 任一异常 → setAction(REJECT)
4. 加密响应：
   coSignerConverter.responseV3Converter(CoSignerResponseV3)
   → 返回加密后的 JSON Map
```

**关键点：** CoSigner 回调只做双重校验（金额 + 地址），不执行业务逻辑修改。

---

### 4.5 交易状态轮询

**作用：** 应对 Webhook 延迟或丢失，定时主动查询 Safeheron API 同步交易状态。

**定时任务：** `TransactionsTaskV2`（`upay-task` 模块）

```
@Scheduled(initialDelay=10s, fixedDelay=10s)
checkSafeHeronTransactionsState：
  1. 查询本地 safeheron_transactions_v2 中处于进行中的订单
     状态：TransactionsStateEnum.queryUnderConfirmation() 返回的状态集合
  2. 逐条加 Redis 分布式锁（safeheron:v2:transactions:{orderNo}，10s 过期）
  3. 调用 Safeheron API 查询最新状态
     transactionApiService.oneTransactions(OneTransactionsRequest{txKey, customerRefId})
  4. 更新本地 SafeHeronTransactionsV2 字段：
     transactionStatus、transactionSubStatus、txFee、blockHeight、completedTime、hash 等

@Scheduled(initialDelay=10s, fixedDelay=10s)
checkDeposit：
  1. 查询 transfer 表中 Safeheron 充值待入账订单
     depositWithdrawClient.querySafeHeronDepositPendingList()
  2. 逐条执行入账：
     depositWithdrawClient.depositSafeReceived(transfer)
```

---

### 4.6 地址归集（Collection）

**作用：** 将用户地址中的余额归集到系统热钱包，降低提币时的链上交互复杂度。

**定时任务：** `CollectionTask`

```
@Scheduled(fixedDelay=30s)
executionCreateCollection：
  1. 查询待归集地址（safe_collection_address 表，满足归集规则）
  2. 调用 IAddressCollectionClient.executionCreateCollection(collectionAddress)
     → 向 Safeheron 发起归集交易（普通 Token 归集）

@Scheduled(fixedDelay=30s)
executionCollection：
  1. 查询归集订单（wallet_collection 表，状态=PENDING）
  2. 调用 IAddressCollectionClient.executionCollection(walletCollection)

@Scheduled(fixedDelay=20s)
checkCollection：
  1. 查询归集中订单（状态=CONFIRMING）
  2. 调用 IAddressCollectionClient.checkCollection(walletCollection)
     → 确认归集是否完成，更新状态
```

**BTC UTXO 特殊归集：** 历史版本通过 `collectionTransactionsUTXO()` 实现（当前已注释），使用 `CollectionTransactionsUTXORequest` 指定源/目标账户 Key + 最小归集金额。

---

### 4.7 Tron 地址激活

**原因：** Tron 新地址首次收款前需要激活（发送激活交易消耗能量/TRX），否则无法接收转账。

**定时任务：** `AddressTask`

```
@Scheduled(fixedDelay=30s)
activateAddress：
  1. 查询待激活地址（TronActivateAccount，状态=PENDING）
  2. IActivateAddressClient.activateAddress(address)
     → 向 Safeheron 发起 TRX 转账激活交易

@Scheduled(fixedDelay=30s)
checkActivateAddress：
  1. 查询激活中订单
  2. IActivateAddressClient.checkActivateAddress(activateOrder)
     → 确认激活是否成功，更新 wallet_address_v2.activateState = SUCCESS
```

---

## 5. 版本演进（V1 → V2）

| 维度 | V1（已全部注释/弃用）| V2（当前生产）|
|---|---|---|
| 账户创建 | `SafeheronAccountServiceImpl`（实现 `ISafeheronAccountClient`）| `SafeHeronAddressServiceImpl` 直接调用 `accountApiService` |
| 交易管理 | `SafeheronTransactionServiceImpl`（实现 `ISafeheronTransactionClient`）| `SafeHeronTransactionsServiceImplV2`（实现 `ISafeHeronTransactionsServiceV2`）|
| Webhook 入口 | `SafeheronControllerV1`（`upay-external-api`）+ `ISafeheronWalletServiceClient` | `SafeHeronCallBackClientImplV2`（直接 Dubbo `@Service`）|
| 归集 | `collectionTransactionsUTXO`（仅 BTC UTXO）| `IAddressCollectionClient`（通用归集，包含 TRON Token）|
| 数据表 | `safe_transactions`、`safe_transactions_info` | `safeheron_transactions_v2` |
| 加解密 | `SafeHeronAes.getInstance().decrypt(config)` | `AesWalletUtil.decrypt(value, saltKey)`（统一工具类）|
| CoSigner 协议 | V1：`CoSignerCallBack` / `CoSignerConverter` | V2：`CoSignerCallBackV3` / `CoSignerConverter.requestV3Convert` |

> **结论：** 代码库中 V1 相关实现类全部已被注释，当前仅 V2 逻辑在运行。V1 代码保留作历史参考，不可直接重启。

---

## 6. 关键数据表

| 表名 | 对应模型 | 说明 |
|---|---|---|
| `safe_account` | `SafeAccount` | Safeheron 账户（1=用户 2=系统）|
| `safe_account_address` | `SafeAccountAddress` | 账户下各币种地址（含派生路径）|
| `safe_account_coin` | `SafeAccountCoin` | 账户开通的币种 |
| `safe_account_pub_key` | `SafeAccountPubKey` | 账户公钥信息 |
| `safe_account_coin_address` | `SafeAccountCoinAddress` | 账户币种地址余额信息 |
| `safeheron_account_block` | `SafeHeronAccountBlock` | 账户已开通的链类型（EVM/TRON/BTC 等，复用判断）|
| `safeheron_transactions_v2` | `SafeHeronTransactionsV2` | 所有 Safeheron 交易记录（充/提/归集/激活）|
| `safe_collection_address` | `SafeCollectionAddress` | 待归集地址 |
| `wallet_collection` | `WalletCollection` | 归集订单 |
| `wallet_collection_rule` | `WalletCollectionRule` | 归集规则（阈值/目标地址/手续费等级）|
| `safe_coin_info` | `SafeCoinInfo` | Safeheron 支持的币种信息（coinKey 映射）|
| `safe_coin_balance_snapshot` | `SafeCoinBalanceSnapshot` | 币种余额快照（按日）|
| `safe_utxo_collection` | `SafeUtxoCollection` | BTC UTXO 归集记录 |
| `safe_transactions_accelerate` | `SafeTransactionsAccelerate` | 交易加速记录 |
| `safe_transactions_cancel` | `SafeTransactionsCancel` | 交易取消记录 |
| `safe_speed_up_history` | `SafeSpeedUpHistory` | 加速历史 |

---

## 7. 交易状态枚举（TransactionsStateEnum）

Safeheron 交易状态流转（从 `transactionStatus` 字段反映）：

```
SUBMITTED           → 已提交（等待审批）
APPROVED / REJECTED → CoSigner 审批结果
PROCESSING          → 链上处理中
BROADCASTED         → 已广播
CONFIRMING          → 确认中
CONFIRMED           → 已确认（充值到账触发）
FAILED              → 失败
```

`TransactionsStateEnum.queryUnderConfirmation()` 返回需要轮询的中间态状态集合（SUBMITTED、PROCESSING、BROADCASTED、CONFIRMING）。

**业务侧 `Transfer.walletState` 映射：**

```java
TransferWalletStateEnum.getSafeheronWalletConvertState(transactionStatus)
```

---

## 8. 防重与并发控制

| 场景 | Redis Key | TTL | 机制 |
|---|---|---|---|
| Webhook 回调防重（有 customerRefId）| `safeheron:v2:tx:customer_ref_id:{id}` | 1 分钟 | `hasKey` 检查 |
| Webhook 回调防重（仅 txKey）| `safeheron:v2:tx:tx_key:{txKey}` | 1 分钟 | `setIfAbsent` |
| 提币发起防重 | `safeheron:v2:tx:customer_ref_id:{customerRefId}` | 1 分钟 | `opsForValue().set` |
| 交易状态轮询分布式锁 | `safeheron:v2:transactions:{orderNo}` | 10 秒 | `setIfAbsent` |

---

## 9. 常见问题 & 注意事项

1. **IP 白名单**：Webhook 和 CoSigner 回调都做了 IP 来源校验，测试环境需要确保 `webhookIp` / `coSignerIp` 配置正确，否则直接返回 FAIL/REJECT。

2. **密钥解密**：所有密钥在 Nacos 中以 AES 加密存储，通过 `AesWalletUtil.decrypt(encryptedValue, saltKey)` 解密，`saltKey` 是唯一的解密盐值，不能泄露。

3. **TRON 地址激活**：新创建的 TRON 地址 `activateState = CONFIRMING`，激活定时任务完成后置为 `SUCCESS`，激活前该地址不应分配给用户充值。

4. **txType 说明**：`safeheron_transactions_v2.txType` 区分交易用途：
   - 1 = 充值（DEPOSIT）
   - 2 = 提币（WITHDRAW）
   - 3 = 归集（COLLECTION）
   - 4 = 补充 Gas（REPLENISH）
   - 5 = 激活 TRON 地址（ACTIVATE）

5. **failOnAml**：提币时设为 `false`，意味着即使 AML 有风险提示也继续执行，风险由业务侧前置控制。

6. **txFeeLevel**：提币统一使用 `HIGH`（高优先级手续费），确保交易快速上链。

7. **V1 代码**：`SafeheronWalletServiceImpl`、`SafeheronAccountServiceImpl`、`SafeheronTransactionServiceImpl` 均已注释，不参与任何 Spring Bean 注册，**不要解注释后直接上线**，需要完整评审后再启用。
