export interface InferenceRequest {
  model: string;
  inputs: string;
  task?: string;
  provider?: string;
  parameters?: Record<string, any>;
}

export interface InferenceResponse {
  generated_text?: string;
  error?: string;
  [key: string]: any;
}

export interface ModelOption {
  id: string;
  name: string;
  type: string;
  task: string;
  provider?: string;
}

export interface HistoryItem {
  prompt: string;
  response: any;
  model: string;
  timestamp: string;
  id: string;
}

export const POPULAR_MODELS: ModelOption[] = [
  { id: "mistralai/Mistral-7B-Instruct-v0.2", name: "Mistral 7B Instruct", type: "text", task: "text-generation", provider: "hf-inference" },
  { id: "google/gemma-2-2b-it", name: "Gemma 2 2B", type: "text", task: "text-generation", provider: "hf-inference" },
  { id: "facebook/bart-large-cnn", name: "BART Summarization", type: "text", task: "summarization", provider: "hf-inference" },
  { id: "Helsinki-NLP/opus-mt-en-fr", name: "EN to FR Translation", type: "translation", task: "translation", provider: "hf-inference" },
  { id: "black-forest-labs/FLUX.1-dev", name: "FLUX.1 Dev (Image)", type: "image", task: "text-to-image", provider: "hf-inference" },
  { id: "stabilityai/stable-diffusion-3-medium-diffusers", name: "Stable Diffusion 3", type: "image", task: "text-to-image", provider: "hf-inference" },
  { id: "distilbert-base-uncased-sst-2-english", name: "Sentiment Analysis", type: "text", task: "text-classification", provider: "hf-inference" }
];
