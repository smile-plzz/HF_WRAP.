import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Proxy endpoint for Hugging Face Inference API
app.post("/api/inference", async (req, res) => {
  const { model, inputs, parameters, task, provider } = req.body;
  const userToken = req.headers["x-hf-token"] as string;
  const HF_TOKEN = (userToken || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();

  if (!model || !inputs) {
    return res.status(400).json({ error: "Missing model or inputs in request body." });
  }

  try {
    console.log(`[HF_REQUEST] Model: ${model} | Task: ${task || 'AUTO'} | Provider: ${provider || 'DEFAULT'}`);
    
    const body: any = {
      inputs,
      parameters: {
        ...parameters,
        wait_for_model: true
      }
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-wait-for-model": "true",
      "x-use-cache": "true",
      "User-Agent": "HF-Inference-App/1.0"
    };

    if (HF_TOKEN) {
      headers["Authorization"] = `Bearer ${HF_TOKEN}`;
    }

    if (task) {
      // Modern Inference Providers (Together, Fireworks, etc.) use x-inference-task
      headers["x-inference-task"] = task;
      // Some legacy or model-specific endpoints prefer it in the body
      body.task = task;
    }

    if (provider && provider !== "hf-inference") {
      headers["x-inference-provider"] = provider;
    }

    // Determine target endpoint. 
    // router.huggingface.co is prioritized as it demonstrates better connectivity from this environment's IP range.
    const targetUrl = `https://router.huggingface.co/models/${model}`;
    
    console.log(`[HF_TRY] Attempting server-mediated bridge: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Determine if we should handle as binary/image
    const contentType = response.headers.get("content-type") || "";
    const isImage = contentType.includes("image/");

    if (isImage) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return res.json({ 
        image: `data:${contentType};base64,${base64}`,
        contentType 
      });
    }

    const text = await response.text();
    let data: any;
    
    try {
      if (contentType.includes("application/json")) {
        data = JSON.parse(text);
      } else {
        data = { text };
      }
    } catch (e) {
      data = { text };
    }

    if (!response.ok) {
      console.error(`[HF_ERROR] Status: ${response.status} | Model: ${model}`);
      console.error(`[HF_ERROR_BODY] ${text.substring(0, 200)}`);
      
      let errorMessage = "Unknown error from Hugging Face API.";
      if (data.error) errorMessage = data.error;
      else if (Array.isArray(data) && data[0]?.error) errorMessage = data[0].error;
      else if (data.message) errorMessage = data.message;
      
      return res.status(response.status).json({ 
        error: errorMessage,
        status: response.status,
        model,
        task,
        provider,
        details: data.warnings || data.message || "Check your credentials or model availability."
      });
    }

    console.log(`[HF_RESPONSE] Success for ${model}`);
    return res.json(data);
  } catch (error: any) {
    console.error(`[HF_ERROR] Model: ${model} | Task: ${task || 'AUTO'}`);
    console.error(`[HF_ERROR_MSG] ${error.message}`);
    if (error.status) console.error(`[HF_ERROR_STATUS] ${error.status}`);
    if (error.cause) console.error(`[HF_ERROR_CAUSE] ${error.cause.message || error.cause}`);
    
    // Better error message for connectivity or domain issues
    let errorMessage = error.message || "Failed to fetch from Hugging Face API.";
    if (errorMessage.includes("ENOTFOUND")) {
      errorMessage = "Network Error: Could not resolve Hugging Face API domain. This may be a temporary DNS issue or network restriction.";
    }

    return res.status(error.status || 500).json({ 
      error: errorMessage,
      status: error.status,
      model,
      task,
      details: error.cause?.message || "Verify your HF_TOKEN and model ID."
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
