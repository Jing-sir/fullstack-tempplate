# Tab 与分段控制

## LiteSlidingSegmentedControl — 胶囊式 SegmentedControl

iOS 风格的胶囊 Tab，选中项白色背景圆角高亮。需配合 `TabController` 使用。

导入：`import 'package:flutter_template/widgets/LiteSlidingSegmentedControl.dart';`

### 基本用法

```dart
// State 中
late TabController _tabController;

@override
void initState() {
  super.initState();
  _tabController = TabController(length: 2, vsync: this);
}

@override
void dispose() {
  _tabController.dispose();
  super.dispose();
}

// View 中
LiteSlidingSegmentedControl(
  controller: _tabController,
  tabs: ['全部'.tr, '进行中'.tr],
  onTap: (index) => logic.onTabChanged(index),
)
```

### 搭配 TabBarView

```dart
Column(
  children: [
    LiteSlidingSegmentedControl(
      controller: _tabController,
      tabs: ['收入'.tr, '支出'.tr],
    ),
    SizedBox(height: 12.w),
    Expanded(
      child: TabBarView(
        controller: _tabController,
        children: [
          IncomeList(),
          ExpenseList(),
        ],
      ),
    ),
  ],
)
```

### 嵌入 AppBar

使用 `liteTabAppBar`（见 AppBar 文档），不要直接将 `LiteSlidingSegmentedControl` 放到 AppBar title 里。

---

## CustomTabView — 单个 Tab 项（下划线样式）

不依赖 `TabController`，适合自定义 Tab 布局或需要联动滚动的场景。

导入：`import 'package:flutter_template/widgets/custom_tab_view.dart';`

```dart
// State 中
var tabIndex = 0.obs;

// View 中
Obx(() => Row(
  children: ['账单'.tr, '明细'.tr].asMap().entries.map((e) {
    return CustomTabView(
      title: e.value,
      selected: tabIndex.value == e.key,
      onTap: () => tabIndex.value = e.key,
    ).expanded();
  }).toList(),
))
```

---

## 选型指南

| 场景 | 使用 |
| --- | --- |
| 标准胶囊样式，联动 TabBarView | `LiteSlidingSegmentedControl` |
| 嵌入 AppBar 标题区 | `liteTabAppBar`（见 app-bar.md） |
| 下划线样式，不用 TabController | `CustomTabView` |
