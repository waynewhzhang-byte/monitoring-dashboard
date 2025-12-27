process.env.OPMANAGER_BASE_URL = "http://124.71.204.145:8060";
process.env.OPMANAGER_API_KEY = "d1fb36f09d460e2319bb953b543e317a";

import axios from 'axios';

const deviceName = 'ecs-124-71-204-145.compute.hwclouds-dns.com';

async function testAPIs() {
    const baseURL = process.env.OPMANAGER_BASE_URL;
    const apiKey = process.env.OPMANAGER_API_KEY;

    console.log('=== Testing OpManager APIs for Device Metrics ===\n');

    // Test 1: getInfrastructureDetailsView
    try {
        console.log('1. Testing getInfrastructureDetailsView...');
        const response1 = await axios.get(`${baseURL}/api/json/device/getInfrastructureDetailsView`, {
            params: { apiKey }
        });
        console.log('Response:', JSON.stringify(response1.data, null, 2));
        console.log('\n');
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        console.log('\n');
    }

    // Test 2: getDeviceInfo
    try {
        console.log(`2. Testing getDeviceInfo for ${deviceName}...`);
        const response2 = await axios.get(`${baseURL}/api/json/device/getDeviceInfo`, {
            params: { apiKey, deviceName }
        });
        console.log('Response:', JSON.stringify(response2.data, null, 2));
        console.log('\n');
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        console.log('\n');
    }

    // Test 3: getDeviceCompleteDetails
    try {
        console.log(`3. Testing getDeviceCompleteDetails for ${deviceName}...`);
        const response3 = await axios.get(`${baseURL}/api/json/v2/device/getDeviceCompleteDetails`, {
            params: { apiKey, name: deviceName }
        });
        console.log('Response:', JSON.stringify(response3.data, null, 2));
        console.log('\n');
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        console.log('\n');
    }

    // Test 4: getDeviceSummary
    try {
        console.log(`4. Testing getDeviceSummary for ${deviceName}...`);
        const response4 = await axios.get(`${baseURL}/api/json/device/getDeviceSummary`, {
            params: { apiKey, name: deviceName }
        });
        console.log('Response:', JSON.stringify(response4.data, null, 2));
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testAPIs();
