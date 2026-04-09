# Project Velox

A venue operations and customer experience platform for cocktail bars. Customers discover personalized cocktails through an interactive taste profiling system powered by GPT, while staff manage inventory, sales, and menu publishing from a unified dashboard.

## Tech Stack

- **Frontend:** React 18, React Router, Vite
- **Backend:** Express, Node.js
- **AI:** OpenAI GPT (cocktail recommendations), DALL-E (cocktail imagery)
- **Data:** XLSX parsing for inventory/sales, JSON for customer accounts and recipes

## Getting Started

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
npm install
```

### Environment Setup

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and set your `OPENAI_API_KEY`.

### Running Locally

Start both the API server and Vite dev server:

```bash
npm run dev:all
```

- Frontend: [http://localhost:8000](http://localhost:8000)
- API: [http://localhost:3001](http://localhost:3001)

Or run them separately:

```bash
npm run server   # Express API on port 3001
npm run dev      # Vite dev server on port 8000
```

### Building for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route-level page components
│   ├── services/           # API client layer
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Frontend utilities
│   ├── constants/          # Shared constants
│   ├── App.jsx             # Router and auth shell
│   └── main.jsx            # Entry point
├── server/                 # Express backend
│   ├── routes/             # API route handlers
│   ├── utils/              # Server utilities
│   ├── config/             # Path and env config
│   ├── db/                 # Customer data store
│   ├── gpt.js              # OpenAI integration
│   ├── recipeRanking.js    # Deterministic recipe scoring
│   └── index.js            # Server entry point
├── styles/                 # CSS (base tokens, glass UI, customer theme)
├── data/                   # GPT prompts, LLM-ready recipe data
├── assets/                 # Static images
├── index.html              # HTML shell
├── vite.config.js          # Vite configuration
└── package.json
```

## Key Features

- **Customer Taste Profiling** — multi-axis sliders for sweetness, sourness, bitterness, mouthfeel, aroma, mood, and adventurousness
- **GPT Cocktail Recommendations** — personalized drink suggestions with ratings, recipes, and customizations
- **Mocktail Support** — dedicated non-alcoholic recommendation engine
- **DALL-E Cocktail Imagery** — AI-generated drink artwork in an oil-painting style
- **Staff Dashboard** — inventory tracking, sales reporting, and menu management
- **Customer Accounts** — phone-based login with saved collections and order history
