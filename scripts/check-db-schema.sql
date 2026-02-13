-- 检查 Device 表的 tags 字段
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Device' 
    AND column_name = 'tags';

-- 检查 Interface 表的 tags 字段
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Interface' 
    AND column_name = 'tags';
