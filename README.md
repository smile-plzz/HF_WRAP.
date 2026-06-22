# HF_WRAP.

A high-performance, polished neural interface for interacting with the **Hugging Face Inference API**. This application provides a secure bridge to thousands of open-source models with integrated support for text generation, summarization, translation, and sentiment analysis.

## 🚀 Key Features

- **Neural Bridge Architecture**: Secure Express-mediated proxy to bypass standard network restrictions and handle authentication seamlessly.
- **Provider Optimization**: Automatically routes requests through optimized endpoints (`router.huggingface.co`) to ensure maximum uptime and connectivity.
- **Multi-Task Support**: Pre-configured templates for Text Generation, Summarization, Translation, and Classification.
- **Dynamic Auth**: Support for both system-level environment tokens and session-specific user access tokens.
- **Glassmorphic UI**: A dark, high-contrast interface designed for focus and technical precision.

## 🛠 Architecture

### Backend (Express)
The server acting as a "Neural Inference Bridge" handles:
- **Token Management**: Prioritizes user-supplied tokens from the frontend over system environment variables.
- **Endpoint Fallback**: Specifically utilizes the Hugging Face Router endpoint to maintain stability in restricted networking environments.
- **Wait-for-Model Logic**: Automatically includes headers to handle cold-starts of serverless inference endpoints.

### Frontend (React + Tailwind)
- **State Management**: Real-time tracking of inference latency and model status.
- **Response Formatting**: Intelligent parsing of diverse Hugging Face return signatures across different model tasks.
- **Responsive Layout**: Designed for both desktop precision and mobile accessibility.

## 🔑 Setup

1. **Get a Token**: Visit [Hugging Face Settings](https://huggingface.co/settings/tokens) and create a token with `read` permissions.
2. **Environment Variables**:
   Add to your `.env`:
   ```env
   HF_TOKEN=your_token_here
   ```
3. **Usage**:
   - Select a model from the curated list or enter a custom HF repository ID.
   - Adjust `Temperature` and `Max Tokens` using the glass sliders.
   - Enter your prompt and observe the real-time inference bridge in action.

## 📡 Optimized Routing

The application utilizes `https://router.huggingface.co` as its primary gateway. This ensures that models hosted by partner providers (like Together AI or Fireworks) are reachable through the same unified interface as standard Inference API models.
