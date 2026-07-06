# 📚 英语单词卡片管理

基于 Gitee API v5 的纯前端英语单词卡片管理系统。无需后端服务器，数据存储在 Gitee 仓库中，通过浏览器直接读写。

## ✨ 功能概览

| 功能 | 说明 |
|------|------|
| 卡片列表 | 网格布局展示所有卡片，显示封面图、标题、单词数量、单词列表（英中对照） |
| 新增卡片 | 填写标题、单词列表、上传图片，保存到 Gitee 仓库 |
| 编辑卡片 | 修改已有卡片的标题、单词、图片 |
| 删除卡片 | 删除指定卡片，自动更新 JSON 数据 |
| 查看详情 | 全屏展示卡片详情：背景图磨砂模糊 + 2列单词卡片网格(磨砂玻璃) + 底部标题区(含图片缩略图)，点击标题区开始朗读，朗读完成后切换为3列布局 |
| 批量导入 | 粘贴 JSON 数组，自动解析填充为单词列表 |
| 图片上传 | 支持多图上传，自动压缩后存入仓库 `images/` 目录 |
| 配置管理 | 私人令牌 + 仓库地址，支持连接验证 |
| 刷新数据 | 重新从 Gitee 仓库拉取最新数据 |

## 🛠 技术栈

- **前端**：纯 HTML + CSS + 原生 JavaScript（无框架依赖）
- **后端**：Gitee API v5（文件 CRUD 操作）
- **数据存储**：Gitee 仓库 `data/words.json`
- **图片存储**：Gitee 仓库 `images/` 目录，通过 raw 链接访问
- **本地配置**：localStorage（保存令牌和仓库地址）

## 📁 项目结构

```
english_card_gitonline/
├── index.html          # 页面结构（配置弹窗、编辑弹窗、详情弹窗、卡片列表）
├── css/
│   └── style.css       # 全部样式（变量主题、卡片网格、弹窗、表单、批量输入等）
├── js/
│   ├── gitee.js        # Gitee API 封装（GiteeClient 类：getFile/createFile/updateFile/deleteFile）
│   ├── voice.js        # 语音朗读工具（SpeechSynthesis 封装：男声 Alex / 女声 Samantha）
│   └── app.js          # 业务逻辑（初始化、卡片 CRUD、批量导入、图片压缩上传、详情朗读、事件绑定）
├── data/
│   └── words.json      # 卡片数据（运行时自动创建）
├── images/             # 图片目录（运行时自动创建）
└── README.md           # 项目说明文档
```

## 📋 数据格式

### 卡片数据文件：`data/words.json`

文件内容为 JSON 数组，每个元素是一张卡片：

```json
[
  {
    "id": 1,
    "title": "形容焦虑的英语单词",
    "words": [
      {
        "en": "anxious",
        "zh": "焦虑的",
        "ph": "/ˈæŋkʃəs/"
      },
      {
        "en": "nervous",
        "zh": "紧张的",
        "ph": "/ˈnɜːrvəs/"
      }
    ],
    "images": [
      "https://gitee.com/hesir00/english_card_gitonline/raw/master/images/1719974400000_abc123.jpg"
    ]
  },
  {
    "id": 2,
    "title": "水果类单词",
    "words": [
      {
        "en": "watermelon",
        "zh": "西瓜",
        "ph": "/ˈwɔːtərmelən/"
      }
    ],
    "images": []
  }
]
```

### 字段说明

#### Card（卡片）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 卡片唯一标识，新增时自动取当前最大 ID + 1，也可手动指定 |
| `title` | `string` | 卡片标题，必填 |
| `words` | `Word[]` | 单词列表数组 |
| `images` | `string[]` | 图片 URL 数组，存储 Gitee raw 链接 |

#### Word（单词）

| 字段 | 类型 | 说明 |
|------|------|------|
| `en` | `string` | 英文单词 |
| `zh` | `string` | 中文翻译 |
| `ph` | `string` | 音标，如 `/ˈæŋkʃəs/` |

#### 批量导入 JSON 格式

在新增/编辑弹窗的「批量导入」文本框中粘贴以下格式的 JSON 数组，点击「解析填充」即可自动展开为单词列表：

```json
[
  {
    "en": "skittish",
    "zh": "易惊的",
    "ph": "/ˈskɪtɪʃ/"
  },
  {
    "en": "disquieted",
    "zh": "不安的",
    "ph": "/dɪsˈkwaɪətɪd/"
  }
]
```

### 图片存储

- 图片上传到仓库 `images/` 目录
- 文件名格式：`{时间戳}_{随机6位字符串}.{扩展名}`，如 `1719974400000_abc123.jpg`
- 访问链接格式：`https://gitee.com/{owner}/{repo}/raw/master/images/{filename}`
- 上传前自动压缩：宽度限制 1280px，体积限制约 500KB，质量从 0.8 逐步降低至 0.2
- 小于 400KB 的图片不压缩，直接上传

