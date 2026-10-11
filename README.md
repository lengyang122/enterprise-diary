# 企业实践日记 AI 助手

把每天的实习草稿（几个关键词、零散记录）交给 AI，整理成规范的企业实践日记，并一键导出为学校模板格式的 Word 文档。

纯前端应用，无后端：日记数据存在浏览器 localStorage，AI 接口由使用者自己在设置页配置。

## 功能

| 页面 | 说明 |
|---|---|
| 今天 `/` | 填三段草稿（今天发生了什么 / 有什么收获 / 还想留下什么），AI 整理成正式日记；可保存、导出 Word、重写 |
| 成长档案 `/history` | 按时间线回看历史日记，支持查看详情、删除、重新导出 Word |
| 设置 `/settings` | 个人信息（姓名/学号/班级/学院/专业/指导教师/实习单位/企业指导教师/实习起止）与 AI 接口配置；可「测试连接」自检，以及导出/导入 JSON 备份 |

- **Word 导出** — 基于学校原始模板做 XML 级文本替换，保留 100% 原始格式
- **批量导出** — 成长档案页可把全部日记一次打包成 zip（每篇一个 `.docx`）
- **字数达标保障** — 生成后按目标区间校验，偏短的栏目自动补写一次
- **单栏重新生成** — 某一栏不满意可单独重写，不影响其他内容
- **连接自检** — 设置页一键「测试连接」，用最小请求验证 API Key / 地址 / 模型是否可用
- **随机文案** — 首页顶部随机一条（古典劝学 / 质量管理格言 / 观察与记录），可「换一句」
- **草稿自动保存** — 正在写的内容实时存入本地，刷新或意外关闭后可恢复
- **数据备份** — 设置页一键导出 / 导入 JSON 备份，支持合并或覆盖
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

### 界面截图（开发期人工核对）

```bash
node scripts/screenshot.mjs           # 全部场景
node scripts/screenshot.mjs today     # 按名称前缀筛选
```

脚本内置静态服务器托管 `dist`，直接驱动系统已安装的 Edge（不下载浏览器），
内置个人信息 / 日记 / AI 配置 / 草稿四种数据状态，覆盖桌面 1280×900 与移动 390×844，
产出到 `screenshots/`（已 gitignore），同时收集页面 JS 错误。

## 测试

```bash
npm test
```

| 文件 | 覆盖范围 |
|---|---|
| `text.test.ts` | 汉字计数、句子级截断、多格式分栏解析、字数达标评估 |
| `storage.test.ts` | 个人信息字段防御、日记增删、旧四字段数据迁移、草稿读写 |
| `backup.test.ts` | 备份生成、非法/异版本备份拒绝、合并与覆盖导入 |
| `ai.test.ts` | **mock fetch** 覆盖生成管线：主路径、偏短补写、逐段兜底、降级、HTTP 错误、单栏重生成 |
| `word.test.ts` | XML 替换单元行为（保留前后文字、跨 run、转义、失配回报） |
| `word.integration.test.ts` | **真实内嵌模板**端到端：占位可定位性、替换链路、docx 产物、批量打包 |
| `DiaryCreatePage.test.tsx` | 草稿恢复与自动保存、导出失败显式报错、缺失信息确认 |
| `HistoryPage.test.tsx` | 列表渲染、批量导出、导出失败提示、缺失信息确认 |

## 目录结构

```
src/
├── components/
│   ├── icons.tsx         # 统一线性图标（20x20 网格，currentColor）
│   └── layout/           # Layout / Sidebar / MobileNav
├── lib/
│   ├── ai.ts             # AI 调用：Prompt 构建、API 调用、生成主流程与降级策略
│   ├── aiConfig.ts       # AI 接口配置读写
│   ├── text.ts           # 纯文本处理：汉字计数、句子截断、分栏解析（纯函数，可单测）
│   ├── storage.ts        # localStorage 数据层：个人信息、日记、草稿（含旧数据迁移）
│   ├── backup.ts         # 备份导出 / 校验 / 恢复
│   ├── word.ts           # Word 模板填充
│   └── templateData.ts   # 学校模板 .docx（base64 内嵌，无需网络请求）
├── pages/                # DiaryCreatePage / HistoryPage / SettingsPage
├── test/setup.ts         # 测试用最小 localStorage 桩
└── types/index.ts        # 领域类型（即存储层的真实结构）

scripts/
└── screenshot.mjs        # 界面截图（驱动系统 Edge，产出到 screenshots/）
```

