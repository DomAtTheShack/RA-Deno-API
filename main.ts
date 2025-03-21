/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { ensureDir, exists } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";

const UPLOAD_DIR = "./uploads";

// Ensure the uploads directory exists
await ensureDir(UPLOAD_DIR);

let dataStore = {
  coordinates: [69, 69],
  label1Text: "Hello",
  label2Text: "World",
  zoomLevel: 10,
  imageUrl: "", // Store image filename
};

let newImageAvailable = false; // Track if a new image has been uploaded
let lastUploadedFile = ""; // Store the last uploaded image filename

// Add CORS headers function
function withCORS(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

serve(async (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.split("/").pop() || "";
  const uploadPath = url.pathname;

  // Serve uploaded images
  if (uploadPath.startsWith("/uploads/")) {
    const filePath = `${UPLOAD_DIR}/${path.split("/").pop()}`;
    try {
      const fileResponse = await serveFile(request, filePath);
      fileResponse.headers.set("Access-Control-Allow-Origin", "*");
      return fileResponse;
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }

  // Handle OPTIONS request for preflight
  if (request.method === "OPTIONS") {
    return withCORS(new Response(null, { status: 204 }));
  }

  // Upload image at /api/upload
  if (path === "upload" && request.method === "POST") {
    try {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;

      if (!file) {
        return withCORS(new Response(JSON.stringify({ error: "No image provided" }), { status: 400 }));
      }

      // Delete the old image before saving a new one
      if (lastUploadedFile) {
        const oldFilePath = `${UPLOAD_DIR}/${lastUploadedFile}`;
        if (await exists(oldFilePath)) {
          await Deno.remove(oldFilePath);
        }
      }

      // Save the new image
      const filename = `${Date.now()}-${file.name}`;
      const filePath = `${UPLOAD_DIR}/${filename}`;
      const fileBytes = new Uint8Array(await file.arrayBuffer());

      await Deno.writeFile(filePath, fileBytes);

      lastUploadedFile = filename;
      dataStore.imageUrl = `/uploads/${filename}`;
      newImageAvailable = true; // Mark new image as available

      return withCORS(new Response(JSON.stringify({ success: true, imageUrl: dataStore.imageUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    } catch (error) {
      return withCORS(new Response(JSON.stringify({ error: "File upload failed" }), { status: 500 }));
    }
  }

  // Update data at /api/update
  if (path === "update" && request.method === "POST") {
    try {
      const body = await request.json();
      const { coordinates, label1Text, label2Text, zoomLevel } = body;

      if (!coordinates || !label1Text || !label2Text || zoomLevel === undefined) {
        return withCORS(new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 }));
      }

      // deno-lint-ignore no-inner-declarations
      var imageUrl = dataStore.imageUrl;
      dataStore = { coordinates, label1Text, label2Text, zoomLevel, imageUrl };

      return withCORS(new Response(JSON.stringify({ success: true, data: dataStore }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    } catch (error) {
      return withCORS(new Response(JSON.stringify({ error: "Invalid JSON format" }), { status: 400 }));
    }
  }

  // Update data at /api/image-got
  if (path === "image-got" && request.method === "POST") {
    try {
      const body = await request.json();
      const { imageReceived: imageReceived } = body;

      if (!imageReceived === undefined) {
        return withCORS(new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 }));
      }

      if(imageReceived) {
        newImageAvailable = false;
      }

      return withCORS(new Response(JSON.stringify({ success: true, data: dataStore }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    } catch (error) {
      return withCORS(new Response(JSON.stringify({ error: "Invalid JSON format" }), { status: 400 }));
    }
  }

  // Get data at /api/get
  if (path === "get" && request.method === "GET") {
    //newImageAvailable = false; // Reset the flag since the image has been accessed

    return withCORS(new Response(JSON.stringify(dataStore), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }

  // Check if there is a new image available
  if (path === "new-image" && request.method === "GET") {
    return withCORS(new Response(JSON.stringify({ newImageAvailable }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }

  return withCORS(new Response("Unsupported method or endpoint", { status: 405 }));
});
