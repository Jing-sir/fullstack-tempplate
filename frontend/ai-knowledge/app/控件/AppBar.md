# AppBar 规范

所有 AppBar 从 `lib/widgets/base_app_bar.dart` 取，不要手动构造 `AppBar`。

导入：
```dart
import 'package:flutter_template/widgets/base_app_bar.dart';
```

---

## 函数列表

### SimpleAppbar — 通用页面标题栏（最常用）

自动判断能否返回，适配深色/浅色模式。

```dart
Scaffold(
  appBar: SimpleAppbar(
    title: Text('页面标题'.tr),
    actions: [
      IconButton(icon: Icon(Icons.more_vert), onPressed: () {}),
    ],
    back: () => logic.customBack(),   // 不传则默认 Get.back()
    isDark: true,                     // 不传则跟随系统主题
  ),
)
```

### SimpleSliverAppBar — CustomScrollView 中的吸顶 AppBar

```dart
CustomScrollView(
  slivers: [
    SimpleSliverAppBar(
      title: Text('标题'.tr),
      // 其他参数与 SimpleAppbar 相同
    ),
    // 其他 Sliver...
  ],
)
```

### simpleLoginAppbar — 登录页专用

图标固定黑色（不跟随主题），用于登录/注册流程。

```dart
appBar: simpleLoginAppbar(title: Text('登录'.tr))
```

### simpleNoBackAppbar — 无返回按钮

Leading 区域为空容器，无法返回，用于流程首页或强制完成页。

```dart
appBar: simpleNoBackAppbar(title: Text('设置密码'.tr))
```

### mainNewAppbar — 首页专用

左侧 Logo + 右侧通知红点 + 分享 + 语言切换，不用于普通页面。

```dart
appBar: mainNewAppbar(
  showNotice: true,
  showShare: true,
  showChangeLanguage: false,
)
```

### liteTabAppBar — 标题区内嵌胶囊 Tab

标题位置内嵌 `LiteSlidingSegmentedControl` 样式的 Tab 栏，需手动管理 `selectIndex`。

```dart
appBar: liteTabAppBar(
  tabs: ['选项一'.tr, '选项二'.tr],
  selectIndex: state.tabIndex.value,
  onTap: (index) => logic.onTabTap(index),
  isShowBack: true,
)
```

### liteMainAppbar — 通用文字标题栏

比 `SimpleAppbar` 更简单，标题直接传字符串，适合不需要复杂标题 Widget 的页面。

```dart
appBar: liteMainAppbar(
  title: '账单'.tr,
  actions: [TextButton(child: Text('筛选'.tr), onPressed: () {})],
)
```

---

## 选型指南

| 场景 | 使用 |
| --- | --- |
| 普通二级页面 | `SimpleAppbar` |
| CustomScrollView 中 | `SimpleSliverAppBar` |
| 登录/注册流程 | `simpleLoginAppbar` |
| 无需返回的页面 | `simpleNoBackAppbar` |
| 主页 | `mainNewAppbar` |
| 标题区有 Tab 切换 | `liteTabAppBar` |
| 简单标题栏（字符串标题） | `liteMainAppbar` |