## 数据与隐私

- 所有日记与个人信息**只存在本机浏览器 localStorage**，不上传任何服务器。
- AI 请求由浏览器直接发往你在设置页填写的 API 地址，API Key 同样只存本地。
- ⚠️ **清除浏览器数据会删除全部日记。** 请在「设置 → 数据备份」定期导出 JSON 备份。
- 草稿会实时自动保存，刷新或意外关闭页面后重新进入即可恢复。

localStorage 键名：

| 键 | 内容 |
|---|---|
| `enterprise-diary-profile` | 个人信息 |
| `enterprise-diary-entries` | 日记列表 |
| `enterprise-diary-ai-config` | AI 接口配置（含 API Key） |
| `enterprise-diary-last-position` | 上次使用的实习岗位 |
| `enterprise-diary-draft` | 未提交的草稿（含 AI 生成结果） |

## AI 生成流程

1. 一次生成全文，要求按 `===实习内容===` / `===实习体会和感受===` / `===其他===` 分段
2. 解析容错：兼容 `===名称===`、`【名称】`、`**名称**`、`## 名称`、独占一行的裸标题
3. 结构不合法或内容不足 → 带补充提示重试一次，两次结果择优
4. 推理预算耗尽（返回空内容）→ 自动切换**逐段生成**模式，每栏单独请求
5. **字数校验**：按目标区间评估三栏，偏短的栏目各补写一次（补写结果更短则保留原版）
6. 两次解析均失败 → 降级为全文归入「实习内容」，避免三栏重复显示

默认请求关闭思考参数以提速降本，网关不支持（400/422）时自动回退到推理模式。

字数目标（按汉字计）：实习内容 150–200、体会和感受 150–200、其他 80–120。
结果页会显示每栏实际字数与达标状态；任一栏可单独「重新生成」。

## Word 导出

模板在 `src/lib/templateData.ts` 中以 base64 内嵌。导出时用 JSZip 解包，在 `<w:r>` 级别做
文本替换，因此字体、段落、表格等原始格式完整保留。替换会保留匹配区间**前后**的文字，所以
即使 Word 把一段内容拆进多个 `<w:r>`，同 run 里的标签与相邻文字也不会被连带丢掉。

模板里的 13 处占位（旧姓名、旧学号、旧实习内容等）由 `TEMPLATE_SLOTS` 统一声明。
**任一处匹配失败都会抛出 `WordTemplateError` 并在页面上明确报错、指明是哪个字段失配**，
不再出现"静默输出模板原文、使用者却看到下载成功"的情况。

导出前会先做体检：个人信息缺项或实习内容为空时给出提示，确认后仍可继续（Word 对应位置留空）。

`src/lib/word.integration.test.ts` 直接跑真实内嵌模板做端到端校验，模板一旦被改动导致
占位失配，测试会立刻失败。

## 路线图

- [x] **V0 工程质量底座** — git 基线、类型与存储结构对齐、清理无效依赖与凭据残留、Vitest 测试
- [x] **V1 数据安全** — 草稿自动保存与恢复、一键备份 / 导入 JSON
- [x] **V2 Word 导出可靠性** — 替换保留前后文字、失配显式报错、导出前体检、批量导出 zip
- [x] **V3 生成质量** — 字数达标评估与自动补写、单栏重新生成、字数状态展示、岗位联想
- [x] **V4 全站视觉层级** — 设计令牌重做、卡片化层级、编号输入区、时间线卡片、空状态引导
- [x] **V5 Liquid Glass** — 液态玻璃材质、背景光斑、弹簧动效、iOS 蓝语义色体系

## 视觉体系 · Liquid Glass

整体走 iOS 26 的「液态玻璃」材质：半透明磨砂层浮在彩色背景之上，靠**透光与边缘高光**建立层次，
而不是靠阴影和边框堆叠。

### 字体

拉丁与中文**分开选**，靠 `font-family` 的逐字形回落自动分流：

| 平台 | 拉丁 | 中文 |
|---|---|---|
| 苹果设备 | `-apple-system` → SF Pro | `PingFang SC`（苹方） |
| Windows | `Segoe UI Variable`（可变字重） | `PingFang SC` → 缺失时回落 `Noto Sans SC` / 微软雅黑 |

顺序不能颠倒：Segoe 系列不含中日韩字形，所以排在苹方之前不会抢走中文；反过来若把苹方提前，
拉丁也会用苹方的拉丁字形（只有一个字重，粗细没有层次）。

