# 企业实践日记 AI 助手

把每天的实习草稿（几个关键词、零散记录）交给 AI，整理成规范的企业实践日记，并一键导出为学校模板格式的 Word 文档。

纯前端应用，无后端：日记数据存在浏览器 localStorage，AI 接口由使用者自己在设置页配置。

## 功能

| 页面 | 说明 |
|---|---|
| 今天 `/` | 填三段草稿（今天发生了什么 / 有什么收获 / 还想留下什么），AI 整理成正式日记；可保存、导出 Word、重写 |
| 成长档案 `/history` | 按时间线回看历史日记，支持查看详情、删除、重新导出 Word |
| 设置 `/settings` | 个人信息（姓名/学号/班级/学院/专业/指导教师/实习单位/企业指导教师/实习起止）与 AI 接口配置 |

- **Word 导出** — 基于学校原始模板做 XML 级文本替换，保留 100% 原始格式
- **移动端适配** — 桌面侧边栏，移动端底部导航
- **岗位记忆** — 记住上次使用的实习岗位，默认 `PQE`

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 |
| 路由 | react-router-dom 7 |
| Word | JSZip（模板 XML 替换）+ file-saver |
| 测试 | Vitest |
| 数据 | 浏览器 localStorage |

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run build      # 类型检查 + 生产构建
npm run typecheck  # 仅类型检查
npm test           # 运行测试（一次性）
npm run test:watch # 测试监听模式
npm run preview    # 预览构建产物
```

## 目录结构

```
src/
├── components/layout/    # Layout / Sidebar / MobileNav
├── lib/
│   ├── ai.ts             # AI 调用：Prompt 构建、API 调用、生成主流程与降级策略
│   ├── text.ts           # 纯文本处理：汉字计数、句子截断、分栏解析（可单测）
│   ├── storage.ts        # localStorage 数据层（含旧版本数据迁移）
│   ├── word.ts           # Word 模板填充
│   └── templateData.ts   # 学校模板 .docx（base64 内嵌，无需网络请求）
├── pages/                # DiaryCreatePage / HistoryPage / SettingsPage
├── test/setup.ts         # 测试用最小 localStorage 桩
└── types/index.ts        # 领域类型（即存储层的真实结构）
```

## 数据与隐私

- 所有日记与个人信息**只存在本机浏览器 localStorage**，不上传任何服务器。
- AI 请求由浏览器直接发往你在设置页填写的 API 地址，API Key 同样只存本地。
- ⚠️ **清除浏览器数据会删除全部日记。** 备份/导入能力见「路线图」。

localStorage 键名：

| 键 | 内容 |
|---|---|
| `enterprise-diary-profile` | 个人信息 |
| `enterprise-diary-entries` | 日记列表 |
| `enterprise-diary-ai-config` | AI 接口配置（含 API Key） |
| `enterprise-diary-last-position` | 上次使用的实习岗位 |

## AI 生成流程

1. 一次生成全文，要求按 `===实习内容===` / `===实习体会和感受===` / `===其他===` 分段
2. 解析容错：兼容 `===名称===`、`【名称】`、`**名称**`、`## 名称`、独占一行的裸标题
3. 结构不合法或内容不足 → 带补充提示重试一次，两次结果择优
4. 推理预算耗尽（返回空内容）→ 自动切换**逐段生成**模式，每栏单独请求
5. 两次解析均失败 → 降级为全文归入「实习内容」，避免三栏重复显示

默认请求关闭思考参数以提速降本，网关不支持（400/422）时自动回退到推理模式。

字数目标（按汉字计）：实习内容 150–200、体会和感受 150–200、其他 80–120。

## Word 导出

模板在 `src/lib/templateData.ts` 中以 base64 内嵌。导出时用 JSZip 解包，在 `<w:r>` 级别做
文本替换，因此字体、段落、表格等原始格式完整保留。

> ⚠️ **已知限制**：模板定位依赖硬编码的占位文本（旧姓名、旧学号、旧实习内容等）。若模板调整、
> 或 Word 把一段文字拆进多个 `<w:r>`，匹配会失败并**静默输出模板原文**，使用者拿到的是别人的
> 内容却看到"下载成功"。修复计划见「路线图」V2。

## 路线图

- [x] **V0 工程质量底座** — git 基线、类型与存储结构对齐、清理无效依赖与凭据残留、Vitest 测试
- [ ] **V1 数据安全** — 草稿自动保存与恢复、一键备份 / 导入 JSON
- [ ] **V2 Word 导出可靠性** — 占位符定位取代硬编码文本、导出前校验、显式报错、批量导出
- [ ] **V3 生成质量** — 字数达标校验与自动补写、单栏重生成、岗位库、Prompt 可配置
- [ ] **V4 全站 UI 美化**
