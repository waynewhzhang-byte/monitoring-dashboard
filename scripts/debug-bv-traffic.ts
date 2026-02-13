/**
 * 调试脚本：直接调用 OpManager getBVDetails API 并分析边的流量数据
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
  
  console.log('='.repeat(80));
  console.log(`📡 调用 OpManager getBVDetails API`);
  console.log('='.repeat(80));
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`   Business View: ${bvName}`);
  console.log('');

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  try {
    const url = `${baseURL}/api/json/businessview/getBVDetails`;
    console.log(`📡 GET ${url}?apiKey=xxxx&bvName=${bvName}`);
    console.log('');
    
    const response = await axios.get(url, {
      params: { apiKey, bvName },
      httpsAgent,
      timeout: 60000,
    });

    const data = response.data;
    
    console.log('✅ API 调用成功！');
    console.log('');
    
    // 1. 显示基本信息
    const { deviceProperties, linkProperties } = data;
    console.log('📊 基本信息:');
    console.log(`   设备数 (deviceProperties): ${deviceProperties?.length || 0}`);
    console.log(`   边数 (linkProperties): ${linkProperties?.length || 0}`);
    console.log('');
    
    // 2. 分析边数据中的流量字段
    console.log('='.repeat(80));
    console.log('📋 边流量数据分析:');
    console.log('='.repeat(80));
    console.log('');
    
    if (linkProperties && linkProperties.length > 0) {
      // 显示所有边的流量相关字段
      linkProperties.forEach((link: any, index: number) => {
        console.log(`边 ${index + 1}: ${link.source} → ${link.dest}`);
        console.log('─'.repeat(60));
        
        // 检查所有可能的流量字段
        const trafficFields = [
          'InTraffic', 'OutTraffic', 'inTraffic', 'outTraffic',
          'InBandwidth', 'OutBandwidth', 'inBandwidth', 'outBandwidth',
          'rxRate', 'txRate', 'RxRate', 'TxRate',
          'destProps', 'srcProps'
        ];
        
        let hasTrafficData = false;
        
        trafficFields.forEach(field => {
          if (link[field] !== undefined) {
            console.log(`   ${field}: ${JSON.stringify(link[field])}`);
            hasTrafficData = true;
          }
        });
        
        if (!hasTrafficData) {
          console.log('   ⚠️ 没有找到流量相关字段');
        }
        
        // 显示其他重要字段
        console.log(`   name: ${link.name}`);
        console.log(`   objName: ${link.objName}`);
        console.log(`   status: ${link.status}`);
        console.log(`   ifName: ${link.ifName || 'N/A'}`);
        console.log(`   intfDisplayName: ${link.intfDisplayName || 'N/A'}`);
        console.log('');
      });
      
      // 3. 统计流量数据
      console.log('='.repeat(80));
      console.log('📊 流量数据统计:');
      console.log('='.repeat(80));
      
      const stats = {
        withInTraffic: linkProperties.filter((l: any) => l.InTraffic || l.inTraffic).length,
        withOutTraffic: linkProperties.filter((l: any) => l.OutTraffic || l.outTraffic).length,
        withDestProps: linkProperties.filter((l: any) => l.destProps).length,
        withSrcProps: linkProperties.filter((l: any) => l.srcProps).length,
      };
      
      console.log(`   有 InTraffic: ${stats.withInTraffic}/${linkProperties.length}`);
      console.log(`   有 OutTraffic: ${stats.withOutTraffic}/${linkProperties.length}`);
      console.log(`   有 destProps: ${stats.withDestProps}/${linkProperties.length}`);
      console.log(`   有 srcProps: ${stats.withSrcProps}/${linkProperties.length}`);
      console.log('');
      
      // 4. 显示第一条边的完整 JSON（用于分析结构）
      console.log('='.repeat(80));
      console.log('📄 第一条边的完整 JSON 结构:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(linkProperties[0], null, 2));
      console.log('');
      
      // 5. 检查所有边的流量值是否相同
      console.log('='.repeat(80));
      console.log('🔍 检查所有边的流量值是否相同:');
      console.log('='.repeat(80));
      
      const allInTraffic = linkProperties.map((l: any) => l.InTraffic ?? l.inTraffic ?? 'N/A');
      const allOutTraffic = linkProperties.map((l: any) => l.OutTraffic ?? l.outTraffic ?? 'N/A');
      
      const uniqueInTraffic = [...new Set(allInTraffic)];
      const uniqueOutTraffic = [...new Set(allOutTraffic)];
      
      console.log(`   InTraffic 唯一值数量: ${uniqueInTraffic.length}`);
      console.log(`   InTraffic 值: ${uniqueInTraffic.slice(0, 10).join(', ')}${uniqueInTraffic.length > 10 ? '...' : ''}`);
      console.log('');
      console.log(`   OutTraffic 唯一值数量: ${uniqueOutTraffic.length}`);
      console.log(`   OutTraffic 值: ${uniqueOutTraffic.slice(0, 10).join(', ')}${uniqueOutTraffic.length > 10 ? '...' : ''}`);
      console.log('');
      
      if (uniqueInTraffic.length === 1 && uniqueOutTraffic.length === 1) {
        console.log('⚠️  问题确认：所有边的流量值都相同！');
        console.log('   这可能是因为：');
        console.log('   1. OpManager API 返回的流量数据就是相同的');
        console.log('   2. 或者流量数据字段位置不正确（需要从其他属性读取）');
      }
    } else {
      console.log('❌ 没有边数据');
    }
    
  } catch (error: any) {
    console.error('❌ API 调用失败:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data).substring(0, 500));
    }
  }
}

main();
