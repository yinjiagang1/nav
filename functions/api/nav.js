export async function onRequestGet({ env }) {
    try {
        // 1. 获取所有分类
        const categoriesResult = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
        const categories = categoriesResult.results;

        // 2. 获取所有站点
        const sitesResult = await env.DB.prepare('SELECT * FROM sites ORDER BY sort_order ASC').all();
        const sites = sitesResult.results;

        // 3. 获取全局设置
        const settingsResult = await env.DB.prepare('SELECT key, value FROM settings').all();
        const settings = settingsResult.results.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        // 4. 将站点嵌套入分类数据中
        const navData = {
            categories: categories.map(cat => {
                return {
                    id: cat.id,
                    name: cat.name,
                    icon: cat.icon,
                    parent_id: cat.parent_id,
                    sort_order: cat.sort_order,
                    sites: sites.filter(site => site.category_id === cat.id).map(site => ({
                        id: site.id,
                        name: site.name,
                        url: site.url,
                        icon: site.icon,
                        bg_color: site.bg_color,
                        card_size: site.card_size,
                        card_opacity: site.card_opacity,
                        sort_order: site.sort_order,
                    }))
                };
            }),
            settings: settings
        };

        return new Response(JSON.stringify(navData), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
