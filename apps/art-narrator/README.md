# Prompt Narrator

An AI-powered prompt generator for creating detailed and professional prompts for Large Language Models (LLMs).

## Getting Started

To run this project locally:

```sh
# Clone the repository
git clone https://github.com/aajunior43/art-narrator.git

# Navigate to the project directory
cd art-narrator

# Install dependencies
npm install

# Start the development server
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Features

- 🧠 AI-powered prompt generation using Google Gemini API
- 💬 Professional-grade prompts for LLMs (Large Language Models)
- 🎯 8 specialized categories (Writing, Analysis, Coding, etc.)
- 💾 Local storage for saved prompts
- 📱 Responsive design for all devices
- ✨ Modern glassmorphism UI design

## Configuration

1. Copy the environment file:
```sh
cp .env.example .env
```

2. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

3. Add your API key to the `.env` file:
```
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

Note: The application will work with fallback prompts even without an API key, but for best results, configure the Gemini API.
