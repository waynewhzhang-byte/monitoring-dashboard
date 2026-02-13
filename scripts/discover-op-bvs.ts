
import dotenv from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import https from 'https';

// Force load env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const baseUrl = process.env.OPMANAGER_BASE_URL;
const apiKey = process.env.OPMANAGER_API_KEY;

async function listBVs() {
    console.log('📡 [DISCOVERY] 正在从 OpManager 获取真实的业务视图列表...');

    if (!baseUrl || !apiKey) {
        console.error('❌ 配置缺失: OPMANAGER_BASE_URL 或 OPMANAGER_API_KEY 未设置');
        return;
    }

    const instance = axios.create({
        baseURL: baseUrl,
        timeout: 30000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    try {
        // 常见的 OpManager 获取 BV 列表的 API
        const response = await instance.get('/api/json/businessview/getBusinessViews', {
            params: { apiKey }
        });

        console.log('✅ API 响应成功的返回值:');
        if (Array.isArray(response.data)) {
            response.data.forEach((bv: any) => {
                console.log(`- 名称: "${bv.name}", 显示名称: "${bv.displayName}"`);
            });
        } else {
            console.log(JSON.stringify(response.data, null, 2));
        }
    } catch (error: any) {
        console.warn('⚠️ getBusinessViews 失败，尝试备选方案...');
        try {
            // 备选方案：尝试从设备摘要中推测
            console.log('尝试从 device/listDevices 探测...');
        } catch (e) { }
    }
}

listBVs().catch(console.error);
