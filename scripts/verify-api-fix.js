const { OpManagerClient } = require('./src/services/opmanager/client');
require('dotenv').config();

async function testApi() {
  const client = new OpManagerClient();
  
  // Use one of the real opmanagerIds we found
  const realName = "10.141.138.95.10000000041";
  const ip = "10.141.138.95";
  const constructedName = `${ip}.10000000001`;
  
  console.log(`--- Testing with real name: ${realName} ---`);
  try {
    // We need to bypass the current getInterfaces logic which only takes IP
    // For this test, I'll use the internal axios client
    const response = await client.client.get('/api/json/device/getInterfaces', {
      params: { name: realName }
    });
    console.log(`Success! Status: ${response.status}`);
    console.log(`Interfaces found: ${response.data?.interfaces?.length || 0}`);
  } catch (error) {
    console.log(`Failed with real name: ${error.message}`);
  }
  
  console.log(`\n--- Testing with constructed name: ${constructedName} ---`);
  try {
    const response = await client.client.get('/api/json/device/getInterfaces', {
      params: { name: constructedName }
    });
    console.log(`Success! Status: ${response.status}`);
    console.log(`Interfaces found: ${response.data?.interfaces?.length || 0}`);
  } catch (error) {
    console.log(`Failed with constructed name: ${error.message}`);
  }
}

testApi();
