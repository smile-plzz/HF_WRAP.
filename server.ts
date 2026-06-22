import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { HfInference } from "@huggingface/inference";

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
      "X-Wait-For-Model": "true",
      "x-use-cache": "true"
    };

    if (task) {
      body.task = task;
      headers["x-inference-task"] = task;
      // Some providers also want it in the parameters
      body.parameters = {
        ...body.parameters,
        task: task
      };
    }

    if (provider && provider !== "hf-inference") {
      headers["x-inference-provider"] = provider;
    }

    // Try primary endpoint
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (fetchErr: any) {
      console.error(`[HF_PRIMARY_FAILED] ${fetchErr.message}`);
      
      // Fallback to alternative domain if it's a DNS issue
      if (fetchErr.message.includes("ENOTFOUND") || fetchErr.message.includes("fetch failed")) {
        const fallbackUrl = `https://api.huggingface.co/models/${model}`;
        console.log(`[HF_FALLBACK_TRYING] ${fallbackUrl}`);
        response = await fetch(fallbackUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      } else {
        throw fetchErr;
      }
    }

    const data = await response.json();

    if (!response.ok) {
      console.error(`[HF_ERROR] Status: ${response.status} | Model: ${model}`);
      
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

// Network test endpoint
app.get("/api/test-network", async (req, res) => {
  try {
    const urls = [
      "https://www.google.com",
      "https://huggingface.co",
      "https://api-inference.huggingface.co",
      "https://api.huggingface.co"
    ];
    
    const results: any = {};
    for (const url of urls) {
      try {
        const resp = await fetch(url, { method: "HEAD" });
        results[url] = { status: resp.status, ok: resp.ok };
      } catch (e: any) {
        results[url] = { error: e.message, code: e.code };
      }
    }
    
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
