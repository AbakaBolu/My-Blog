# Abaka Bolu · 个人博客 (Chronicle Press)

参考现代研究机构与纸质出版物美学设计的个人博客系统。专为 **GitHub Pages (Jekyll)** 打造，同时内置**零依赖 Node.js 本地预览引擎**（无需在电脑上安装 Ruby 即可一键本地启动预览）。

---

## 一、快速启动与本地预览

你的电脑已安装 Node.js，无需安装任何第三方依赖包，直接在 `D:\My Blog` 目录下打开终端运行：

```powershell
node scripts/preview.mjs --serve
```

然后在浏览器访问：**http://localhost:4000/**

- 首页：`http://localhost:4000/`
- 全部文章（含分类筛选与即时搜索）：`http://localhost:4000/blog/`
- 专题导览：`http://localhost:4000/topics/`
- 个人项目：`http://localhost:4000/projects/`
- 关于作者：`http://localhost:4000/about/`

---

## 二、部署到 GitHub Pages

1. 打开 **GitHub Desktop**，确认当前仓库为 `My-Blog`（对应 `D:\My Blog`）。
2. 在左侧查看修改的文件，在左下角填写提交说明（例如 `feat: editorial redesign`），点击 **Commit to main**。
3. 点击右上角 **Push origin**（或 **Publish repository**）。
4. 打开 GitHub 网页端仓库 `https://github.com/AbakaBolu/My-Blog` → **Settings** → **Pages**：
   - **Source** 选择 `Deploy from a branch`
   - **Branch** 选择 `main` 与 `/ (root)`，点击 **Save**。
5. 等待 1–2 分钟构建完成后，即可访问：  
   `https://abakabolu.github.io/My-Blog/`

> **提示**：如果你将来把 GitHub 仓库改名为 `AbakaBolu.github.io`，只需将 `_config.yml` 中的 `baseurl: "/My-Blog"` 改为 `baseurl: ""`，网站就会直接发布在根域名 `https://abakabolu.github.io/`。

---

## 三、如何替换为你自己的内容

| 想要修改的内容 | 对应文件或目录 | 说明 |
| :--- | :--- | :--- |
| **站点名称、个人标志、宣言、社交链接** | [`_config.yml`](./_config.yml) | 集中管理全站元数据、首页宣言、精选长文、四大专题与项目列表 |
| **新增或修改博客文章** | [`_posts/`](./_posts/) | 文件名格式为 `YYYY-MM-DD-slug.md`，支持完整 Markdown 与代码高亮 |
| **修改个人详细介绍** | [`about.md`](./about.md) | 独立关于页内容 |
| **调整颜色、字体、间距与动效参数** | [`assets/css/style.css`](./assets/css/style.css) | 顶部 `:root` 定义了全部色彩、字体与流体间距变量 |
| **四大专题插画与主视觉** | [`_includes/topic-art.html`](./_includes/topic-art.html) | 原创矢量插画组件，无外部破图风险 |

### 文章 Front Matter 模板

在 `_posts/` 下新建 `.md` 文件时，在文件开头写入：

```yaml
---
title: "文章标题"
description: "一到两句话的文章导语，会显示在首页卡片与文章页开头。"
category: "技术札记" # 可选：技术札记 | 阅读笔记 | 生活观察 | 个人项目
reading_time: "6 分钟"
tags: [标签1, 标签2]
---

这里开始写 Markdown 正文……
```
