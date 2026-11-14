/**
 * Chronicle Press — Editorial Interactions & Motion Engine
 * 包含：首屏渐进淡入、滚动视口显现、居中标志折叠、胶囊下拉、全局搜索与文章页筛选
 */
(function () {
  "use strict";

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. 首屏依次淡入激活
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.add("is-ready");
    });
  });

  // 2. 滚动进入视口渐显（默认只播放一次）
  const revealItems = Array.from(document.querySelectorAll(".reveal-item"));
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            const target = entry.target;
            const delay = Math.min(idx * 65, 220);
            target.style.transitionDelay = `${delay}ms`;
            target.classList.add("is-visible");
            obs.unobserve(target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );
    revealItems.forEach((el) => observer.observe(el));
  }

  // 3. 顶部导航滚动状态：完整名称 ABAKA\BOLU → 简写标志 A\B
  const header = document.getElementById("site-header");
  const brandFull = header ? header.querySelector(".brand-full") : null;
  const brandCompact = header ? header.querySelector(".brand-compact") : null;

  function syncHeaderScroll() {
    if (!header) return;
    const scrolled = window.scrollY > 36;
    header.classList.toggle("is-scrolled", scrolled);
    if (brandFull && brandCompact) {
      brandFull.setAttribute("aria-hidden", scrolled ? "true" : "false");
      brandCompact.setAttribute("aria-hidden", scrolled ? "false" : "true");
    }
  }
  syncHeaderScroll();
  window.addEventListener("scroll", syncHeaderScroll, { passive: true });

  // 4. 导航胶囊下拉菜单（支持点击、键盘与触屏）
  const dropdowns = Array.from(document.querySelectorAll("[data-dropdown]"));

  function closeAllDropdowns(except) {
    dropdowns.forEach((dd) => {
      if (dd !== except) {
        dd.classList.remove("is-open");
        const btn = dd.querySelector("[data-dropdown-btn]");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  dropdowns.forEach((dd) => {
    const btn = dd.querySelector("[data-dropdown-btn]");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !dd.classList.contains("is-open");
      closeAllDropdowns(dd);
      dd.classList.toggle("is-open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  // 5. 全站展开菜单抽屉
  const menuBtn = document.getElementById("menu-open-btn");
  const menuDrawer = document.getElementById("menu-drawer");

  function setMenuOpen(open) {
    if (!menuBtn || !menuDrawer) return;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      menuDrawer.hidden = false;
      menuDrawer.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => menuDrawer.classList.add("is-open"));
    } else {
      menuDrawer.classList.remove("is-open");
      menuDrawer.setAttribute("aria-hidden", "true");
      setTimeout(() => {
        if (!menuDrawer.classList.contains("is-open")) {
          menuDrawer.hidden = true;
        }
      }, 260);
    }
  }

  if (menuBtn && menuDrawer) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      const isOpen = menuBtn.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });
  }

  document.addEventListener("click", (e) => {
    closeAllDropdowns();
    if (menuDrawer && !menuDrawer.hidden && !menuDrawer.contains(e.target) && e.target !== menuBtn) {
      setMenuOpen(false);
    }
  });

  // 6. 全局搜索弹窗
  const searchModal = document.getElementById("search-modal");
  const searchOpenBtn = document.getElementById("search-open-btn");
  const searchInput = document.getElementById("global-search-input");
  const searchResults = document.getElementById("global-search-results");
  const postsDataEl = document.getElementById("site-posts-data");

  let postsIndex = [];
  if (postsDataEl) {
    try {
      postsIndex = JSON.parse(postsDataEl.textContent || "[]");
    } catch (_) {
      postsIndex = [];
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderGlobalSearchResults(query) {
    if (!searchResults) return;
    const q = (query || "").trim().toLowerCase();
    const matched = !q
      ? postsIndex.slice(0, 6)
      : postsIndex.filter((p) => {
          const haystack = [
            p.title,
            p.category,
            p.description,
            Array.isArray(p.tags) ? p.tags.join(" ") : "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });

    if (matched.length === 0) {
      searchResults.innerHTML = `<div class="search-result-item"><div class="search-result-desc">未找到与“${escapeHtml(
        query
      )}”相关的文章。</div></div>`;
      return;
    }

    searchResults.innerHTML = matched
      .map(
        (p) => `
      <a class="search-result-item" href="${escapeHtml(p.url)}">
        <div class="search-result-meta">${escapeHtml(p.category)} · ${escapeHtml(p.date)} · 约 ${escapeHtml(
          p.readingTime
        )}</div>
        <div class="search-result-title">${escapeHtml(p.title)}</div>
        <div class="search-result-desc">${escapeHtml(p.description)}</div>
      </a>
    `
      )
      .join("");
  }

  function setSearchModalOpen(open) {
    if (!searchModal) return;
    searchModal.hidden = !open;
    if (open) {
      closeAllDropdowns();
      setMenuOpen(false);
      renderGlobalSearchResults(searchInput ? searchInput.value : "");
      requestAnimationFrame(() => {
        if (searchInput) searchInput.focus();
      });
    }
  }

  if (searchOpenBtn) {
    searchOpenBtn.addEventListener("click", () => setSearchModalOpen(true));
  }

  document.querySelectorAll("[data-search-close]").forEach((el) => {
    el.addEventListener("click", () => setSearchModalOpen(false));
  });

  document.querySelectorAll("[data-search-quick]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const val = chip.getAttribute("data-search-quick") || "";
      if (searchInput) {
        searchInput.value = val;
        renderGlobalSearchResults(val);
        searchInput.focus();
      }
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => renderGlobalSearchResults(searchInput.value));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllDropdowns();
      setMenuOpen(false);
      setSearchModalOpen(false);
    }
    if (
      (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) &&
      document.activeElement &&
      !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
    ) {
      e.preventDefault();
      setSearchModalOpen(true);
    }
  });

  // 7. 文章列表页 (/blog/) 分类筛选与关键词实时过滤
  const blogGrid = document.getElementById("blog-cards-grid");
  const filterPills = Array.from(document.querySelectorAll("[data-filter-cat]"));
  const blogFilterInput = document.getElementById("blog-filter-input");
  const blogFilterClear = document.getElementById("blog-filter-clear");
  const filterStatusText = document.getElementById("filter-status-text");
  const blogEmptyState = document.getElementById("blog-empty-state");
  const resetFiltersBtn = document.getElementById("reset-all-filters");

  if (blogGrid) {
    const cards = Array.from(blogGrid.querySelectorAll(".post-card"));
    let activeCategory = "all";
    let activeQuery = "";

    function applyBlogFilters() {
      const q = activeQuery.trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach((card) => {
        const cat = card.getAttribute("data-category") || "";
        const text = card.textContent.toLowerCase();
        const catMatch = activeCategory === "all" || cat === activeCategory;
        const queryMatch = !q || text.includes(q);
        const show = catMatch && queryMatch;

        card.hidden = !show;
        if (show) {
          card.classList.add("is-visible");
          visibleCount++;
        }
      });

      filterPills.forEach((pill) => {
        const isCurrent = pill.getAttribute("data-filter-cat") === activeCategory;
        pill.classList.toggle("is-active", isCurrent);
        pill.setAttribute("aria-selected", isCurrent ? "true" : "false");
      });

      if (blogFilterClear) {
        blogFilterClear.hidden = !q;
      }

      if (blogEmptyState) {
        blogEmptyState.hidden = visibleCount > 0;
      }

      if (filterStatusText) {
        const catLabel = activeCategory === "all" ? "全部专题" : `「${activeCategory}」`;
        const qLabel = q ? `，包含关键词“${activeQuery.trim()}”` : "";
        filterStatusText.textContent = `当前筛选：${catLabel}${qLabel} · 共显示 ${visibleCount} 篇文章`;
      }
    }

    // 读取 URL 查询参数 (?category=...&q=...)
    const params = new URLSearchParams(window.location.search);
    const paramCat = params.get("category");
    const paramQ = params.get("q");
    if (paramCat) activeCategory = paramCat;
    if (paramQ) {
      activeQuery = paramQ;
      if (blogFilterInput) blogFilterInput.value = paramQ;
    }

    filterPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        activeCategory = pill.getAttribute("data-filter-cat") || "all";
        applyBlogFilters();
      });
    });

    if (blogFilterInput) {
      blogFilterInput.addEventListener("input", () => {
        activeQuery = blogFilterInput.value;
        applyBlogFilters();
      });
    }

    if (blogFilterClear && blogFilterInput) {
      blogFilterClear.addEventListener("click", () => {
        blogFilterInput.value = "";
        activeQuery = "";
        applyBlogFilters();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        activeCategory = "all";
        activeQuery = "";
        if (blogFilterInput) blogFilterInput.value = "";
        applyBlogFilters();
      });
    }

    applyBlogFilters();
  }

  // 8. 主视觉桌面端极轻微鼠标视差（移动端与减弱动态下自动关闭）
  const heroStage = document.getElementById("hero-stage");
  const heroArtLayer = document.getElementById("hero-art-layer");
  const isFinePointer = window.matchMedia("(pointer: fine)").matches;

  if (heroStage && heroArtLayer && isFinePointer && !prefersReducedMotion) {
    heroStage.addEventListener("mousemove", (e) => {
      const rect = heroStage.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      const moveX = (relX * -10).toFixed(2);
      const moveY = (relY * -8).toFixed(2);
      heroArtLayer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });

    heroStage.addEventListener("mouseleave", () => {
      heroArtLayer.style.transform = "translate3d(0, 0, 0)";
    });
  }
})();
