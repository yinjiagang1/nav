-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    parent_id TEXT, -- 用于支持子分类，为空则是顶级分类
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 站点表
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    bg_color TEXT DEFAULT '#ffffff',
    card_size TEXT DEFAULT '1x1', -- 1x1, 2x1, 2x2, 4x1
    card_opacity REAL DEFAULT 1.0, -- 0.0 到 1.0
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 全局设置表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES 
('bg_type', 'color'), -- 'color', 'image', 'api'
('bg_image_url', ''), 
('bg_api_url', 'https://api.kdcc.cn/img/rand.php'),
('bg_refresh_strategy', 'open'), -- 'open', 'minutes_30', 'hours_1', 'daily'
('default_card_size', '1x1'),
('default_card_opacity', '0.65');

-- 插入默认分类种子数据
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES 
('home', '热门推荐', '🏠', 10),
('code', '编程开发', '💻', 20),
('design', '设计创意', '🎨', 30),
('product', '效率工具', '🚀', 40),
('ai', 'AI 工具', '🤖', 50),
('fun', '休闲娱乐', '🎮', 60);

-- 插入部分默认站点种子数据
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, bg_color, sort_order) VALUES 
('site_1', 'home', '百度', 'https://www.baidu.com/', 'https://files.codelife.cc/icons/baidu.svg', '#346efd', 10),
('site_2', 'home', '哔哩哔哩', 'https://www.bilibili.com/', 'https://files.codelife.cc/icons/bilibili2.svg', '#fe65a6', 20),
('site_3', 'home', '知乎', 'https://www.zhihu.com/', 'https://files.codelife.cc/icons/zhihu.svg', '#0c6dfe', 30),
('site_4', 'code', 'GitHub', 'https://github.com/', 'https://files.codelife.cc/icons/github.svg', '#000000', 10),
('site_5', 'code', '码云Gitee', 'https://gitee.com/', 'https://files.codelife.cc/icons/gitee.svg', '#bb2124', 20),
('site_6', 'design', '即时设计', 'https://js.design/', 'https://files.codelife.cc/icons/jsdesign.svg', '#cf3d35', 10),
('site_7', 'product', 'Notion', 'https://www.notion.so/', 'https://files.codelife.cc/icons/notion.svg', '#000000', 10),
('site_8', 'ai', 'ChatGPT', 'https://chat.openai.com/', 'https://files.codelife.cc/icons/chatgpt.svg', '#10a37f', 10);
