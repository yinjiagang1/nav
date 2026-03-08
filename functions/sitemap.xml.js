export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        let lastmod = new Date().toISOString().split('T')[0];

        try {
            const result = await env.DB.prepare('SELECT MAX(created_at) as lastmod FROM sites').first();
            if (result && result.lastmod) {
                const dateStr = result.lastmod.replace(' ', 'T') + 'Z';
                const dateObj = new Date(dateStr);
                if (!isNaN(dateObj.getTime())) {
                    lastmod = dateObj.toISOString().split('T')[0];
                }
            }
        } catch (e) {
            console.error("获取 lastmod 失败:", e);
        }

        // 获取所有的分类，为每一个分类生成专属链接
        const categoriesResult = await env.DB.prepare('SELECT id FROM categories ORDER BY sort_order ASC').all();
        const categories = categoriesResult.results || [];

        let xmlUrls = `
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/map</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;

        categories.forEach(cat => {
            // 通过刚才 app.js 新增的直达分类参数构造 URL
            // 注意：XML 里 & 符号需要转义，但由于只是单个参数 ?category=xxx，不需要转义。
            xmlUrls += `
    <url>
        <loc>${baseUrl}/?category=${cat.id}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        return new Response('<?xml version="1.0" encoding="UTF-8"?><error>' + error.message + '</error>', {
            status: 500,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' }
        });
    }
}
