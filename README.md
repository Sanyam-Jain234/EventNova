# EventNova

EventNova is an AI assisted event organizer and discovery platform built with Next.js, Clerk, and Convex. It supports event creation, registration management, device uploaded event covers, local Ollama event generation, and live event search with Tavily.

## Local development

Install dependencies and start the Next.js and Convex development processes:

```bash
npm install
npm run dev
npx convex dev
```

Configure the Clerk and Convex environment variables for your development instances. Live event search also uses `TAVILY_API_KEY`. AI event generation uses a local Ollama server with the `qwen3:4b` model; Ollama should be available at `http://127.0.0.1:11434`.
