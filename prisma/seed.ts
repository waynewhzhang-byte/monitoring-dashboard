import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 创建测试设备
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        opmanagerId: 'test-router-01',
        name: 'core-router-01.example.com',
        displayName: '核心路由器 01',
        type: 'ROUTER',
        ipAddress: '192.168.1.1',
        vendor: 'Cisco',
        model: 'ISR 4451',
        status: 'ONLINE',
        isMonitored: true,
      },
    }),
    prisma.device.create({
      data: {
        opmanagerId: 'test-switch-01',
        name: 'access-switch-01.example.com',
        displayName: '接入交换机 01',
        type: 'SWITCH',
        ipAddress: '192.168.1.10',
        vendor: 'Cisco',
        model: 'Catalyst 2960',
        status: 'ONLINE',
        isMonitored: true,
      },
    }),
    prisma.device.create({
      data: {
        opmanagerId: 'test-server-01',
        name: 'app-server-01.example.com',
        displayName: '应用服务器 01',
        type: 'SERVER',
        ipAddress: '192.168.1.100',
        osType: 'LINUX',
        status: 'ONLINE',
        isMonitored: true,
      },
    }),
  ]);

  console.log(`✅ Created ${devices.length} devices`);

  // 创建测试指标
  for (const device of devices) {
    await prisma.deviceMetric.create({
      data: {
        deviceId: device.id,
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        diskUsage: Math.random() * 100,
        timestamp: new Date(),
      },
    });
  }

  console.log('✅ Created device metrics');

  // 创建测试告警
  await prisma.alarm.create({
    data: {
      deviceId: devices[0].id,
      severity: 'WARNING',
      category: 'Performance',
      title: 'CPU 使用率偏高',
      message: 'CPU 使用率达到 75%',
      status: 'ACTIVE',
      occurredAt: new Date(),
    },
  });

  console.log('✅ Created test alarm');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
