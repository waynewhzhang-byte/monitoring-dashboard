import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTagsField() {
  try {
    // 尝试查询 Device 表的 tags 字段
    const device = await prisma.device.findFirst({
      select: {
        id: true,
        name: true,
        tags: true,
      },
    });
    
    console.log('✅ Device.tags 字段存在！');
    console.log('示例数据:', device ? { id: device.id, name: device.name, tags: device.tags } : '无数据');
    
    // 尝试查询 Interface 表的 tags 字段
    const interface_ = await prisma.interface.findFirst({
      select: {
        id: true,
        name: true,
        tags: true,
      },
    });
    
    console.log('✅ Interface.tags 字段存在！');
    console.log('示例数据:', interface_ ? { id: interface_.id, name: interface_.name, tags: interface_.tags } : '无数据');
    
  } catch (error: any) {
    if (error.message?.includes('tags')) {
      console.error('❌ tags 字段不存在:', error.message);
    } else {
      console.error('❌ 错误:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTagsField();
