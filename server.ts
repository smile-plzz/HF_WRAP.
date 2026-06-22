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
  const HF_TOKEN = userToken || process.env.HF_TOKEN;

  if (!HF_TOKEN) {
    return res.status(401).json({ 
      error: "HF_TOKEN not found.", 
      details: "Please provide a token in the UI or ensure the server is configured with a system-level key." 
    });
  }

  if (!model || !inputs) {
    return res.status(400).json({ error: "Missing model or inputs in request body." });
  }

  try {
    console.log(`[HF_REQUEST] Model: ${model} | Task: ${task || 'AUTO'} | Provider: ${provider || 'DEFAULT'}`);
    
    // api-inference.huggingface.co is the official endpoint.
    // router.huggingface.co is kept as a fallback if DNS fails for the primary.
    const url = `https://api-inference.huggingface.co/models/${model}`;
    const body: any = {
      inputs,
      parameters: {
        ...parameters,
        wait_for_model: true
      }
    };

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
      "x-wait-for-model": "true",
      "x-use-cache": "true"
    };

    if (task) {
      // Modern Inference Providers (Together, Fireworks, etc.) use x-inference-task
      headers["x-inference-task"] = task;
      // Some legacy or model-specific endpoints prefer it in the body
      body.task = task;
    }

    if (provider && provider !== "hf-inference") {
      headers["x-inference-provider"] = provider;
    }

    // Attempt inference with automated fallback for network resilience
    // api-inference.hf.co is used as a reliable alternative to .huggingface.co in some environments
    const endpoints = [
      `https://api-inference.hf.co/models/${model}`,
      `https://router.huggingface.co/models/${model}`,
      `https://api-inference.huggingface.co/models/${model}`
    ];
    
    let response;
    let lastError: any;

    const isPartnerProvider = provider && provider !== "hf-inference";

    for (const url of endpoints) {
      try {
        // Optimization: If a partner provider is selected, we MUST use the router
        if (isPartnerProvider && !url.includes("router.huggingface.co")) {
          continue;
        }

        console.log(`[HF_TRY] Attempting: ${url}`);
        response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        
        // If we get a response (even if not 2xx), we evaluate if we should continue searching
        if (response.ok) {
          console.log(`[HF_CHECK] Success from ${url}`);
          break;
        }

        // If it's a 404 from the router, it might mean the model isn't available via the router's current provider set
        // We move to next if it's a "model not found" or "provider not found" type error in the fallback chain
        if (response.status === 404 && url.includes("router")) {
           console.log(`[HF_DEBUG] Router 404 for ${model}, trying next...`);
           continue;
        }

        // For 401/403, we break because it's an auth issue, not a routing issue
        if (response.status === 401 || response.status === 403) {
          break;
        }
      } catch (err: any) {
        console.error(`[HF_TRY_FAIL] ${url}: ${err.message}`);
        lastError = err;
      }
    }

    if (!response) {
      throw lastError || new Error("All inference endpoints failed to resolve.");
    }

    let data: any;
    const contentType = response.headers.get("content-type");
    const text = await response.text();
    
    try {
      if (contentType && contentType.includes("application/json")) {
        data = JSON.parse(text);
      } else {
        data = { error: text || `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (e) {
      data = { error: text || `Failed to parse response from Hugging Face (Status: ${response.status})` };
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