> ⚠️ **SF Pro 与苹方是苹果专有字体，只随 macOS / iOS 提供，不能打包进网页。**
> 这里只是按名称引用：苹果设备上系统自带，Windows 上能用到什么取决于本机装了什么。
> 可用 CDP 的 `CSS.getPlatformFontsForNode` 核验某个元素实际落在哪个字体上。

### 材质

- **背景光斑**（`GlassBackground`）：底层铺 4 个大尺寸低饱和光斑（钢蓝 / 藕荷 / 灰青 / 暖褐），
  以 24–31s 超慢速度漂移。**这是玻璃材质成立的前提** —— 底下没有东西可透，磨砂就成了灰板。
- **玻璃层**（`.glass`）：`background: rgba(255,255,255,.42)` +
  `backdrop-filter: blur(28px) saturate(185%)`；
  厚度来自 `inset 0 1px 0` 顶部高光 + `inset 0 -1px 0` 底部微光 + 极淡外阴影。
- **镜面渐变**（`.glass::before`）：顶部白 → 透明，玻璃的「液态」感主要来自它。
- **强调色**：iOS 蓝 `#0A84FF`，只用在主按钮、当前导航项、位置标签。
- **语义色**：达标 `#1B7A4B` / 注意 `#B26B00` / 危险 `#D70015`。
- **组件类**：`.glass` `.btn-primary` `.btn-glass` `.btn-quiet` `.chip` `.chip-glass`
  统一定义在 `src/index.css`，页面不再各写一套。
- **动效**：弹簧曲线 `cubic-bezier(.34,1.56,.64,1)` —— 卡片悬停上浮、按钮按压回弹、
  焦点环淡入；入场用 `animate-riseIn` / `animate-popIn`。
- **可访问性**：`:focus-visible` 只在键盘聚焦时显示焦点环；
  `prefers-reduced-motion` 下自动关闭光斑漂移、入场动画与回弹。

### 折射滤镜（真液态玻璃）

`.glass` 在 Chromium 上会叠加一层**真折射**，不只是磨砂：

```
backdrop-filter: blur(28px) saturate(185%);                        ← 降级（Safari / Firefox）
@supports (backdrop-filter: url(#probe)) {
  backdrop-filter: blur(6px) url(#glass-refraction) saturate(170%); ← 折射
}
```

原理（`src/components/GlassFilterDefs.tsx` + `src/lib/displacementMap.ts`）：

1. **位移贴图**用 canvas 按圆角矩形程序化生成（不打包 base64 图片）：
   R 通道 = X 位移、B 通道 = Y 位移，128 = 不位移；中心为中性值，越贴边越强
2. `feDisplacementMap` 按贴图采样背景 → **边缘发生位移**
3. R/G/B 三通道用不同 scale 各做一次，再 `screen` 混合 → **边缘色散**
4. 贴图用 `preserveAspectRatio="none"` 拉伸，所以**一份全局滤镜就覆盖所有尺寸的元素**，
   不必改动各处 JSX（`GlassBackground` 里挂一次即可）

> ⚠️ **折射需要背景有高频细节才看得见。** 折射的本质是把身后的像素按边缘法线「搬移」，
> 背景若是一块平滑渐变，搬移前后一模一样，效果等于零 —— 这也是为什么 Apple 的玻璃永远
> 压在照片、图标、滚动文字上。
> 本项目背景是低饱和柔和渐变（刻意如此），所以折射**实际上基本不可见**；这一层的实际收益
> 主要是边缘色散带来的「玻璃感」与更通透的观感。想让折射真正显现，需要给背景加纹理 ——
> 这就是 `.glass-grain` 细颗粒层的作用（约 5.5% 透明度，只补细节、不加色彩噪声）。
>
> 对照实验见 `design/glass-compare.tsx` + `scripts/compare-glass.mjs`（`node scripts/compare-glass.mjs`）：
> 输出四格图 ——「纯磨砂 / 折射滤镜」×「纹理背景 / 柔和渐变」，一眼看清差异与边界。

> ⚠️ **`@supports` 不是可选的**：直接写 `url()` 一旦浏览器不支持，整条声明会被丢弃，
> 连原有的磨砂都没了，玻璃会彻底消失。

