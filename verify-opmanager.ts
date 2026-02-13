
// Set env vars before import (使用 Object.assign 避免只读属性错误)
Object.assign(process.env, {
  OPMANAGER_BASE_URL: 'http://124.71.204.145:8060',
  OPMANAGER_API_KEY: 'd1fb36f09d460e2319bb953b543e317a',
  OPMANAGER_TIMEOUT: '10000',
  NODE_ENV: 'production' // Force production to avoid mock
});

import { opClient } from '@/services/opmanager/client';

async function main() {
    try {
        console.log('Testing Devices API...');
        const devices = await opClient.getDevices();
        console.log(`Devices found: ${devices.length}`);
        if (devices.length > 0) {
            console.log('First device sample:', JSON.stringify(devices[0], null, 2));
        } else {
            console.log('No devices found.');
        }

        console.log('\n----------------------------------------\n');

        console.log('Testing Alarms API...');
        const alarms = await opClient.getAlarms();
        console.log(`Alarms found: ${alarms.length}`);
        if (alarms.length > 0) {
            console.log('First alarm sample:', JSON.stringify(alarms[0], null, 2));
        } else {
            console.log('No alarms found.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}
main();
