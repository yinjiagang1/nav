/**
 * lioil 导航网站全栈版 - 前端逻辑
 */

(function () {
    'use strict';

    // 全局数据状态
    let navData = { categories: [], settings: {} };
    let currentCategory = '';

    document.getElementById('currentYear').textContent = new Date().getFullYear();

    /**
     * 加载数据并初始化
     */
    async function init() {
        initTheme(); // 立即初始化主题
        try {
            const res = await fetch('/api/nav');
            if (!res.ok) throw new Error('Failed to load navigation data');
            navData = await res.json();

            applySettings(navData.settings);
            renderCategoryTabs(navData.categories);

            const urlParams = new URLSearchParams(window.location.search);
            const targetCategory = urlParams.get('category');

            if (navData.categories.length > 0) {
                // 如果 URL 指定了 category 并且存在，则选中它，否则选第一个
                const exists = navData.categories.some(c => c.id === targetCategory);
                currentCategory = exists ? targetCategory : navData.categories[0].id;
                renderNavSections(navData.categories);

                // 模拟点击以触发选中样式
                setTimeout(() => {
                    const tab = document.querySelector(`.category-tab[data-category="${currentCategory}"]`);
                    if (tab) tab.click();
                }, 0);
            } else {
                document.getElementById('navSectionsContainer').innerHTML = '<div class="empty-state">暂无分类和导航数据</div>';
            }

            initSearch();
        } catch (error) {
            console.error(error);
            document.getElementById('navSectionsContainer').innerHTML = `<div class="empty-state">加载数据失败: ${error.message}</div>`;
        }
    }

    /**
     * 应用全局设置 (背景图刷新等)
     */
    function applySettings(settings) {
        const bgLayer = document.getElementById('dynamicBg');
        const bgType = settings.bg_type || 'color';

        if (bgType === 'color') {
            bgLayer.classList.add('show-orbs');
            bgLayer.style.backgroundImage = 'none';
        } else if (bgType === 'image' && settings.bg_image_url) {
            bgLayer.classList.remove('show-orbs');
            bgLayer.style.backgroundImage = `url('${settings.bg_image_url}')`;
        } else if (bgType === 'api' && settings.bg_api_url) {
            bgLayer.classList.remove('show-orbs');
            // 为了防止缓存，加上时间戳（如果是每次打开刷新的话）
            const timestamp = settings.bg_refresh_strategy === 'open' ? `?t=${Date.now()}` : '';
            // Handle URL params correctly 
            const separator = settings.bg_api_url.includes('?') ? '&' : '?';
            const finalUrl = timestamp ? `${settings.bg_api_url}${separator}t=${Date.now()}` : settings.bg_api_url;

            bgLayer.style.backgroundImage = `url('${finalUrl}')`;
        }
    }

    /**
     * 渲染分类标签
     */
    function renderCategoryTabs(categories) {
        const tabsContainer = document.getElementById('categoryTabs');
        let html = '';
        categories.forEach((cat, index) => {
            const activeClass = index === 0 ? 'active' : '';
            html += `<button class="category-tab ${activeClass}" data-category="${cat.id}">
                ${cat.icon || ''} ${cat.name}
            </button>`;
        });
        tabsContainer.innerHTML = html;

        // 绑定事件
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.category;
                if (targetId === currentCategory && !document.getElementById('searchInput').value) return;

                // 恢复搜索状态
                document.getElementById('searchInput').value = '';
                document.getElementById('searchResults').style.display = 'none';

                // 切换样式
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // 切换显示区域
                currentCategory = targetId;
                document.querySelectorAll('.category-section').forEach(section => {
                    section.style.display = section.id === `section-${currentCategory}` ? '' : 'none';
                });

                // 触发动画
                replayAnimations(`section-${currentCategory}`);
            });
        });
    }

    /**
     * 解析卡片底色及透明度为 rgba
     */
    function getCardBackground(isDark, cardOpacity) {
        // 使用 CSS 变量结合指定的透明度获取真实的卡片颜色
        const rgb = isDark ? '35, 35, 60' : '255, 255, 255';
        return `rgba(${rgb}, ${cardOpacity})`;
    }

    function createCardHTML(site, index, globalSettings) {
        const fallbackOpacity = parseFloat(globalSettings.default_card_opacity) || 0.65;
        const opacity = site.card_opacity !== undefined ? site.card_opacity : fallbackOpacity;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const bgStyle = `background: ${getCardBackground(isDark, opacity)};`;

        // 根据预设大小应用对应的 class 
        const sizeClass = `size-${site.card_size || globalSettings.default_card_size || '1x1'}`;
        const delay = (index * 0.02).toFixed(2);

        return `
        <a class="nav-card ${sizeClass}" href="${site.url}" target="_blank" rel="noopener noreferrer"
           title="${site.name}" style="${bgStyle} animation-delay: ${delay}s;">
            <img class="nav-card-icon" src="${site.icon}" alt="${site.name}" loading="lazy"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div class="nav-card-icon-placeholder" style="display:none;background:${site.bg_color || '#346efd'};">
                ${site.name.substring(0, 1)}
            </div>
            <span class="nav-card-name">${site.name}</span>
        </a>`;
    }

    /**
     * 渲染卡片区域
     */
    function renderNavSections(categories) {
        const container = document.getElementById('navSectionsContainer');
        let html = '';

        categories.forEach((cat, i) => {
            const display = i === 0 ? '' : 'style="display:none;"';
            html += `<div class="nav-grid category-section" id="section-${cat.id}" ${display}>`;

            if (cat.sites && cat.sites.length > 0) {
                cat.sites.forEach((site, index) => {
                    html += createCardHTML(site, index, navData.settings);
                });
            } else {
                html += `<div class="empty-state">此分类下暂无内容</div>`;
            }

            html += `</div>`;
        });

        container.innerHTML = html;

        // 当主题切换时需要重新计算内联 background rgba 颜色，这里通过 MutationObserver 监听 data-theme 变化进行全量修正
        observeThemeChangeForCards();
    }

    function observeThemeChangeForCards() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    // 重新渲染所有区域以更新内联颜色 (偷懒做法，更优的做法是用 CSS 变量在内联声明透明度)
                    renderNavSections(navData.categories);
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    /**
     * 重置动画
     */
    function replayAnimations(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        const cards = section.querySelectorAll('.nav-card');
        cards.forEach(card => {
            card.style.animation = 'none';
            void card.offsetHeight; // reflow
            card.style.animation = '';
        });
    }

    /**
     * 初始化搜索逻辑
     */
    function initSearch() {
        const input = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        let timer;

        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const keyword = input.value.toLowerCase().trim();
                if (!keyword) {
                    searchResults.style.display = 'none';
                    document.querySelectorAll('.category-section').forEach(section => {
                        section.style.display = section.id === `section-${currentCategory}` ? '' : 'none';
                    });
                    return;
                }

                document.querySelectorAll('.category-section').forEach(s => s.style.display = 'none');

                // 搜索所有站点
                let results = [];
                navData.categories.forEach(cat => {
                    (cat.sites || []).forEach(site => {
                        if (site.name.toLowerCase().includes(keyword) || site.url.toLowerCase().includes(keyword)) {
                            // 避免重复
                            if (!results.find(r => r.url === site.url)) results.push(site);
                        }
                    });
                });

                let html = '';
                if (results.length > 0) {
                    results.forEach((site, index) => {
                        html += createCardHTML(site, index, navData.settings);
                    });
                } else {
                    html = `<div class="empty-state">没有找到 "${keyword}" 的匹配结果</div>`;
                }

                searchResults.innerHTML = html;
                searchResults.style.display = '';
                replayAnimations('searchResults');

            }, 300);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                input.value = '';
                input.dispatchEvent(new Event('input'));
            }
        });
    }

    /**
     * 初始化主题
     */
    function initTheme() {
        const saved = localStorage.getItem('nav-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = saved ? saved === 'dark' : prefersDark;

        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);

        document.getElementById('themeToggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const nowDark = current !== 'dark';
            document.documentElement.setAttribute('data-theme', nowDark ? 'dark' : 'light');
            localStorage.setItem('nav-theme', nowDark ? 'dark' : 'light');
            updateThemeIcon(nowDark);
        });
    }

    function updateThemeIcon(isDark) {
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    }

    // 启动
    document.addEventListener('DOMContentLoaded', init);

})();


