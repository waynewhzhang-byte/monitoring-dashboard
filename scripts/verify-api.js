async function testApi() {
  const viewName = encodeURIComponent('出口业务');
  const url = `http://localhost:3000/api/topology?bvName=${viewName}`;
  console.log(`📡 Fetching: ${url}`);
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`✅ Success!`);
    console.log(`📝 Full Response:`, JSON.stringify(data, null, 2));
    console.log(`📊 Nodes: ${data.nodes?.length}`);
    console.log(`📊 Edges: ${data.edges?.length}`);
    console.log(`📷 Camera: ${JSON.stringify(data.camera)}`);
    
    if (data.nodes && data.nodes.length > 0) {
      console.log(`📍 First Node:`, JSON.stringify(data.nodes[0]));
    }
  } catch (e) {
    console.error(`❌ Failed:`, e);
  }
}

testApi();
