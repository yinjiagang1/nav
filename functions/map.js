export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        // 获取分类和站点
        const categoriesResult = await env.DB.prepare('SELECT id, name FROM categories ORDER BY sort_order ASC').all();
        const categories = categoriesResult.results || [];

        const sitesResult = await env.DB.prepare('SELECT id, name, url, category_id FROM sites ORDER BY sort_order ASC').all();
        const sites = sitesResult.results || [];

        let currentIdx = 1;
        let htmlLines = [];

        htmlLines.push(`<li><span class="idx">当前序号${currentIdx++}:</span> <a href="${baseUrl}/">${baseUrl}/</a> <span class="title">标题是 ---首页</span></li>`);
        htmlLines.push(`<li><span class="idx">当前序号${currentIdx++}:</span> <a href="${baseUrl}/admin.html">${baseUrl}/admin</a> <span class="title">标题是 ---后台管理</span></li>`);

        // 遍历分类
        categories.forEach(cat => {
            htmlLines.push(`<li><span class="idx">当前序号${currentIdx++}:</span> <a href="${baseUrl}/?category=${cat.id}">${baseUrl}/?category=${cat.id}</a> <span class="title">标题是 ---${cat.name}</span></li>`);
        });

        // 遍历所有站点（可选）
        sites.forEach(site => {
            htmlLines.push(`<li><span class="idx">当前序号${currentIdx++}:</span> <a href="${site.url}" target="_blank" rel="noopener noreferrer">${site.url}</a> <span class="title">标题是 ---${site.name}</span></li>`);
        });

        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>站点地图 - 导航与地址列表</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.8; padding: 20px 40px; max-width: 1400px; margin: 0 auto; color: #333; }
        h1 { font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { margin-bottom: 10px; font-size: 15px; display: flex; align-items: center; flex-wrap: wrap; }
        .idx { min-width: 90px; color: #555; }
        a { color: #0066cc; text-decoration: none; word-break: break-all; margin: 0 10px; flex-grow: 1; max-width: 800px; }
        a:hover { text-decoration: underline; color: #004499; }
        .title { color: #666; white-space: nowrap; }
        
        @media (max-width: 768px) {
            li { flex-direction: column; align-items: flex-start; border-bottom: 1px dashed #eee; padding-bottom: 10px; }
            a { margin: 5px 0; }
        }
    </style>
</head>
<body>
    <h1>网站导航地图</h1>
    <ul>
        ${htmlLines.join('\n        ')}
    </ul>
</body>
</html>`;

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=600'
            }
        });

    } catch (error) {
        return new Response('内部错误: ' + error.message, { status: 500 });
    }
}
