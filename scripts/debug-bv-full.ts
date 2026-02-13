/**
 * 完整分析 getBVDetails API 返回的每条边的所有字段
 * 目标：找出每条边独特的流量数据
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import axios from 'axios';
import https from 'https';

async function main() {
    const bvName = process.argv[2] || 'TEST2';

    const baseURL = process.env.OPMANAGER_BASE_URL || '';
    const apiKey = process.env.OPMANAGER_API_KEY || '';

    console.log('='.repeat(100));
    console.log(`📡 完整分析 ${bvName} 业务视图的边流量数据`);
    console.log('='.repeat(100));
    console.log('');

    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });

    try {
        const url = `${baseURL}/api/json/businessview/getBVDetails`;

        const response = await axios.get(url, {
            params: { apiKey, bvName },
            httpsAgent,
            timeout: 60000,
        });

        const data = response.data;
        const { linkProperties } = data;

        console.log(`总边数: ${linkProperties?.length || 0}`);
        console.log('');

        if (!linkProperties || linkProperties.length === 0) {
            console.log('❌ 没有边数据');
            return;
        }

        // 详细分析每条边的所有流量相关字段
        console.log('='.repeat(100));
        console.log('📋 每条边的完整流量数据分析');
        console.log('='.repeat(100));
        console.log('');

        linkProperties.forEach((link: any, index: number) => {
            console.log(`\n${'═'.repeat(100)}`);
            console.log(`边 ${index + 1}: ${link.source} → ${link.dest}`);
            console.log(`${'═'.repeat(100)}`);

            // 基本信息
            console.log('\n📌 基本标识:');
            console.log(`   name: ${link.name}`);
            console.log(`   objName: ${link.objName}`);
            console.log(`   desc: ${link.desc || 'N/A'}`);
            console.log(`   intfDisplayName: ${link.intfDisplayName || 'N/A'}`);
            console.log(`   ifName: ${link.ifName || 'N/A'}`);
            console.log(`   parentName: ${link.parentName || 'N/A'}`);
            console.log(`   parentDispName: ${link.parentDispName || 'N/A'}`);

            // 流量数据 - 源端
            console.log('\n📊 源端流量 (Source Traffic):');
            console.log(`   InTraffic: ${link.InTraffic || 'N/A'}`);
            console.log(`   OutTraffic: ${link.OutTraffic || 'N/A'}`);
            console.log(`   InUtil: ${link.InUtil || 'N/A'}`);
            console.log(`   OutUtil: ${link.OutUtil || 'N/A'}`);
            console.log(`   ifspeed: ${link.ifspeed || 'N/A'}`);

            // 检查 srcProps 字段
            if (link.srcProps) {
                console.log('\n📊 srcProps (源端属性):');
                console.log(JSON.stringify(link.srcProps, null, 2));
            }

            // 检查 destProps 字段
            if (link.destProps) {
                console.log('\n📊 destProps (目标端属性):');
                console.log(JSON.stringify(link.destProps, null, 2));
            }

            // 检查所有可能包含流量的字段
            console.log('\n🔍 所有包含 "traffic", "bandwidth", "util", "rate" 的字段:');
            Object.keys(link).forEach(key => {
                const keyLower = key.toLowerCase();
                if (keyLower.includes('traffic') ||
                    keyLower.includes('bandwidth') ||
                    keyLower.includes('util') ||
                    keyLower.includes('rate') ||
                    keyLower.includes('speed') ||
                    keyLower.includes('props')) {
                    console.log(`   ${key}: ${JSON.stringify(link[key])}`);
                }
            });

            // 状态信息
            console.log('\n📈 状态信息:');
            console.log(`   status: ${link.status}`);
            console.log(`   OperStatus: ${link.OperStatus || 'N/A'}`);
            console.log(`   AdminStatus: ${link.AdminStatus || 'N/A'}`);
        });

        // 输出完整的边对象用于深入分析
        console.log('\n\n');
        console.log('='.repeat(100));
        console.log('📄 所有边的完整 JSON (用于详细对比):');
        console.log('='.repeat(100));

        linkProperties.forEach((link: any, index: number) => {
            console.log(`\n--- 边 ${index + 1} ---`);
            console.log(JSON.stringify(link, null, 2));
        });

        // 创建对比表格
        console.log('\n\n');
        console.log('='.repeat(100));
        console.log('📊 边流量对比表:');
        console.log('='.repeat(100));
        console.log('');
        console.log('| # | Source | Dest | objName | InTraffic | OutTraffic |');
        console.log('|---|--------|------|---------|-----------|------------|');

        linkProperties.forEach((link: any, index: number) => {
            const src = link.source.substring(0, 15);
            const dst = link.dest.substring(0, 15);
            const obj = link.objName.substring(0, 20);
            const inT = link.InTraffic || 'N/A';
            const outT = link.OutTraffic || 'N/A';
            console.log(`| ${index + 1} | ${src} | ${dst} | ${obj} | ${inT} | ${outT} |`);
        });

    } catch (error: any) {
        console.error('❌ API 调用失败:', error.message);
    }
}

main();
