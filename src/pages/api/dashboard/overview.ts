import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { DeviceStatus, DeviceType } from '@prisma/client';

/**
 * 获取大屏总览数据
 * GET /api/dashboard/overview
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // 并行查询所有统计数据
        const [
            totalDevices,
            onlineDevices,
            offlineDevices,
            warningDevices,
            errorDevices,
            networkDevices,
            serverDevices,
            otherDevices,
            activeAlarms,
            criticalAlarms,
            recentAlarms
        ] = await Promise.all([
            // 总设备数
            prisma.device.count({
                where: { isMonitored: true }
            }),

            // 在线设备数
            prisma.device.count({
                where: {
                    isMonitored: true,
                    status: DeviceStatus.ONLINE
                }
            }),

            // 离线设备数
            prisma.device.count({
                where: {
                    isMonitored: true,
                    status: DeviceStatus.OFFLINE
                }
            }),

            // 警告状态设备数
            prisma.device.count({
                where: {
                    isMonitored: true,
                    status: DeviceStatus.WARNING
                }
            }),

            // 错误状态设备数
            prisma.device.count({
                where: {
                    isMonitored: true,
                    status: DeviceStatus.ERROR
                }
            }),

            // 网络设备数（用于大屏 donut 分类）
            prisma.device.count({
                where: {
                    isMonitored: true,
                    type: { in: [DeviceType.SWITCH, DeviceType.ROUTER, DeviceType.FIREWALL, DeviceType.LOAD_BALANCER] }
                }
            }),

            // 服务器设备数（用于大屏 donut 分类）
            prisma.device.count({
                where: {
                    isMonitored: true,
                    type: { in: [DeviceType.SERVER, DeviceType.STORAGE] }
                }
            }),

            // 其他设备数（用于大屏 donut 分类）
            prisma.device.count({
                where: {
                    isMonitored: true,
                    type: { in: [DeviceType.OTHER, DeviceType.PRINTER] }
                }
            }),

            // 活动告警数
            prisma.alarm.count({
                where: {
                    status: {
                        in: ['ACTIVE', 'ACKNOWLEDGED']
                    }
                }
            }),

            // 严重告警数
            prisma.alarm.count({
                where: {
                    severity: 'CRITICAL',
                    status: {
                        in: ['ACTIVE', 'ACKNOWLEDGED']
                    }
                }
            }),

            // 最近的告警（用于大屏滚动显示）
            prisma.alarm.findMany({
                where: {
                    status: {
                        in: ['ACTIVE', 'ACKNOWLEDGED']
                    }
                },
                take: 10,
                orderBy: {
                    occurredAt: 'desc'
                },
                include: {
                    device: {
                        select: {
                            name: true,
                            displayName: true,
                            ipAddress: true
                        }
                    }
                }
            })
        ]);

        // 计算可用性百分比
        const availability = totalDevices > 0
            ? Math.round((onlineDevices / totalDevices) * 100 * 100) / 100
            : 100;

        // 计算健康度评分 (0-100)
        const healthScore = totalDevices > 0
            ? Math.round(((onlineDevices * 100 + warningDevices * 50) / totalDevices))
            : 100;

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json({
            devices: {
                // 兼容：部分前端用 totalAll（旧 stats/business-view），部分用 total（overview）
                total: totalDevices,
                totalAll: totalDevices,
                online: onlineDevices,
                offline: offlineDevices,
                warning: warningDevices,
                error: errorDevices,
                availability,
                healthScore,
                byType: {
                    network: networkDevices,
                    server: serverDevices,
                    other: otherDevices
                }
            },
            alarms: {
                total: activeAlarms,
                critical: criticalAlarms,
                recent: recentAlarms
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to fetch dashboard overview:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