## ⚙️ 配置说明

### 首次使用

1. 在 Gitee → 设置 → 私人令牌 中生成令牌（需要 `projects` 权限）
2. 准备一个 Gitee 仓库（公开或私有均可）
3. 打开应用，点击右上角 ⚙️ 进入配置弹窗
4. 填写私人令牌和仓库地址（如 `https://gitee.com/yourname/yourrepo.git`）
5. 点击「验证连接」确认配置正确
6. 点击「保存配置」即可开始使用

### 配置存储

| 存储位置 | 键名 | 内容 |
|----------|------|------|
| localStorage | `gitee_token` | Gitee 私人令牌 |
| localStorage | `gitee_repo_url` | 仓库地址（HTTPS 格式） |

仓库地址解析规则：自动从 URL 中提取 `owner` 和 `repo`，支持以下格式：
- `https://gitee.com/owner/repo.git`
- `https://gitee.com/owner/repo`
- `https://gitee.com/owner/repo.git#branch`

## 🔌 Gitee API 调用

应用通过 `GiteeClient` 类（`js/gitee.js`）封装所有 API 操作：

| 方法 | HTTP | 路径 | 用途 |
|------|------|------|------|
| `getFile(path)` | GET | `/repos/{owner}/{repo}/contents/{path}` | 获取文件内容和 SHA |
| `createFile(path, content, message, isRawBase64)` | POST | `/repos/{owner}/{repo}/contents/{path}` | 创建新文件 |
| `updateFile(path, content, sha, message)` | PUT | `/repos/{owner}/{repo}/contents/{path}` | 更新已有文件 |
| `deleteFile(path, sha, message)` | DELETE | `/repos/{owner}/{repo}/contents/{path}` | 删除文件 |
| `getRawUrl(path)` | — | — | 生成图片 raw 访问链接 |

### API 注意事项

- 文件内容统一使用 Base64 编码传输（文本走 `encodeBase64`，图片走 `cleanBase64`）
- Gitee API 对不存在的文件路径返回 `200 + []`（空数组）而非 `404`，代码中已做 `Array.isArray` 判断
- 所有 API 调用附带 `console.log` 调试日志（令牌已脱敏），可通过浏览器控制台查看
- Gitee API 单文件大小限制约 1MB，图片压缩阈值已设为 500KB 以确保安全

## 🚀 使用流程

```
打开应用
  │
  ├─ 首次使用 → 配置弹窗 → 填写令牌+仓库地址 → 验证连接 → 保存
  │
  ├─ 卡片列表 → 展示所有卡片
  │    ├─ 查看详情 → 弹窗展示单词表格 + 图片
  │    ├─ 编辑卡片 → 修改标题/单词/图片 → 保存
  │    └─ 删除卡片 → 确认后删除
  │
  └─ 新增卡片
       ├─ 填写标题
       ├─ 批量导入（可选）→ 粘贴 JSON 数组 → 解析填充
       ├─ 手动添加单词（可选）→ 逐行输入英文/音标/中文
       ├─ 上传图片（可选）→ 自动压缩 → 上传到 images/
       └─ 保存 → 写入 data/words.json → 刷新列表
```

## 📝 更新日志

### 2026-07-03

- **[优化]** 详情页视觉升级：背景图磨砂模糊 + 卡片磨砂玻璃效果(backdrop-filter) + folder渐变背景
- **[新增]** 详情页 folder 图片展示区：左侧缩略图(130×130圆角) + 右侧标题文字，无图时居中显示
- **[新增]** 详情页全屏复刻参考设计：2列单词卡片网格 + 底部紫色标题区，标题按 `|` 和 `的` 拆分展示
- **[新增]** 详情页朗读功能：点击标题区开始逐词朗读，每个单词男声(Alex)读一遍→停500ms→女声(Samantha)再读一遍→停500ms
- **[新增]** 朗读高亮：当前朗读的卡片背景变紫色，文字变白色
- **[新增]** 朗读完成自动切换3列布局（over_content 状态）
- **[新增]** voice.js 语音工具模块
- **[新增]** 卡片列表标题下方展示所有单词（英文 + 中文对照）
- **[新增]** 批量导入功能：粘贴 JSON 数组自动解析为单词列表
- **[修复]** 列表加载失败：Gitee API 对不存在文件返回空数组 `[]` 而非 404，增加 `Array.isArray` 判断
- **[修复]** 图片上传失败：压缩阈值从 800KB 降至 500KB，避免 base64 编码后超过 Gitee 1MB 限制
- **[修复]** 数据保存失败：`saveCard`/`deleteCard` 改为保存前重新获取最新 SHA，避免图片上传导致的 SHA 不一致
- **[优化]** 所有 API 调用增加 `console.log` 调试日志（令牌脱敏）
- **[优化]** 错误处理改为读取完整 response body，显示 HTTP 状态码 + 完整错误信息
