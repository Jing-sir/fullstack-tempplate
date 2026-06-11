@ai-knowledge/前端/new-upay-manage/AGENTS.md
@AI_BEGINNER.md
@AI_TASK_GUIDE.md

## 2FA 交互（强制）

- 所有 2FA 验证码输入必须复用 `src/components/GoogleCode.vue` 独立弹窗。
- 禁止在业务页面、表单、Modal 或 Drawer 中直接新增普通 `facode` 输入框。
- 业务字段先校验；需要业务确认时先确认；随后打开 `GoogleCode.vue`，使用其
  回传的完整 6 位验证码调用接口。
