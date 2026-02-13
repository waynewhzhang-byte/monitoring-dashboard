
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initBusinessViews() {
    console.log('🚀 [INIT] 正在初始化业务视图配置...');

    // 根据大屏逻辑，我们需要至少一个核心业务视图
    // 同时也添加一些可能存在的常见视图名称
    const views = [
        {
            id: 'view_core_pro_01',
            name: '核心业务视图',
            displayName: '核心业务视图',
            isActive: true,
            cameraX: 0,
            cameraY: 0,
            cameraZoom: 1
        }
    ];

    for (const view of views) {
        const result = await prisma.businessViewConfig.upsert({
            where: { name: view.name },
            update: {
                isActive: true,
                displayName: view.displayName
            },
            create: view
        });
        console.log(`✅ [INIT] 已写入业务视图: ${result.displayName} (内部名称: ${result.name})`);
    }

    const count = await prisma.businessViewConfig.count();
    console.log(`📊 [INIT] 当前共有 ${count} 个活跃业务视图。`);
}

initBusinessViews()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