> ⚠️ **层叠陷阱**：`backdrop-filter` 会让元素创建**层叠上下文**。顶部栏与下方卡片各自成为独立
> 上下文且 `z-index: auto` 时，卡片会按 DOM 顺序画在顶栏之上，把顶栏里的下拉弹层盖住 ——
> 弹层自身的 `z-index` 出不了父上下文。解决方式是给顶部栏本身提级（如 `relative z-20`）。
> 岗位下拉就踩过这个坑。

## 移动端适配

### 断点

- `< 768px` 走移动布局：吸顶栏 + 底部导航，无侧边栏
- `>= 768px` 走桌面布局：固定侧边栏
- 对应 Tailwind 的 `md:`，代码里以 `md:hidden` / `hidden md:block` 切换

### iOS 安全区

`index.html` 开了 `viewport-fit=cover`，页面铺满整个屏幕，**固定定位的元素必须自己避开
刘海 / 灵动岛 / Home 指示条**（`src/index.css` 里的 `.glass-safe-*` 类，用 `env()` 取值，
不支持的环境退化为 0）：

| 类 | 用在哪 |
|---|---|
| `.glass-safe-top` | 移动端吸顶栏（含横屏时左右刘海） |
| `.glass-safe-bottom` | 移动端底部导航 |
| `.glass-safe-content` | 正文区，顶部让开吸顶栏、底部让开导航 |
| `.glass-safe-sidebar` | 桌面侧边栏（横屏手机刘海在侧边） |

### 触屏规则必须按「指针能力」判断，不能用屏幕宽度

iPhone 横屏有 852px 宽，**超过 768px 断点会走桌面布局**。若用 `max-width` 判断，
字号与触控规则在横屏下会全部失效。所以统一用：

```css
@media (hover: none) and (pointer: coarse) { ... }
```

覆盖两类问题：

1. **iOS 聚焦自动放大** —— iOS Safari 在聚焦 `font-size < 16px` 的输入框时会把整页放大，
   且不会自动缩回。触屏设备上输入框一律抬到 16px
2. **触控目标** —— iOS 人机指南建议最小 44×44pt。用 `.chip-tap`（小胶囊）、
   `.field-tap`（隐式输入框）、`.nav-item-tap`（侧栏导航）、以及 `.btn-*` 统一下限

### 体检脚本

```bash
node scripts/audit-mobile.mjs
```

按 5 种真实机型（iPhone SE / 15 Pro / Pixel 8 / 360px 小屏安卓 / iPhone 横屏）×
4 个页面共 20 个组合，检查：横向溢出（并指出越界元素）、触控目标尺寸、
输入框字号、底部导航遮挡、viewport 配置。**当前 20/20 全部通过。**

> 提示：横屏下会走桌面布局，此时页面里的 `<nav>` 是侧边栏导航而非底部导航，
> 脚本据此只在 `< 768px` 时做导航遮挡检查。

## 首次进入页（「假登录」）

首次打开会先经过 `/welcome`：看起来是登录/注册页，提交后揭晓「这里根本没有账号系统」。

```
/welcome  form      表单（登录 / 注册 标签页 + 两个输入框）
          ↓ 提交
          checking  「正在验证…」约 1.2 秒
          ↓
          reveal    揭晓：骗到你了 + 数据只存在本地
          ↓ 点「开始记录」
/         写入个人资料、标记已进入、进主页
```

### 两个刻意的设计决定

**1. 不做密码框。**

有密码框的页面是钓鱼站的标准形态，会带来三个具体后果：

- 被 Google Safe Browsing / Vercel 扫描标记为钓鱼 → **域名会被浏览器拦截**
- 密码管理器（Chrome / 1Password / iCloud 钥匙串）会弹「是否保存密码」
- 分享出去后，对方看到的是一个疑似窃取凭据的页面

所以表单问的是**名字**与**实习岗位**。仪式感一点没少，填的内容还真的有用
—— 直接写进个人资料，用于 Word 导出的署名栏。揭晓页会把用户填的内容念出来，
让他看到「你填的不是账号，是这本日记的扉页署名」。

**2. 只出现一次，且随时可重置。**

标记写在 localStorage（`enterprise-diary-entered`）。设置页 →「关于」→
「重新观看进入页」可重置重看。**重置只清标记，不动任何日记数据。**

> `hasEntered()` 在 localStorage 不可用（隐私模式）时返回 `true`，
> 避免把用户卡在门口。

> 截图脚本与移动端体检脚本都会预置这个标记，否则访问 `/` 会被重定向到 `/welcome`。
> 进入页自己的截图场景用 `skipEntered: true` 跳过预置。
