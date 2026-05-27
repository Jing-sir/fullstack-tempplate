# 网络层与 API 约定

## 统一入口

- API 常量定义：`lib/apis/apis.dart`
- 业务 API 封装：`lib/apis/*.dart`
- Dio 初始化：`lib/dio/dio_api.dart`

全局单例：

```dart
final ApiService api = DioApi.getInstance();
```

## 请求拦截流程

按注册顺序：

1. `BaseUrlInterceptor`
2. `HeaderInterceptor`
3. `MainInterceptor`
4. `LoggerInterceptor`

## Header 约定

`HeaderInterceptor` 注入以下关键头信息：

- `Language`
- `Equipment-Language`
- `Version` / `VersionCode`
- `Source`
- `DeviceId`
- `User-Agent`
- `UserTimeZone`
- `OffsetFormatted`
- `Token`

## 业务码处理（MainInterceptor）

1. `200`：请求成功，`response.data` 被替换为 `data` 字段。
2. `9003`：升级提示，保留 `data` 并透传。
3. `10005` / `10021`：登录失效，触发 `GlobalAppLogic.logoutState()`。
4. 其它 code：作为错误抛出，统一由错误处理链处理。

## 缓存策略（SharedPreferences）

- 缓存开关列表在 `AppConfig.cacheUrl`。
- 命中列表的接口在 `LoggerInterceptor.onResponse` 中写入本地。
- 某些接口缓存 key 包含 query 参数（例如 `securityList`、`newMyCard`）。
- 登出会清理一批关键缓存（见 `SpUtils.logout()`）。

## 新增接口建议流程

1. 在 `APIs` 添加 endpoint 常量。
2. 在对应业务文件（`lib/apis/*.dart`）新增封装方法。
3. 在页面 `logic.dart` 调用，不在 `view.dart` 直接写请求。
4. 如需缓存，将 endpoint 添加进 `AppConfig.cacheUrl`。
5. 如果是鉴权敏感接口，确认未登录态处理符合预期。
