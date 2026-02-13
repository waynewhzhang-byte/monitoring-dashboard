// @ts-nocheck
// using native fetch in Node 18+

async function verifyTopology() {
    const baseUrl = 'http://localhost:3000'; // Adjust port if needed
    try {
        console.log('Testing GET /api/topology (Global View)...');
        const res = await fetch(`${baseUrl}/api/topology`);

        if (!res.ok) {
            console.error(`Request failed with status: ${res.status}`);
            console.error(await res.text());
            return;
        }

        const data = await res.json();
        console.log('Response received.');
        console.log(`Nodes count: ${data.nodes?.length}`);
        console.log(`Edges count: ${data.edges?.length}`);
        console.log('Camera:', data.camera ? 'Present' : 'Null (Expected for Global)');

        if (data.nodes && data.nodes.length > 0) {
            console.log('SUCCESS: Global View returns nodes.');
        } else {
            console.log('WARNING: Global View returned 0 nodes. (This might be normal if DB is empty, but different from "disappearing" issue if data exists)');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

verifyTopology();
