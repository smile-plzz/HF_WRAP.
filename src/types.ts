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

export const POPULAR_MODELS: ModelOption[] = [
  { id: "mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral 7B Instruct", type: "text", task: "text-generation", provider: "hf-inference" },
  { id: "google/gemma-2-2b-it", name: "Gemma 2 2B", type: "text", task: "text-generation", provider: "hf-inference" },
  { id: "facebook/bart-large-cnn", name: "BART Summarization", type: "text", task: "summarization", provider: "hf-inference" },
  { id: "Helsinki-NLP/opus-mt-en-fr", name: "EN to FR Translation", type: "translation", task: "translation", provider: "hf-inference" },
  { id: "distilbert-base-uncased-sst-2-english", name: "Sentiment Analysis", type: "text", task: "text-classification", provider: "hf-inference" }
];
