# 表格单元格展示契约

这个文件规定列表页字段怎么展示。AI 新增或修改表格列时必须遵守。

## UID / 编号 / 单号

这些字段是定位业务数据的关键字段，必须完整可读，并且字段后面要有复制 icon。

适用字段：

- `uid`、`userId`、`accountId`
- `id`、`xxxId`
- `orderNo`、`serialNo`、`customerNo`、`invitationCode`
- 中文标题包含：`UID`、`ID`、`编号`、`邀请码`、`单号`、`流水号`、`订单号`、`账号`

标准写法：

```ts
{
    title: t('用户UID'),
    dataIndex: 'uid',
    width: 180,
    amountFormat: false,
    cellPreset: { type: 'copyableText' },
}
```

如果展示字段和复制字段不同：

```ts
{
    title: t('订单编号'),
    dataIndex: 'orderNoText',
    width: 200,
    cellPreset: {
        type: 'copyableText',
        valueField: 'orderNoText',
        copyField: 'orderNo',
    },
}
```

规则：

- 不要让 UID / 编号类字段默认走省略号
- 不要手写复制按钮 slot
- 复制入口只用 icon，不用文字按钮
- 点击复制 icon 后必须给用户反馈，成功提示 `复制成功`，失败提示 `复制失败`
- 空值显示 `--`，空值不展示复制 icon
- ID 字段不做金额千分符格式化，必要时加 `amountFormat: false`

说明：

- `TableSearchWrap` 会自动识别常见 UID / ID / 编号字段并渲染为 `copyableText`
- `copyableText` 内部负责复制和 Message 反馈，不要在页面里重复写复制和提示逻辑
- 新页面仍然建议显式写 `cellPreset: { type: 'copyableText' }`，让代码意图更清楚

## 列宽分档

列表页不要靠一个很大的 `scroll.x` 把表格撑开。列宽按字段类型分档：

| 字段类型 | 建议宽度 | 备注 |
| --- | --- | --- |
| 状态 / 用户类型 / 区号 | 80-120 | 短文本，不要被撑宽 |
| 姓 / 名 / 标签 | 100-140 | 普通短字段 |
| UID / 编号 / 邀请码 | 140-180 | 使用 `copyableText` |
| 国家 / 证件类型 / 手机号 | 120-160 | 中等字段 |
| 邮箱 | 160-200 | 超出走默认省略和弹层 |
| 时间 | 170-190 | 保持一行展示 |
| 操作 | 180-240 | 按按钮数量调整 |

规则：

- 项目按 1920 宽屏设计，视口宽度低于 1550 时，`TableSearchWrap` 会根据列宽估算自动开启横向滚动
- 即使视口不低于 1550，只要列宽总和超过表格容器，`TableSearchWrap` 也会自动提高 `scroll.x`
- `scroll.x` 应接近列宽总和，不要明显大于列宽总和
- 短字段不要为了填满表格给到 180 以上
- `globalCode`、`区号` 不是业务编号，不要使用 `copyableText`
- 邮箱、备注、地址这类长文本不要硬撑很宽，使用默认省略和弹层即可

## 长文本

普通长文本继续使用默认省略 + 点击弹出全文。

适用字段：

- 地址
- 哈希
- 备注
- 错误信息
- 长名称

默认写法：

```ts
{
    title: t('备注'),
    dataIndex: 'remark',
    width: 240,
}
```

## 时间字段

时间字段不展示复制 icon，也不使用长文本复制弹层。

```ts
{
    title: t('创建时间'),
    dataIndex: 'createTime',
    width: 180,
}
```

## 状态字段

状态字段使用 `statusText`，不要在页面里手写状态颜色。

```ts
{
    title: t('状态'),
    dataIndex: 'state',
    width: 100,
    cellPreset: { type: 'statusText', preset: 'userState' },
}
```
