---
title: "Margin Note Indexer：用 TypeScript AST 将本地读书笔记编译为概念图谱"
description: "如何用不到 400 行代码解析散落在数百个 Markdown 文件中的行内批注，自动生成静态双向链接与主题索引页。"
category: "个人项目"
reading_time: "7 分钟"
tags: [TypeScript, AST, 知识工具, 开源]
---

在阅读技术专著与人文社科书籍时，我习惯在本地 Markdown 文件中随手记下带有 `[[概念名]]` 的行内批注。随着笔记数量超过两百篇，如何不依赖笨重的图形化软件，快速检索某个概念在不同书籍中的交叉印证，成了一个有趣的工程问题。

为此，我用周末时间编写了一个轻量的命令行工具：**Margin Note Indexer**。

## 一、核心设计思路：把笔记当作源代码来编译

大多数知识库软件使用关系型数据库在运行时动态查询链接，而我们采取了编译器前端的思路——**将整座笔记仓库视为一棵抽象语法树（AST），在构建阶段一次性静态分析出所有引用边**。

```typescript
export interface ConceptNode {
  id: string;
  label: string;
  occurrences: Array<{
    file: string;
    line: number;
    contextSnippet: string;
  }>;
  relatedConcepts: string[];
}

export function extractWikiLinks(markdown: string, filePath: string): ConceptNode[] {
  const pattern = /\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g;
  const nodes = new Map<string, ConceptNode>();

  const lines = markdown.split("\n");
  lines.forEach((lineText, idx) => {
    for (const match of lineText.matchAll(pattern)) {
      const key = match[1].trim();
      const existing = nodes.get(key) ?? {
        id: key.toLowerCase().replace(/\s+/g, "-"),
        label: match[2]?.trim() || key,
        occurrences: [],
        relatedConcepts: [],
      };
      existing.occurrences.push({
        file: filePath,
        line: idx + 1,
        contextSnippet: lineText.trim(),
      });
      nodes.set(key, existing);
    }
  });

  return Array.from(nodes.values());
}
```

## 二、为什么静态索引足够好？

对于个人规模的知识库（数千篇 Markdown 文档），全量 AST 扫描耗时不到 `120ms`。生成的静态 JSON 索引可以直接嵌入博客前端，在浏览器端实现零延迟的概念跳转与上下文预览。
