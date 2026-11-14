---
title: "中英混排的秩序：构建面向长文阅读的 Web 字体系统与 CSS 网格"
description: "深入探討現代無襯線體（Manrope / 思源黑體）與書籍襯線體（Source Serif 4 / 思源宋體）在同一頁面中的視覺字重平衡、基線對齊與響應式流體排版。"
category: "技术札记"
reading_time: "9 分钟"
tags: [Typography, CSS, 设计系统, 排版]
---

在纯英文或纯中文的出版物中，建立清晰的排版层级已经有一套成熟的规范。但当我们在 Web 端同时处理中文方块字与拉丁字母，并且进一步引入**“无衬线（Sans-serif）与衬线（Serif）混排”**时，细微的光学偏差就会被迅速放大。

本文记录了我在构建本站排版系统时的核心实验与工程落地细节。

## 一、为什么要在同一段落中混用无衬线与衬线？

在传统的界面设计中，一条常见的教条是“标题用无衬线，正文用衬线”或反之。但在当代编辑式网页设计（Editorial Web Design）中，将两者置于同一连续段落中，可以创造出极具张力的节奏感：

- **前半句（无衬线粗体）**：承担视觉锚点的作用，清晰、直接、富有现代感，第一时间抓住视线；
- **后半句（书籍衬线常规体）**：自然承接前半句的语气，将阅读节奏放缓，引导读者进入沉静的思考语境。

> 排版的本质不是装饰文字，而是用空间与字形的对比，调节读者在字里行间的呼吸速率。

## 二、光学字号与字重匹配（Optical Sizing & Weight Balance）

同样声明为 `font-size: 48px` 时，汉字因为字面率（Ideographic Character Face）接近正方形，在视觉上往往比小写拉丁字母显得更饱满；而衬线体的横画极细，在屏幕抗锯齿渲染下又比同字重的无衬线体显得更轻。

| 维度 | 无衬线系统 (UI / 宣言前半) | 衬线系统 (文章标题 / 长文正文) | 混排校准策略 |
| :--- | :--- | :--- | :--- |
| **西文字体** | `Manrope` | `Source Serif 4` | 开启 `font-optical-sizing: auto` |
| **中文字体** | `Noto Sans SC` | `Noto Serif SC` | 衬线字重提升半档（`400 → 450/500`） |
| **字距控制** | `-0.015em`（紧凑现代） | `-0.005em`（舒展自然） | 中文避免超过 `-0.02em` 的负字距 |
| **长文行高** | `1.55` | `1.82 – 1.86` | 匹配 `680px–740px` 最佳阅读行宽 |

## 三、流体排版与 CSS 变量实现

为了在 `390px` 的手机屏幕到 `1440px` 以上的桌面显示器之间获得平滑过渡，我们使用 `clamp()` 定义类型标尺，并彻底告别生硬的断点跳变：

```css
:root {
  --font-sans: "Manrope", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  --font-serif: "Source Serif 4", "Noto Serif SC", "Songti SC", Georgia, serif;

  /* 首屏宣言：移动端约 29px，桌面端平滑扩展至 52px */
  --step-manifesto: clamp(1.82rem, 2.9vw + 0.72rem, 3.25rem);
  --step-prose: clamp(1.0625rem, 0.25vw + 1rem, 1.15rem);
}

.manifesto-paragraph {
  font-size: var(--step-manifesto);
  line-height: 1.28;
  letter-spacing: -0.015em;
  text-wrap: pretty;
}
```

通过 `text-wrap: pretty` 与精心控制的容器最大宽度，段落能够在不同视口下保持匀称的右边缘，避免末尾出现孤立的单字。
