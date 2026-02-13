/**
 * 诊断大屏数据问题
 * 检查：
 * 1. 设备标签和接口标签配置情况
 * 2. 数据采集是否成功（设备指标、流量指标）
 * 3. 数据采集服务的日志记录
 */

import { prisma } from '@/lib/prisma';

async function diagnoseDashboardData() {
    console.log('🔍 开始诊断大屏数据问题...\n');
    console.log('='.repeat(80));
    
    // 1. 检查设备数据
    console.log('\n📊 1. 设备数据检查');
    console.log('-'.repeat(80));
    
    const totalDevices = await prisma.device.count();
    const monitoredDevices = await prisma.device.count({
        where: { isMonitored: true }
    });
    const devicesWithTags = await prisma.device.count({
        where: {
            tags: { isEmpty: false }
        }
    });
    const devicesWithCategory = await prisma.device.count({
        where: {
            category: { not: null }
        }
    });
    const devicesWithGroup = await prisma.device.count({
        where: {
            group: { not: null }
        }
    });
    
    console.log(`总设备数: ${totalDevices}`);
    console.log(`监控中的设备数: ${monitoredDevices}`);
    console.log(`有标签的设备数: ${devicesWithTags}`);
    console.log(`有分类的设备数: ${devicesWithCategory}`);
    console.log(`有分组的设备数: ${devicesWithGroup}`);
    
    // 获取所有标签
    const allDevices = await prisma.device.findMany({
        select: { tags: true, category: true, group: true, type: true }
    });
    const allDeviceTags = new Set<string>();
    allDevices.forEach(d => {
        d.tags.forEach(tag => allDeviceTags.add(tag));
    });
    console.log(`\n设备标签列表 (${allDeviceTags.size}个):`, Array.from(allDeviceTags).sort());
    
    // 2. 检查接口数据
    console.log('\n📡 2. 接口数据检查');
    console.log('-'.repeat(80));
    
    const totalInterfaces = await prisma.interface.count();
    const monitoredInterfaces = await prisma.interface.count({
        where: { isMonitored: true }
    });
    const interfacesWithTags = await prisma.interface.count({
        where: {
            tags: { isEmpty: false }
        }
    });
    
    console.log(`总接口数: ${totalInterfaces}`);
    console.log(`监控中的接口数: ${monitoredInterfaces}`);
    console.log(`有标签的接口数: ${interfacesWithTags}`);
    
    // 获取所有接口标签
    const allInterfaces = await prisma.interface.findMany({
        select: { tags: true }
    });
    const allInterfaceTags = new Set<string>();
    allInterfaces.forEach(i => {
        i.tags.forEach(tag => allInterfaceTags.add(tag));
    });
    console.log(`\n接口标签列表 (${allInterfaceTags.size}个):`, Array.from(allInterfaceTags).sort());
    
    // 3. 检查设备指标数据
    console.log('\n📈 3. 设备指标数据检查');
    console.log('-'.repeat(80));
    
    const totalMetrics = await prisma.deviceMetric.count();
    const recentMetrics = await prisma.deviceMetric.count({
        where: {
            timestamp: {
                gte: new Date(Date.now() - 5 * 60 * 1000) // 最近5分钟
            }
        }
    });
    const metricsInLastHour = await prisma.deviceMetric.count({
        where: {
            timestamp: {
                gte: new Date(Date.now() - 60 * 60 * 1000) // 最近1小时
            }
        }
    });
    
    console.log(`总指标记录数: ${totalMetrics}`);
    console.log(`最近5分钟的指标数: ${recentMetrics}`);
    console.log(`最近1小时的指标数: ${metricsInLastHour}`);
    
    // 检查哪些设备有指标数据
    const devicesWithMetrics = await prisma.device.findMany({
        where: {
            isMonitored: true,
            metrics: {
                some: {
                    timestamp: {
                        gte: new Date(Date.now() - 60 * 60 * 1000)
                    }
                }
            }
        },
        select: {
            id: true,
            name: true,
            displayName: true,
            isMonitored: true,
            _count: {
                select: {
                    metrics: {
                        where: {
                            timestamp: {
                                gte: new Date(Date.now() - 60 * 60 * 1000)
                            }
                        }
                    }
                }
            }
        },
        take: 10
    });
    
    console.log(`\n最近1小时有指标数据的设备数: ${devicesWithMetrics.length}`);
    if (devicesWithMetrics.length > 0) {
        console.log('示例设备:');
        devicesWithMetrics.forEach(d => {
            console.log(`  - ${d.displayName || d.name}: ${d._count.metrics} 条指标`);
        });
    }
    
    // 检查哪些设备没有指标数据
    const devicesWithoutMetrics = await prisma.device.findMany({
        where: {
            isMonitored: true,
            metrics: {
                none: {
                    timestamp: {
                        gte: new Date(Date.now() - 60 * 60 * 1000)
                    }
                }
            }
        },
        select: {
            id: true,
            name: true,
            displayName: true,
            isMonitored: true
        },
        take: 10
    });
    
    if (devicesWithoutMetrics.length > 0) {
        console.log(`\n⚠️  最近1小时没有指标数据的设备数: ${devicesWithoutMetrics.length}`);
        console.log('示例设备:');
        devicesWithoutMetrics.forEach(d => {
            console.log(`  - ${d.displayName || d.name}`);
        });
    }
    
    // 4. 检查流量指标数据
    console.log('\n🌊 4. 流量指标数据检查');
    console.log('-'.repeat(80));
    
    const totalTrafficMetrics = await prisma.trafficMetric.count();
    const recentTrafficMetrics = await prisma.trafficMetric.count({
        where: {
            timestamp: {
                gte: new Date(Date.now() - 5 * 60 * 1000) // 最近5分钟
            }
        }
    });
    const trafficMetricsInLastHour = await prisma.trafficMetric.count({
        where: {
            timestamp: {
                gte: new Date(Date.now() - 60 * 60 * 1000) // 最近1小时
            }
        }
    });
    
    console.log(`总流量指标记录数: ${totalTrafficMetrics}`);
    console.log(`最近5分钟的流量指标数: ${recentTrafficMetrics}`);
    console.log(`最近1小时的流量指标数: ${trafficMetricsInLastHour}`);
    
    // 检查哪些接口有流量数据
    const interfacesWithTraffic = await prisma.interface.findMany({
        where: {
            isMonitored: true,
            trafficMetrics: {
                some: {
                    timestamp: {
                        gte: new Date(Date.now() - 60 * 60 * 1000)
                    }
                }
            }
        },
        select: {
            id: true,
            name: true,
            displayName: true,
            isMonitored: true,
            _count: {
                select: {
                    trafficMetrics: {
                        where: {
                            timestamp: {
                                gte: new Date(Date.now() - 60 * 60 * 1000)
                            }
                        }
                    }
                }
            }
        },
        take: 10
    });
    
    console.log(`\n最近1小时有流量数据的接口数: ${interfacesWithTraffic.length}`);
    if (interfacesWithTraffic.length > 0) {
        console.log('示例接口:');
        interfacesWithTraffic.forEach(i => {
            console.log(`  - ${i.displayName || i.name}: ${i._count.trafficMetrics} 条流量指标`);
        });
    }
    
    // 5. 检查告警数据（作为对比）
    console.log('\n🚨 5. 告警数据检查（对比）');
    console.log('-'.repeat(80));
    
    const totalAlarms = await prisma.alarm.count();
    const recentAlarms = await prisma.alarm.count({
        where: {
            occurredAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000)
            }
        }
    });
    
    console.log(`总告警数: ${totalAlarms}`);
    console.log(`最近1小时的告警数: ${recentAlarms}`);
    
    // 6. 检查数据采集时间戳
    console.log('\n⏰ 6. 数据同步时间戳检查');
    console.log('-'.repeat(80));
    
    const devicesWithSyncTime = await prisma.device.findMany({
        where: {
            lastSyncAt: { not: null }
        },
        select: {
            name: true,
            displayName: true,
            lastSyncAt: true
        },
        orderBy: {
            lastSyncAt: 'desc'
        },
        take: 5
    });
    
    console.log(`有同步时间戳的设备数: ${devicesWithSyncTime.length}`);
    if (devicesWithSyncTime.length > 0) {
        console.log('最近同步的设备:');
        devicesWithSyncTime.forEach(d => {
            const timeAgo = d.lastSyncAt ? Math.round((Date.now() - d.lastSyncAt.getTime()) / 1000 / 60) : 0;
            console.log(`  - ${d.displayName || d.name}: ${timeAgo} 分钟前`);
        });
    }
    
    // 7. 总结和建议
    console.log('\n📋 7. 诊断总结');
    console.log('='.repeat(80));
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (monitoredDevices === 0) {
        issues.push('❌ 没有监控中的设备');
        recommendations.push('请确保设备已同步且isMonitored=true');
    }
    
    if (recentMetrics === 0 && monitoredDevices > 0) {
        issues.push('❌ 最近5分钟没有设备指标数据');
        recommendations.push('检查数据采集服务是否运行');
        recommendations.push('检查OPMANAGER API连接是否正常');
        recommendations.push('查看日志文件 logs/combined.log 或 logs/error.log');
    }
    
    if (recentTrafficMetrics === 0 && monitoredInterfaces > 0) {
        issues.push('❌ 最近5分钟没有流量指标数据');
        recommendations.push('检查接口同步是否完成');
        recommendations.push('检查流量数据采集是否正常');
    }
    
    if (devicesWithTags === 0 && totalDevices > 0) {
        issues.push('⚠️  没有设备配置标签');
        recommendations.push('标签是可选的，但如果大屏需要按标签过滤，请配置标签');
    }
    
    if (interfacesWithTags === 0 && totalInterfaces > 0) {
        issues.push('⚠️  没有接口配置标签');
        recommendations.push('接口标签是可选的，但如果需要按标签过滤，请配置标签');
    }
    
    if (issues.length === 0) {
        console.log('✅ 未发现明显问题');
    } else {
        console.log('发现的问题:');
        issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    if (recommendations.length > 0) {
        console.log('\n建议:');
        recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('诊断完成！');
}

// 运行诊断
diagnoseDashboardData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
