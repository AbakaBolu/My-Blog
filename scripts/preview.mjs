/**
 * Zero-dependency Local Jekyll Compiler & Preview Server for Windows / macOS / Linux
 * 用途：无需在本地安装 Ruby 环境，即可直接用 Node.js 完整编译并预览本 Jekyll 博客
 * 启动命令：node scripts/preview.mjs --serve
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = process.env.SITE_OUT_DIR || path.join(ROOT, "_site");

// 1. 读取站点配置（与 _config.yml 保持同步）
const site = {
  title: "Abaka Bolu",
  short_mark: "AB\\",
  subtitle: "理性思考 · 长期写作 · 造物笔记",
  author: "Abaka Bolu",
  description: "在这里，记录技术，也记录生活。用持续的阅读、写作与实践，理解正在变化的世界。",
  lang: "zh-CN",
  url: "https://abakabolu.github.io",
  baseurl: "",
  time: new Date().toISOString(),
  manifesto: {
    sans_lead: "在这里，记录技术，也记录生活。",
    serif_body: "用持续的阅读、写作与实践，理解正在变化的世界。",
  },
  featured_hero: {
    eyebrow: "精选长文 · Featured Essay",
    title_line_1: "在不确定的世界里，",
    title_line_2: "保持好奇",
    summary:
      "当工具与信息以指数级速度迭代，真正稀缺的不再是答案本身，而是提出好问题的耐心、跨学科的直觉，以及慢下来构建系统的定力。",
    post_url: "/2026/11/stay-curious-in-an-uncertain-world/",
    primary_cta: "阅读全文",
    secondary_cta: "浏览专题",
    secondary_url: "/topics/",
  },
  topics: [
    {
      slug: "tech",
      name: "技术札记",
      en_name: "Systems & Craft",
      art: "architecture",
      description: "软件架构、类型系统、编译器原理与现代前端工程的深度复盘。",
    },
    {
      slug: "reading",
      name: "阅读笔记",
      en_name: "Reading & Ideas",
      art: "compass",
      description: "科学史、认知科学、技术哲学与经典非虚构作品的读书札记。",
    },
    {
      slug: "life",
      name: "生活观察",
      en_name: "Field Notes",
      art: "nautilus",
      description: "城市漫步、器物审美、日常秩序与慢节奏生活的切片记录。",
    },
    {
      slug: "projects",
      name: "个人项目",
      en_name: "Independent Works",
      art: "mosaic",
      description: "开源小工具、数字花园实验、排版研究与独立产品的构建日志。",
    },
  ],
  projects_list: [
    {
      title: "Chronicle Press",
      category: "排版工具",
      year: "2026",
      summary: "面向中英混排长文写作的极简静态出版主题，探索纸本阅读感在屏幕端的还原。",
      tech: ["Jekyll", "CSS Grid", "Typography"],
      link: "https://github.com/AbakaBolu/My-Blog",
    },
    {
      title: "Margin Note Indexer",
      category: "知识工具",
      year: "2026",
      summary: "将本地 Markdown 读书批注自动构建为双向链接图谱与概念索引的命令行工具。",
      tech: ["TypeScript", "AST", "CLI"],
      link: "https://github.com/AbakaBolu",
    },
    {
      title: "Quiet RSS Reader",
      category: "桌面应用",
      year: "2025",
      summary: "无算法推荐、无未读红点焦虑的安静型 RSS 阅读器，支持全文衬线排版与离线归档。",
      tech: ["Rust", "Tauri", "SQLite"],
      link: "https://github.com/AbakaBolu",
    },
    {
      title: "Grid & Paper Specimen",
      category: "设计研究",
      year: "2025",
      summary: "瑞士网格系统与中文古典版心比例的交互式对照实验集。",
      tech: ["SVG", "Canvas", "Editorial"],
      link: "https://github.com/AbakaBolu",
    },
  ],
  social: {
    github: "AbakaBolu",
    email: "hello@abakabolu.dev",
    location: "中国 · 独立写作者与工程师",
  },
  posts: [],
};

// 2. 轻量 Front Matter 与 Markdown 渲染器
function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const yamlLines = match[1].split(/\r?\n/);
  const data = {};
  for (const line of yamlLines) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { data, body: match[2] };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function renderMarkdown(md) {
  const blocks = [];
  // 提取代码块
  const withoutCode = md.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = blocks.length;
    blocks.push(
      `<div class="highlighter-rouge"><pre class="highlight"><code class="language-${lang || "text"}">${escapeHtml(
        code.replace(/\s+$/, "")
      )}</code></pre></div>`
    );
    return `\n@@CODE_BLOCK_${idx}@@\n`;
  });

  const lines = withoutCode.split(/\r?\n/);
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const codeMatch = line.trim().match(/^@@CODE_BLOCK_(\d+)@@$/);
    if (codeMatch) {
      out.push(blocks[Number(codeMatch[1])]);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push("<hr>");
      i++;
      continue;
    }

    const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      out.push(`<h${level}>${formatInline(hMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${formatInline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    // 表格
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\|\s*[:\-]+/.test(lines[i + 1].trim())) {
      const parseRow = (r) =>
        r
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => formatInline(c.trim()));
      const headers = parseRow(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      out.push(
        `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`
      );
      continue;
    }

    // 无序列表
    if (/^[-*]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${formatInline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${formatInline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // 普通段落
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("|") &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^@@CODE_BLOCK_\d+@@$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${formatInline(paraLines.join(" "))}</p>`);
  }

  return out.join("\n");
}

// 3. 加载全部 _posts 文章
function loadPosts() {
  const postsDir = path.join(ROOT, "_posts");
  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  const posts = files.map((filename) => {
    const m = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/);
    const [_, year, month, day, slug] = m;
    const raw = fs.readFileSync(path.join(postsDir, filename), "utf8");
    const { data, body } = parseFrontMatter(raw);
    const htmlContent = renderMarkdown(body);
    const plain = htmlContent.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return {
      ...data,
      title: data.title || slug,
      description: data.description || plain.slice(0, 110),
      category: data.category || "随笔",
      reading_time: data.reading_time || `${Math.max(3, Math.round(plain.length / 320))} 分钟`,
      tags: Array.isArray(data.tags) ? data.tags : [],
      date: `${year}-${month}-${day}T10:00:00+08:00`,
      year,
      month,
      day,
      slug,
      url: `/${year}/${month}/${slug}/`,
      content: htmlContent,
      excerpt: plain.slice(0, 140),
    };
  });

  for (let idx = 0; idx < posts.length; idx++) {
    posts[idx].next = idx > 0 ? posts[idx - 1] : null;
    posts[idx].previous = idx < posts.length - 1 ? posts[idx + 1] : null;
  }

  site.posts = posts;
}

// 4. 渲染组件与页面
function renderTopicArt(type) {
  const tpl = fs.readFileSync(path.join(ROOT, "_includes", "topic-art.html"), "utf8");
  if (type === "architecture") {
    return tpl.split('{% if art_type == "architecture" %}')[1].split('{% elsif art_type == "compass" %}')[0];
  }
  if (type === "compass") {
    let block = tpl.split('{% elsif art_type == "compass" %}')[1].split('{% elsif art_type == "nautilus" %}')[0];
    // 展开罗盘刻度与星芒循环
    let ticks = "";
    for (let i = 0; i <= 35; i++) {
      ticks += `<g transform="rotate(${i * 10})"><line x1="0" y1="-160" x2="0" y2="-148" stroke-width="1"/><line x1="0" y1="-138" x2="0" y2="-130" stroke-width="0.75"/></g>`;
    }
    let mainStars = "";
    for (let j = 0; j <= 7; j++) {
      mainStars += `<g transform="rotate(${j * 45})"><polygon points="0,-134 14,-26 0,-18" fill="#191816"/><polygon points="0,-134 -14,-26 0,-18" fill="#FAF6EC" stroke="#191816" stroke-width="1"/></g>`;
    }
    let subStars = "";
    for (let k = 0; k <= 7; k++) {
      subStars += `<g transform="rotate(${k * 45 + 22.5})"><polygon points="0,-106 8,-26 0,-18" fill="#191816" opacity="0.82"/><polygon points="0,-106 -8,-26 0,-18" fill="none" stroke="#191816" stroke-width="0.8"/></g>`;
    }
    block = block
      .replace(/\{% for i in \(0\.\.35\) %\}[\s\S]*?\{% endfor %\}/, ticks)
      .replace(/\{% for j in \(0\.\.7\) %\}[\s\S]*?\{% endfor %\}/, mainStars)
      .replace(/\{% for k in \(0\.\.7\) %\}[\s\S]*?\{% endfor %\}/, subStars);
    return block;
  }
  if (type === "nautilus") {
    let block = tpl.split('{% elsif art_type == "nautilus" %}')[1].split("{% else %}")[0];
    let chambers = "";
    for (let c = 0; c <= 17; c++) {
      const angle = c * 22;
      const scale = (c * 0.085 + 0.22).toFixed(3);
      chambers += `<g transform="rotate(${angle}) scale(${scale})"><path d="M 0,0 Q 42,-28 72,-82" fill="none" stroke="#F5F3EB" stroke-width="1.6" opacity="0.62"/><ellipse cx="38" cy="-38" rx="28" ry="16" fill="none" stroke="#F5F3EB" stroke-width="0.9" opacity="0.35" transform="rotate(-35 38 -38)"/></g>`;
    }
    block = block.replace(/\{% for c in \(0\.\.17\) %\}[\s\S]*?\{% endfor %\}/, chambers);
    return block;
  }
  return tpl.split("{% else %}")[1].split("{% endif %}")[0];
}

function formatDateCN(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}年${m}月${d}日`;
}

function renderPostCard(p) {
  const tagsHtml = (p.tags || [])
    .slice(0, 2)
    .map(
      (t) =>
        `<a href="/blog/?q=${encodeURIComponent(t)}" class="spec-tag-link">${escapeHtml(
          t
        )} <span class="spec-arrow">→</span></a>`
    )
    .join("");
  return `
<article class="post-card reveal-item" data-category="${escapeHtml(p.category)}">
  <div class="card-top">
    <div class="card-meta-row">
      <span class="dots-pill" aria-hidden="true">•••</span>
      <span class="card-category">${escapeHtml(p.category)}</span>
      <time class="card-date" datetime="${p.date}">${formatDateCN(p.date)}</time>
    </div>
    <h3 class="card-title">
      <a href="${p.url}">${escapeHtml(p.title)}</a>
    </h3>
    <p class="card-excerpt">${escapeHtml(p.description)}</p>
  </div>
  <div class="card-bottom">
    <div class="card-spec-row">
      <span class="spec-label">阅读时长</span>
      <span class="spec-value">约 ${escapeHtml(p.reading_time)}</span>
    </div>
    <div class="card-spec-row">
      <span class="spec-label">核心标签</span>
      <span class="spec-value spec-tags">${tagsHtml}</span>
    </div>
    <a class="card-read-btn" href="${p.url}">
      <span>阅读全文</span>
      <span class="arrow-shift" aria-hidden="true">→</span>
    </a>
  </div>
</article>`;
}

function renderShell({ title, description, url, bodyHtml }) {
  const pageTitle = title ? `${title} · ${site.title}` : `${site.title} — ${site.subtitle}`;
  const pageDesc = description || site.description;

  const topicsDropdown = site.topics
    .map(
      (t) => `
    <a class="dropdown-item" role="menuitem" href="/blog/?category=${encodeURIComponent(t.name)}">
      <span class="dropdown-item-title">${t.name}</span>
      <span class="dropdown-item-sub">${t.en_name}</span>
    </a>`
    )
    .join("");

  const projectsDropdown = site.projects_list
    .slice(0, 3)
    .map(
      (proj) => `
    <a class="dropdown-item" role="menuitem" href="/projects/">
      <span class="dropdown-item-title">${proj.title}</span>
      <span class="dropdown-item-sub">${proj.category} · ${proj.year}</span>
    </a>`
    )
    .join("");

  const postsJson = JSON.stringify(
    site.posts.map((p) => ({
      title: p.title,
      url: p.url,
      date: formatDateCN(p.date),
      dateIso: p.date.slice(0, 10),
      category: p.category,
      readingTime: p.reading_time,
      tags: p.tags,
      description: p.description,
    }))
  );

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <script>document.documentElement.classList.add('js');</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
</head>
<body>
  <a class="skip-link" href="#main-content">跳至正文内容</a>
  <header class="site-header" id="site-header">
    <div class="content-shell header-bar">
      <nav class="nav-group nav-left" aria-label="主导航左侧">
        <a class="nav-pill ${url === "/blog/" ? "is-active" : ""}" href="/blog/"><span>文章</span></a>
        <div class="nav-dropdown" data-dropdown>
          <button class="nav-pill nav-dropdown-trigger ${url === "/topics/" ? "is-active" : ""}" type="button" aria-expanded="false" aria-haspopup="true" data-dropdown-btn>
            <span>专题</span>
            <svg class="icon-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="dropdown-panel" role="menu" data-dropdown-menu>
            <div class="dropdown-header">专题索引 · Curated Topics</div>
            ${topicsDropdown}
            <div class="dropdown-Divider"></div>
            <a class="dropdown-footer-link" role="menuitem" href="/topics/">
              <span>浏览全部专题导览</span>
              <span class="arrow-shift">→</span>
            </a>
          </div>
        </div>
        <div class="nav-dropdown" data-dropdown>
          <button class="nav-pill nav-dropdown-trigger ${url === "/projects/" ? "is-active" : ""}" type="button" aria-expanded="false" aria-haspopup="true" data-dropdown-btn>
            <span>项目</span>
            <svg class="icon-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="dropdown-panel" role="menu" data-dropdown-menu>
            <div class="dropdown-header">个人造物 · Independent Works</div>
            ${projectsDropdown}
            <div class="dropdown-Divider"></div>
            <a class="dropdown-footer-link" role="menuitem" href="/projects/">
              <span>查看全部项目与实验</span>
              <span class="arrow-shift">→</span>
            </a>
          </div>
        </div>
      </nav>

      <a class="brand-center" href="/" aria-label="${site.title} 首页">
        <span class="brand-full" aria-hidden="false">ABAKA<span class="brand-slash">\\</span>BOLU</span>
        <span class="brand-compact" aria-hidden="true">A<span class="brand-slash">\\</span>B</span>
      </a>

      <div class="nav-group nav-right">
        <a class="nav-pill nav-desktop-only ${url === "/about/" ? "is-active" : ""}" href="/about/"><span>关于</span></a>
        <div class="nav-dropdown nav-desktop-only" data-dropdown>
          <button class="nav-pill nav-dropdown-trigger" type="button" aria-expanded="false" aria-haspopup="true" data-dropdown-btn>
            <span>订阅</span>
            <svg class="icon-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="dropdown-panel dropdown-panel-right" role="menu" data-dropdown-menu>
            <div class="dropdown-header">保持联系 · Stay Connected</div>
            <a class="dropdown-item" role="menuitem" href="/feed.xml">
              <span class="dropdown-item-title">RSS 订阅源</span>
              <span class="dropdown-item-sub">/feed.xml · 全文输出</span>
            </a>
            <a class="dropdown-item" role="menuitem" href="https://github.com/${site.social.github}" target="_blank" rel="noopener">
              <span class="dropdown-item-title">GitHub (@${site.social.github})</span>
              <span class="dropdown-item-sub">开源代码与写作仓库</span>
            </a>
            <a class="dropdown-item" role="menuitem" href="mailto:${site.social.email}">
              <span class="dropdown-item-title">发送邮件</span>
              <span class="dropdown-item-sub">${site.social.email}</span>
            </a>
          </div>
        </div>

        <button class="icon-btn" type="button" id="search-open-btn" aria-label="搜索文章 (快捷键 /)" title="搜索文章 (快捷键 /)">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="7.8" cy="7.8" r="5.3"/>
            <path d="M11.8 11.8L15.5 15.5"/>
          </svg>
        </button>

        <button class="icon-btn menu-toggle-btn" type="button" id="menu-open-btn" aria-label="展开导航菜单" aria-expanded="false" aria-controls="menu-drawer">
          <svg class="icon-menu-bars" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            <path d="M2.5 5.2h13M2.5 9h13M2.5 12.8h9"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="menu-drawer" id="menu-drawer" hidden aria-hidden="true">
      <div class="content-shell menu-drawer-inner">
        <div class="menu-grid">
          <div class="menu-col">
            <p class="menu-col-label">导航 · Navigation</p>
            <ul class="menu-list">
              <li><a href="/">首页 <span class="menu-en">Home</span></a></li>
              <li><a href="/blog/">全部文章 <span class="menu-en">All Essays (${site.posts.length})</span></a></li>
              <li><a href="/topics/">专题导览 <span class="menu-en">Topics</span></a></li>
              <li><a href="/projects/">个人项目 <span class="menu-en">Projects</span></a></li>
              <li><a href="/about/">关于作者 <span class="menu-en">About</span></a></li>
            </ul>
          </div>
          <div class="menu-col">
            <p class="menu-col-label">四大专题 · Curated Series</p>
            <ul class="menu-list">
              ${site.topics
                .map(
                  (t) =>
                    `<li><a href="/blog/?category=${encodeURIComponent(t.name)}">${t.name} <span class="menu-en">${
                      t.en_name
                    }</span></a></li>`
                )
                .join("")}
            </ul>
          </div>
          <div class="menu-col">
            <p class="menu-col-label">最新文章 · Recent Writing</p>
            <ul class="menu-list menu-list-compact">
              ${site.posts
                .slice(0, 3)
                .map(
                  (p) =>
                    `<li><a href="${p.url}"><span class="menu-post-title">${escapeHtml(
                      p.title
                    )}</span><time class="menu-post-date">${p.date.slice(0, 10).replace(/-/g, ".")}</time></a></li>`
                )
                .join("")}
            </ul>
          </div>
        </div>
        <div class="menu-drawer-foot">
          <span>${site.title} · ${site.subtitle}</span>
          <div class="menu-foot-links">
            <a href="https://github.com/${site.social.github}" target="_blank" rel="noopener">GitHub ↗</a>
            <a href="mailto:${site.social.email}">Email ↗</a>
            <a href="/feed.xml">RSS ↗</a>
          </div>
        </div>
      </div>
    </div>
  </header>

  <div class="search-modal" id="search-modal" role="dialog" aria-modal="true" aria-labelledby="search-modal-title" hidden>
    <div class="search-backdrop" data-search-close></div>
    <div class="search-dialog">
      <div class="search-input-bar">
        <svg class="search-input-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <circle cx="7.8" cy="7.8" r="5.3"/>
          <path d="M11.8 11.8L15.5 15.5"/>
        </svg>
        <input type="search" id="global-search-input" class="search-input" placeholder="搜索文章标题、摘要、分类或标签…" autocomplete="off" aria-label="搜索文章">
        <button class="search-close-btn" type="button" data-search-close aria-label="关闭搜索">ESC</button>
      </div>
      <div class="search-Quick-tags">
        <span class="search-tag-label">快速筛选：</span>
        ${site.topics
          .map((t) => `<button type="button" class="search-chip" data-search-quick="${t.name}">${t.name}</button>`)
          .join("")}
      </div>
      <div class="search-results" id="global-search-results" role="region" aria-live="polite"></div>
    </div>
  </div>

  <script id="site-posts-data" type="application/json">${postsJson}</script>

  <main class="site-main" id="main-content">
    ${bodyHtml}
  </main>

  <footer class="site-footer">
    <div class="content-shell">
      <div class="footer-rule"></div>
      <div class="footer-grid">
        <div class="footer-brand-col">
          <a class="footer-wordmark" href="/">ABAKA<span class="brand-slash">\\</span>BOLU</a>
          <p class="footer-bio">${site.description}</p>
          <p class="footer-location">${site.social.location}</p>
        </div>
        <div class="footer-nav-col">
          <h4 class="footer-heading">栏目 · Sections</h4>
          <ul class="footer-links">
            <li><a href="/">首页</a></li>
            <li><a href="/blog/">全部文章</a></li>
            <li><a href="/topics/">专题导览</a></li>
            <li><a href="/projects/">个人项目</a></li>
            <li><a href="/about/">关于作者</a></li>
          </ul>
        </div>
        <div class="footer-nav-col">
          <h4 class="footer-heading">专题 · Topics</h4>
          <ul class="footer-links">
            ${site.topics
              .map((t) => `<li><a href="/blog/?category=${encodeURIComponent(t.name)}">${t.name}</a></li>`)
              .join("")}
          </ul>
        </div>
        <div class="footer-nav-col">
          <h4 class="footer-heading">连接 · Connect</h4>
          <ul class="footer-links">
            <li><a href="mailto:${site.social.email}"><span>Email</span><span class="footer-ext">${site.social.email}</span></a></li>
            <li><a href="https://github.com/${site.social.github}" target="_blank" rel="noopener"><span>GitHub</span><span class="footer-ext">@${site.social.github} ↗</span></a></li>
            <li><a href="/feed.xml"><span>RSS 订阅</span><span class="footer-ext">feed.xml ↗</span></a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 ${site.author}. 保留所有权利。</span>
        <span>以温暖纸感与编辑式排版构建 · 托管于 GitHub Pages</span>
      </div>
    </div>
  </footer>
  <script src="/assets/js/main.js" defer></script>
</body>
</html>`;
}

function buildSite() {
  loadPosts();
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 复制静态资源
  fs.cpSync(path.join(ROOT, "assets"), path.join(OUT_DIR, "assets"), { recursive: true });

  // 1. 首页 (/)
  const homeRecentCards = site.posts.slice(0, 3).map(renderPostCard).join("\n");
  const homeMoreChips = site.posts
    .slice(3, 6)
    .map(
      (p) =>
        `<a class="inline-post-chip" href="${p.url}"><span>${escapeHtml(
          p.title.length > 20 ? p.title.slice(0, 20) + "…" : p.title
        )}</span><span class="arrow-shift">→</span></a>`
    )
    .join("");
  const homeTopicsCards = site.topics
    .map((topic) => {
      const count = site.posts.filter((p) => p.category === topic.name).length;
      return `
      <a class="topic-card reveal-item" href="/blog/?category=${encodeURIComponent(topic.name)}">
        <div class="topic-card-head">
          <span class="dots-pill" aria-hidden="true">•••</span>
          <span class="topic-head-label">${topic.name}</span>
        </div>
        <div class="topic-art-frame">
          ${renderTopicArt(topic.art)}
        </div>
        <div class="topic-card-body">
          <div class="topic-title-row">
            <h3 class="topic-title">${topic.name}</h3>
            <span class="topic-count">${count} 篇 <span class="arrow-shift">→</span></span>
          </div>
          <p class="topic-desc">${topic.description}</p>
        </div>
      </a>`;
    })
    .join("\n");

  const homeBody = `
<section class="manifesto-section content-shell" aria-label="站点宣言">
  <p class="manifesto-paragraph entry-fade entry-step-1">
    <span class="manifesto-sans">${site.manifesto.sans_lead}</span><span class="manifesto-serif">${site.manifesto.serif_body}</span>
  </p>
</section>

<section class="featured-hero-section content-shell entry-fade entry-step-2" aria-label="精选文章">
  <div class="hero-stage" id="hero-stage">
    <div class="hero-art-layer" id="hero-art-layer" aria-hidden="true">
      <svg class="hero-landscape-svg" viewBox="0 0 1440 820" preserveAspectRatio="xMidYMid slice" width="1440" height="820">
        <defs>
          <linearGradient id="sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#877C6C"/>
            <stop offset="46%" stop-color="#9A836B"/>
            <stop offset="76%" stop-color="#B78A62"/>
            <stop offset="100%" stop-color="#C69469"/>
          </linearGradient>
          <radialGradient id="horizon-glow" cx="50%" cy="68%" r="55%">
            <stop offset="0%" stop-color="#E4B07E" stop-opacity="0.52"/>
            <stop offset="60%" stop-color="#B6855D" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#877C6C" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="sea-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#2D526B"/>
            <stop offset="38%" stop-color="#22435B"/>
            <stop offset="100%" stop-color="#162E40"/>
          </linearGradient>
        </defs>
        <rect width="1440" height="820" fill="url(#sky-grad)"/>
        <rect width="1440" height="820" fill="url(#horizon-glow)"/>
        <g class="hero-horizon-group">
          <path d="M -120,620 Q 720,445 1560,620 L 1560,860 L -120,860 Z" fill="#8C745E" opacity="0.45"/>
          <path d="M -120,628 Q 720,454 1560,628 L 1560,860 L -120,860 Z" fill="url(#sea-grad)"/>
          <g fill="none" stroke="#6B92AC" stroke-width="1" opacity="0.22" class="hero-wave-lines">
            <path d="M -80,652 Q 720,482 1520,652"/>
            <path d="M -80,678 Q 720,512 1520,678"/>
            <path d="M -80,708 Q 720,546 1520,708"/>
            <path d="M -80,742 Q 720,584 1520,742"/>
            <path d="M -80,780 Q 720,628 1520,780"/>
            <path d="M -80,822 Q 720,676 1520,822"/>
          </g>
        </g>
      </svg>
    </div>
    <div class="hero-overlay-content">
      <h1 class="hero-display-title">
        <span class="hero-line-1">${site.featured_hero.title_line_1}</span>
        <span class="hero-line-2">${site.featured_hero.title_line_2}</span>
      </h1>
      <p class="hero-display-summary">${site.featured_hero.summary}</p>
      <div class="hero-cta-group">
        <a class="hero-btn hero-btn-light" href="${site.featured_hero.post_url}"><span>${site.featured_hero.primary_cta}</span></a>
        <a class="hero-btn hero-btn-dark" href="${site.featured_hero.secondary_url}"><span>${site.featured_hero.secondary_cta}</span></a>
      </div>
    </div>
  </div>
</section>

<section class="recent-section content-shell entry-fade entry-step-3 reveal-section" aria-label="最近文章">
  <div class="recent-grid">
    ${homeRecentCards}
  </div>
  <div class="more-writing-bar reveal-item">
    <div class="more-writing-left">
      <span class="dots-pill" aria-hidden="true">•••</span>
      <span class="more-writing-label">更多近期文章</span>
      <span class="more-writing-count">共 ${site.posts.length} 篇归档</span>
    </div>
    <div class="more-writing-links">
      ${homeMoreChips}
      <a class="view-all-link" href="/blog/"><span>查看全部文章</span><span class="arrow-shift">→</span></a>
    </div>
  </div>
</section>

<section class="topics-section content-shell reveal-section" aria-label="专题入口">
  <div class="section-top-rule">
    <h2 class="section-kicker">探索专题</h2>
    <a class="section-more-link" href="/topics/"><span>全部专题与索引</span><span class="arrow-shift">→</span></a>
  </div>
  <div class="topics-grid">
    ${homeTopicsCards}
  </div>
</section>`;

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), renderShell({ title: "", description: site.description, url: "/", bodyHtml: homeBody }));

  // 2. 文章列表页 (/blog/)
  const blogBody = `
<section class="page-intro content-shell entry-fade entry-step-1">
  <div class="page-intro-top">
    <span class="dots-pill" aria-hidden="true">•••</span>
    <span class="page-eyebrow">写作归档 · Writing Index</span>
  </div>
  <h1 class="page-display-title">
    <span class="manifesto-sans">全部文章与札记。</span><span class="manifesto-serif">按专题检索，或输入关键词查找感兴趣的话题。</span>
  </h1>
  <div class="filter-toolbar" role="search" aria-label="文章筛选与搜索">
    <div class="filter-pills" id="category-filter-bar" role="tablist" aria-label="按专题分类筛选">
      <button type="button" class="filter-pill is-active" data-filter-cat="all" role="tab" aria-selected="true">
        <span>全部</span><span class="pill-count">${site.posts.length}</span>
      </button>
      ${site.topics
        .map((t) => {
          const cnt = site.posts.filter((p) => p.category === t.name).length;
          return `<button type="button" class="filter-pill" data-filter-cat="${t.name}" role="tab" aria-selected="false"><span>${t.name}</span><span class="pill-count">${cnt}</span></button>`;
        })
        .join("")}
    </div>
    <div class="inline-search-box">
      <svg class="inline-search-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <circle cx="7.8" cy="7.8" r="5.3"/><path d="M11.8 11.8L15.5 15.5"/>
      </svg>
      <input type="search" id="blog-filter-input" class="inline-search-input" placeholder="搜索标题、摘要或 #标签…" autocomplete="off" aria-label="在文章列表中搜索">
      <button type="button" class="inline-search-clear" id="blog-filter-clear" hidden aria-label="清除搜索条件">清除</button>
    </div>
  </div>
  <div class="filter-status-bar" id="filter-status-bar" aria-live="polite">
    <span id="filter-status-text">当前显示全部 ${site.posts.length} 篇文章</span>
  </div>
</section>
<section class="blog-index-section content-shell entry-fade entry-step-2">
  <div class="recent-grid" id="blog-cards-grid">
    ${site.posts.map(renderPostCard).join("\n")}
  </div>
  <div class="empty-filter-state" id="blog-empty-state" hidden>
    <p class="empty-state-title">没有找到匹配的文章</p>
    <p class="empty-state-sub">请尝试切换上方的专题分类，或清除搜索关键词。</p>
    <button type="button" class="hero-btn hero-btn-dark" id="reset-all-filters">重置全部筛选</button>
  </div>
</section>`;

  fs.mkdirSync(path.join(OUT_DIR, "blog"), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "blog", "index.html"), renderShell({ title: "全部文章", description: "按专题分类与关键词检索全部写作归档。", url: "/blog/", bodyHtml: blogBody }));

  // 3. 专题导览页 (/topics/)
  const topicsBody = `
<section class="page-intro content-shell entry-fade entry-step-1">
  <div class="page-intro-top">
    <span class="dots-pill" aria-hidden="true">•••</span>
    <span class="page-eyebrow">专题导览 · Curated Series</span>
  </div>
  <h1 class="page-display-title">
    <span class="manifesto-sans">四个长期关注的母题。</span><span class="manifesto-serif">把零散的经验与阅读编织成有脉络的知识图谱。</span>
  </h1>
</section>
<section class="topics-section content-shell entry-fade entry-step-2">
  <div class="topics-grid">
    ${homeTopicsCards}
  </div>
</section>
<section class="topics-detail-section content-shell">
  ${site.topics
    .map((topic) => {
      const tPosts = site.posts.filter((p) => p.category === topic.name);
      return `
      <div class="topic-detail-block reveal-section" id="topic-${topic.slug}">
        <div class="section-top-rule">
          <div>
            <span class="dots-pill" aria-hidden="true">•••</span>
            <span class="topic-en-badge">${topic.en_name}</span>
            <h2 class="topic-section-title">${topic.name}</h2>
            <p class="topic-section-sub">${topic.description}</p>
          </div>
          <a class="section-more-link" href="/blog/?category=${encodeURIComponent(topic.name)}">
            <span>在文章页筛选此专题</span><span class="arrow-shift">→</span>
          </a>
        </div>
        <div class="recent-grid">
          ${tPosts.map(renderPostCard).join("\n")}
        </div>
      </div>`;
    })
    .join("\n")}
</section>`;

  fs.mkdirSync(path.join(OUT_DIR, "topics"), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "topics", "index.html"), renderShell({ title: "专题导览", description: "按技术札记、阅读笔记、生活观察与个人项目四个维度组织的长期写作线索。", url: "/topics/", bodyHtml: topicsBody }));

  // 4. 个人项目页 (/projects/)
  const projectsBody = `
<section class="page-intro content-shell entry-fade entry-step-1">
  <div class="page-intro-top">
    <span class="dots-pill" aria-hidden="true">•••</span>
    <span class="page-eyebrow">独立造物 · Independent Works</span>
  </div>
  <h1 class="page-display-title">
    <span class="manifesto-sans">写代码是另一种写作。</span><span class="manifesto-serif">这里收录我维护的开源小工具、排版实验与独立软件。</span>
  </h1>
</section>
<section class="projects-section content-shell entry-fade entry-step-2">
  <div class="projects-grid">
    ${site.projects_list
      .map(
        (proj) => `
      <article class="post-card project-card reveal-item">
        <div class="card-top">
          <div class="card-meta-row">
            <span class="dots-pill" aria-hidden="true">•••</span>
            <span class="card-category">${proj.category}</span>
            <span class="card-date">${proj.year}</span>
          </div>
          <h2 class="card-title"><a href="${proj.link}" target="_blank" rel="noopener">${proj.title}</a></h2>
          <p class="card-excerpt">${proj.summary}</p>
        </div>
        <div class="card-bottom">
          <div class="card-spec-row">
            <span class="spec-label">技术栈</span>
            <span class="spec-value">${proj.tech.join(" · ")}</span>
          </div>
          <div class="card-spec-row">
            <span class="spec-label">开源状态</span>
            <span class="spec-value">MIT License · 持续维护</span>
          </div>
          <a class="card-read-btn" href="${proj.link}" target="_blank" rel="noopener">
            <span>访问项目仓库</span><span class="arrow-shift" aria-hidden="true">↗</span>
          </a>
        </div>
      </article>`
      )
      .join("\n")}
  </div>
</section>`;

  fs.mkdirSync(path.join(OUT_DIR, "projects"), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "projects", "index.html"), renderShell({ title: "个人项目", description: "围绕排版实验、知识工具与数字阅读构建的独立软件与研究。", url: "/projects/", bodyHtml: projectsBody }));

  // 5. 关于页 (/about/)
  const aboutRaw = fs.readFileSync(path.join(ROOT, "about.md"), "utf8");
  const { data: aboutData, body: aboutMd } = parseFrontMatter(aboutRaw);
  const aboutBody = `
<article class="article-page">
  <header class="article-header content-shell entry-fade entry-step-1">
    <div class="article-header-inner">
      <div class="article-breadcrumb">
        <span class="category-pill"><span class="dots-pill" aria-hidden="true">•••</span><span>${aboutData.eyebrow || "关于作者"}</span></span>
      </div>
      <h1 class="article-title">${aboutData.title}</h1>
      <p class="article-lead">${aboutData.description}</p>
    </div>
  </header>
  <div class="content-shell entry-fade entry-step-2">
    <div class="article-prose prose">
      ${renderMarkdown(aboutMd)}
    </div>
  </div>
</article>`;

  fs.mkdirSync(path.join(OUT_DIR, "about"), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "about", "index.html"), renderShell({ title: aboutData.title, description: aboutData.description, url: "/about/", bodyHtml: aboutBody }));

  // 6. 全部文章详情页
  for (const post of site.posts) {
    const prevHtml = post.previous
      ? `<a class="pager-card pager-prev" href="${post.previous.url}">
          <span class="pager-dir"><span class="arrow-back">←</span> 上一篇 · ${escapeHtml(post.previous.category)}</span>
          <strong class="pager-title">${escapeHtml(post.previous.title)}</strong>
          <time class="pager-date">${formatDateCN(post.previous.date)}</time>
        </a>`
      : `<div class="pager-card pager-empty"><span class="pager-dir">已是第一篇归档文章</span><a class="pager-fallback-link" href="/blog/">返回文章索引 →</a></div>`;

    const nextHtml = post.next
      ? `<a class="pager-card pager-next" href="${post.next.url}">
          <span class="pager-dir">下一篇 · ${escapeHtml(post.next.category)} <span class="arrow-shift">→</span></span>
          <strong class="pager-title">${escapeHtml(post.next.title)}</strong>
          <time class="pager-date">${formatDateCN(post.next.date)}</time>
        </a>`
      : `<div class="pager-card pager-next pager-empty"><span class="pager-dir">已是最新一篇文章</span><a class="pager-fallback-link" href="/blog/">浏览更多归档 →</a></div>`;

    const tagsPills = post.tags
      .map((t) => `<a class="tag-pill" href="/blog/?q=${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`)
      .join("");

    const postBody = `
<article class="article-page">
  <header class="article-header content-shell entry-fade entry-step-1">
    <div class="article-header-inner">
      <div class="article-breadcrumb">
        <a class="back-pill" href="/blog/"><span class="arrow-back">←</span><span>全部文章</span></a>
        <a class="category-pill" href="/blog/?category=${encodeURIComponent(post.category)}">
          <span class="dots-pill" aria-hidden="true">•••</span><span>${escapeHtml(post.category)}</span>
        </a>
      </div>
      <h1 class="article-title">${escapeHtml(post.title)}</h1>
      <p class="article-lead">${escapeHtml(post.description)}</p>
      <div class="article-meta-bar">
        <div class="article-meta-left">
          <span class="meta-author">${site.author}</span>
          <span class="meta-sep">·</span>
          <time datetime="${post.date}">${formatDateCN(post.date)}</time>
          <span class="meta-sep">·</span>
          <span>约 ${escapeHtml(post.reading_time)}阅读</span>
        </div>
        <div class="article-meta-tags">${tagsPills}</div>
      </div>
    </div>
  </header>
  <div class="content-shell entry-fade entry-step-2">
    <div class="article-prose prose">
      ${post.content}
    </div>
  </div>
  <footer class="article-footer content-shell">
    <div class="article-footer-inner">
      <div class="article-tags-row">
        <span class="tags-row-label">本文标签</span>
        <div class="tags-row-list">${tagsPills}</div>
      </div>
      <nav class="article-pager" aria-label="相邻文章导航">
        ${prevHtml}
        ${nextHtml}
      </nav>
    </div>
  </footer>
</article>`;

    const postDir = path.join(OUT_DIR, post.year, post.month, post.slug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, "index.html"), renderShell({ title: post.title, description: post.description, url: post.url, bodyHtml: postBody }));
  }

  // 7. 生成 RSS (/feed.xml)
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${site.title}</title>
    <description>${site.description}</description>
    <link>${site.url}${site.baseurl}/</link>
    ${site.posts
      .map(
        (p) => `<item>
      <title>${escapeHtml(p.title)}</title>
      <description>${escapeHtml(p.description)}</description>
      <link>${site.url}${site.baseurl}${p.url}</link>
      <pubDate>${p.date}</pubDate>
    </item>`
      )
      .join("\n")}
  </channel>
</rss>`;
  fs.writeFileSync(path.join(OUT_DIR, "feed.xml"), rssXml);
  console.log(`[Build] Compiled ${site.posts.length} posts and 5 pages into ${OUT_DIR}`);
}

buildSite();

if (process.argv.includes("--check")) {
  function walkHtml(dir) {
    let list = [];
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) list = list.concat(walkHtml(full));
      else if (full.endsWith(".html")) list.push(full);
    }
    return list;
  }
  const htmlFiles = walkHtml(OUT_DIR);
  const broken = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const matches = [...html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)];
    for (const m of matches) {
      const target = m[1];
      let targetPath = path.join(OUT_DIR, target);
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        targetPath = path.join(targetPath, "index.html");
      }
      if (!fs.existsSync(targetPath)) {
        broken.push({ file: path.relative(OUT_DIR, file), target });
      }
    }
  }
  console.log(`[Check] Verified ${htmlFiles.length} HTML pages. Broken internal links: ${broken.length}`);
  if (broken.length > 0) {
    console.error(broken);
    process.exit(1);
  }
}

if (process.argv.includes("--serve")) {
  const PORT = Number(process.env.PORT || 4000);
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".xml": "application/xml; charset=utf-8",
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (reqPath.startsWith("/My-Blog")) {
      reqPath = reqPath.slice("/My-Blog".length) || "/";
    }
    let filePath = path.join(OUT_DIR, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(filePath));
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[Preview Server] Running at http://localhost:${PORT}/`);
  });
}
