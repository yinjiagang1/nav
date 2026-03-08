/**
 * iTab 导航后台管理逻辑
 */

// 状态
let state = {
    categories: [],
    sites: [],
    settings: {}
};

// 工具函数：API 请求封装
async function api(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }
    return res.json();
}

// 标签页切换逻辑
document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        if (e.currentTarget.classList.contains('temp-link')) return; // 排除外部链接
        e.preventDefault();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const targetId = e.currentTarget.dataset.target;
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
    });
});

// 退出登录
document.getElementById('btnLogout').addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('确定要退出登录吗？')) {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    }
});

/**
 * 模态框控制
 */
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

/**
 * 分类管理
 */
async function loadCategories() {
    const data = await api('/api/categories');
    state.categories = data;

    // 更新统计
    document.getElementById('stat-category-count').textContent = data.length;

    // 渲染表格
    const tbody = document.querySelector('#categoriesTable tbody');
    tbody.innerHTML = data.map(cat => `
        <tr>
            <td>${cat.sort_order}</td>
            <td>${cat.icon || ''}</td>
            <td><strong>${cat.name}</strong></td>
            <td>${cat.parent_id || '-'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick='editCategory(${JSON.stringify(cat)})'>编辑</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCategory('${cat.id}')">删除</button>
            </td>
        </tr>
    `).join('');

    // 更新站点表单的下拉框和筛选下拉框
    const options = `<option value="">-- 无父分类 --</option>` + data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('cat_parent_id').innerHTML = options;

    const filterOptions = `<option value="">-- 所有分类 --</option>` + data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('filterCategory').innerHTML = filterOptions;
    document.getElementById('site_category_id').innerHTML = data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

window.openCategoryModal = function () {
    document.getElementById('categoryForm').reset();
    document.getElementById('cat_id').value = '';
    document.getElementById('catModalTitle').textContent = '新建分类';
    document.getElementById('categoryModal').style.display = 'block';
};

window.editCategory = function (cat) {
    document.getElementById('cat_id').value = cat.id;
    document.getElementById('cat_name').value = cat.name;
    document.getElementById('cat_icon').value = cat.icon || '';
    document.getElementById('cat_parent_id').value = cat.parent_id || '';
    document.getElementById('cat_sort').value = cat.sort_order;
    document.getElementById('catModalTitle').textContent = '编辑分类';
    document.getElementById('categoryModal').style.display = 'block';
};

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cat_id').value;
    const isEdit = !!id;
    const payload = {
        name: document.getElementById('cat_name').value,
        icon: document.getElementById('cat_icon').value,
        parent_id: document.getElementById('cat_parent_id').value || null,
        sort_order: parseInt(document.getElementById('cat_sort').value) || 0
    };
    if (isEdit) payload.id = id;

    await api('/api/categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    closeModal('categoryModal');
    loadCategories();
});

window.deleteCategory = async function (id) {
    if (confirm('警告：删除分类将同时删除该分类下的所有站点！确定要删除吗？')) {
        await api(`/api/categories?id=${id}`, { method: 'DELETE' });
        loadCategories();
        loadSites();
    }
}

/**
 * 站点管理
 */
async function loadSites() {
    const data = await api('/api/sites');
    state.sites = data;

    // 更新统计
    document.getElementById('stat-site-count').textContent = data.length;

    const filterCat = document.getElementById('filterCategory').value;
    const filteredData = filterCat ? data.filter(s => s.category_id === filterCat) : data;

    const tbody = document.querySelector('#sitesTable tbody');
    tbody.innerHTML = filteredData.map(site => {
        const catName = state.categories.find(c => c.id === site.category_id)?.name || '未知';
        const iconHtml = site.icon ? `<img src="${site.icon}" class="icon-preview">` : `<div class="icon-preview" style="background:${site.bg_color};display:inline-flex;align-items:center;justify-content:center;color:#fff;">${site.name[0]}</div>`;
        return `
        <tr>
            <td>${site.sort_order}</td>
            <td>${iconHtml}</td>
            <td><strong>${site.name}</strong></td>
            <td>${catName}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><a href="${site.url}" target="_blank">${site.url}</a></td>
            <td>${site.card_size || '默认'} / ${site.card_opacity ?? '默认'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick='editSite(${JSON.stringify(site).replace(/'/g, "&#39;")})'>编辑</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSite('${site.id}')">删除</button>
            </td>
        </tr>
    `}).join('');
}

window.openSiteModal = function () {
    document.getElementById('siteForm').reset();
    document.getElementById('site_id').value = '';
    document.getElementById('siteModalTitle').textContent = '添加站点';
    document.getElementById('siteModal').style.display = 'block';
};

window.editSite = function (site) {
    document.getElementById('site_id').value = site.id;
    document.getElementById('site_name').value = site.name;
    document.getElementById('site_category_id').value = site.category_id;
    document.getElementById('site_url').value = site.url;
    document.getElementById('site_icon').value = site.icon || '';
    document.getElementById('site_card_size').value = site.card_size || '';
    document.getElementById('site_card_opacity').value = site.card_opacity !== null ? site.card_opacity : '';
    document.getElementById('site_bg_color').value = site.bg_color || '#346efd';
    document.getElementById('site_sort_order').value = site.sort_order;
    document.getElementById('siteModalTitle').textContent = '编辑站点';
    document.getElementById('siteModal').style.display = 'block';
};

document.getElementById('siteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('site_id').value;
    const isEdit = !!id;
    const payload = {
        category_id: document.getElementById('site_category_id').value,
        name: document.getElementById('site_name').value,
        url: document.getElementById('site_url').value,
        icon: document.getElementById('site_icon').value,
        bg_color: document.getElementById('site_bg_color').value,
        card_size: document.getElementById('site_card_size').value || '',
        card_opacity: document.getElementById('site_card_opacity').value || null,
        sort_order: parseInt(document.getElementById('site_sort_order').value) || 0
    };
    if (isEdit) payload.id = id;

    await api('/api/sites', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    closeModal('siteModal');
    loadSites();
});

window.deleteSite = async function (id) {
    if (confirm('确定要删除该站点吗？')) {
        await api(`/api/sites?id=${id}`, { method: 'DELETE' });
        loadSites();
    }
}

/**
 * 图标上传到 KV
 */
window.handleIconUpload = async function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return alert('图片不能超过 1MB');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/icons', {
            method: 'POST',
            body: formData
            // Note: 不设置 Content-Type，浏览器会自动设置 multipart/form-data 及 boundary
        });

        if (res.status === 401 || res.status === 403) {
            window.location.href = '/login.html';
            return;
        }

        const data = await res.json();
        if (data.success) {
            document.getElementById('site_icon').value = data.url;
            alert('上传成功！');
        } else {
            alert('上传失败: ' + data.error);
        }
    } catch (err) {
        alert('上传出错: ' + err.message);
    }
}

/**
 * 设置管理
 */
async function loadSettings() {
    state.settings = await api('/api/settings');
    const form = document.getElementById('settingsForm');
    for (const [key, value] of Object.entries(state.settings)) {
        if (form.elements[key]) {
            form.elements[key].value = value;
        }
    }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    await api('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    alert('设置已保存');
});

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = e.target.elements['new_password'].value;
    if (pwd.length < 6) return alert('密码至少 6 位');

    await api('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_password_hash: pwd })
    });

    alert('密码已修改，请重新登录');
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

/**
 * 初始化
 */
async function init() {
    try {
        await loadCategories();
        await loadSites();
        await loadSettings();
    } catch (e) { /* Error handeled in api wrapper */ }
}

init();
