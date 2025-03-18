/// <reference lib="deno.ns" />

let dataStore = { coordinates: [0, 0], label1Text: "", label2Text: "", zoomLevel: 0 };

// Add CORS headers function
function withCORS(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.split("/").pop() || "";

  // Handle OPTIONS request for preflight
  if (request.method === "OPTIONS") {
    return withCORS(new Response(null, { status: 204 }));
  }

  // Update data at /apt/update
  if (path === "update" && request.method === "POST") {
    try {
      const body = await request.json();
      const { coordinates, label1Text, label2Text, zoomLevel } = body;

      // Validate input (you can add more validation logic here if needed)
      if (!coordinates || !label1Text || !label2Text || zoomLevel === undefined) {
        return withCORS(new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }));
      }

      // Update the in-memory data store
      dataStore = { coordinates, label1Text, label2Text, zoomLevel };

      return withCORS(new Response(JSON.stringify({ success: true, data: dataStore }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    } catch (error) {
      return withCORS(new Response(JSON.stringify({ error: "Invalid JSON format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }));
    }
  }

  // Get data at /apt/get
  if (path === "get" && request.method === "GET") {
    return withCORS(new Response(JSON.stringify(dataStore), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }

  // Handle unsupported methods or paths
  return withCORS(new Response("Unsupported method or endpoint", { status: 405 }));
});
