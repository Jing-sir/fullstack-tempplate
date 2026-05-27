## ADDED Requirements

### Requirement: 返佣业务配置列表展示
返佣业务配置页（`/kolConfiguration/rebateBusinessConfiguration`）管理 KOL 返佣规则，支持多条件搜索、行内启停、批量操作、新增/编辑/查看。

#### Scenario: 列表加载
- **WHEN** 用户进入返佣业务配置页
- **THEN** 加载列表，展示字段：ID、业务类型（bizTypeName）、卡片类型（cardTypeName）、渠道名称（ditchName）、卡片名称（cardName）、返佣比例%（rebateRatio）、返佣范围（rebateRangeName）、范围详情（rebateRangeValue）、起始时间（startTimeStr）、结束时间（endTimeStr）、更新时间、状态（Switch 控件）、操作列（编辑）

#### Scenario: 多条件搜索
- **WHEN** 用户设置以下任意条件后触发搜索
- **THEN** 列表按条件过滤，分页重置第 1 页
  - 业务类型（select：全部/开卡=1/充值=2）
  - 卡片类型（select：全部/虚拟卡=1/实体卡=2）
  - 生效时间（时间范围，转为时间戳 startTime/endTime）
  - 状态（select：全部/已开启=1/已关闭=2）
  - 渠道名称（select，options 来自 `/ditch/info?state=1` 接口，按 name 字段过滤）
  - 卡片名称（select，options 同上，按 name 字段过滤）
  - 合伙人用户UID（input）

#### Scenario: 行内启停
- **WHEN** 用户点击状态列 Switch（需权限 `enable`）
- **THEN** 调用批量启停接口（单条 id），成功后刷新列表；无需二次确认弹窗

#### Scenario: 批量开启
- **WHEN** 用户勾选若干行（当前筛选状态=已关闭=2）且点击批量开启按钮（需权限 `batchClose`）
- **THEN** 按钮在未勾选或筛选状态非"已关闭"时禁用；点击后调用 `/KolRebateConf/batchOpenOrClose`（state=1），成功后清空勾选并刷新列表

#### Scenario: 批量关闭
- **WHEN** 用户勾选若干行（当前筛选状态=已开启=1）且点击批量关闭按钮（需权限 `batchOpening`）
- **THEN** 按钮在未勾选或筛选状态非"已开启"时禁用；点击后调用 `/KolRebateConf/batchOpenOrClose`（state=2），成功后刷新

#### Scenario: 批量删除
- **WHEN** 用户勾选若干行（筛选状态=已关闭=2）且点击批量删除按钮（需权限 `batchDeletion`）
- **THEN** 按钮在未勾选或筛选状态非"已关闭"时禁用；点击后使用 `useConfirmAction` 弹出确认，确认后调用 `/KolRebateConf/batchDelete`，成功后清空勾选并刷新

#### Scenario: 新增返佣配置
- **WHEN** 用户点击添加按钮（需权限 `add`）
- **THEN** 打开新增 Drawer，表单字段：
  - 业务类型（select，开卡=1/充值=2，必填，新增时可编辑，编辑时禁用）
  - 卡片名称（select，options 来自 `/ditch/info?state=1`，必填，编辑时禁用）
  - 返佣范围（radio，全局=1/用户=3，必填，编辑时禁用）
  - 返佣范围值（当范围=用户=3 时显示，输入用户UID，逗号分隔多个）
  - 返佣比例（input，0-100 数字，最多两位小数，单位%，必填）
  - 生效时间（时间范围选择器，转时间戳，必填）
  - 状态（radio，启用=1/关闭=2，必填）

#### Scenario: 编辑/查看返佣配置
- **WHEN** 用户点击操作列编辑按钮（需权限 `edit`）
- **THEN** 打开编辑 Drawer，回填数据；业务类型、卡片名称、返佣范围字段禁用

#### Scenario: 表单提交
- **WHEN** 用户点击确认
- **THEN** 校验通过后调用 `/KolRebateConf/addOrUpdate`，成功后关闭 Drawer，刷新列表
