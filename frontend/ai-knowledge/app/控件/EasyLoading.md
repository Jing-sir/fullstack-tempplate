# EasyLoading 使用规范

全局 loading 遮罩和 Toast 统一通过 `EasyLoading` 管理。

导入：
```dart
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_template/helper.dart'; // toast() 函数
```

---

## 场景一：操作中 loading（最常用）

提交表单、调用接口等耗时操作，show 前调用，完成后（无论成功失败）dismiss。

```dart
Future<void> save() async {
  EasyLoading.show();
  try {
    await CardApi.saveCardWarn(...);
    toast('保存成功'.tr);
    Get.back();
  } finally {
    EasyLoading.dismiss();
  }
}
```

> **必须在 `finally` 里 dismiss**，防止接口异常时 loading 永远不消失。

---

## 场景二：Toast 提示

使用项目封装的 `toast()` 函数，不要直接调用 `EasyLoading.showToast()`。

```dart
// 成功
toast('保存成功'.tr);

// 失败
toast('操作失败，请重试'.tr);

// 复制（helper 里已封装）
clipBoard(text);  // 自动调用 toast('复制成功'.tr)
```

`toast()` 定义在 `lib/helper.dart`，内部设置了 `maskType: none`（不阻断用户操作）。

---

## 场景三：带文字的 loading

上传文件等有明确进度语义的操作可以带状态文字。

```dart
EasyLoading.show(status: '${'上传中'.tr}...');
// ...
EasyLoading.dismiss();
```

---

## 禁止事项

```dart
// ❌ 不要用原生 CircularProgressIndicator 做全页 loading
if (state.isLoading.value) return Center(child: CircularProgressIndicator());

// ❌ 不要直接调用 showToast，用 toast() 封装函数
EasyLoading.showToast('xxx');

// ❌ 不要忘记 dismiss，否则 loading 会卡住
EasyLoading.show();
await someApi();  // 如果这里抛异常，loading 永远不会消失
EasyLoading.dismiss();
```

---

## 各场景选型

| 场景 | 方案 |
| --- | --- |
| 全局操作（提交、保存、删除） | `EasyLoading.show()` + `finally dismiss` |
| 轻提示（成功/失败文案） | `toast('xxx'.tr)` |
| 全页首屏加载 | `ShimmerLoadingView`（见页面加载动画规范） |
| 列表加载更多 | `CustomScrollBar` 内置处理 |
| 按钮内嵌 loading | `CircularProgressIndicator(strokeWidth: 2)` |
