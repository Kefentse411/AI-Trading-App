# AlgoEdge

AlgoEdge is a full-stack algorithmic trading assistant that combines real-time market data, machine learning predictions, and an AI-powered chat assistant into a single platform. It analyzes forex and crypto instruments, generates directional bias predictions with supporting explanations, and surfaces relevant trading context — all through a clean web interface with live charting, news, and trade journaling.

Built solo, with no prior experience in several of these technologies, using AI-assisted development to accelerate learning while maintaining a deep understanding of the underlying architecture.

## Features

- 📈 **Live Market Data** — Real-time and historical price data via yFinance
- 🤖 **ML-Powered Predictions** — GradientBoostingClassifier model predicts directional bias and classifies trading signals for forex and crypto instruments
- 🧠 **AI Trading Assistant** — Conversational assistant (powered by Groq's LLM API) that combines live predictions and trend-following strategy data to answer user questions in natural language
- 📊 **Live Charting** — Interactive price charts for the selected instrument
- 📰 **News Integration** — Surfaces relevant news for upcoming events affecting the instrument
- 📓 **Trade Journaling** — Users can log and track their own trades over time
- ⭐ **Watchlist** — Track multiple forex instruments in one place
- 📉 **Trend-Following Strategy Signals** — Dedicated endpoint analyzing trend-following strategy performance per instrument
- 🔁 **Model Feedback & Retraining** — Built-in endpoints to submit feedback and retrain the model, plus a model info endpoint for transparency into what's running in production
- 🔐 **Authentication** — Magic link login with admin verification
- 💬 **Resilient Design** — The assistant gracefully degrades if the ML backend is unavailable, rather than crashing outright

## Architecture

AlgoEdge is a two-service application:

- **Frontend (Next.js):** Handles the UI, authentication, charting, news, journaling, and watchlist features. Acts as a backend-for-frontend (BFF) layer, proxying prediction requests to the Python ML service via REST API calls (plain HTTP, no WebSockets).
- **ML Backend (FastAPI):** A single FastAPI service exposing endpoints for forex and crypto predictions, trend-following strategy analysis, model feedback, retraining, and health/metrics monitoring.

**Example request flow:**
```
Next.js route (/api/forex/predict)
    → fetch() → FastAPI (/predict/forex/{symbol})
    → GradientBoostingClassifier model
    → JSON response with prediction + explanation
```

The AI assistant feature (`/api/assistant/chat`) calls both the prediction and strategy endpoints in parallel (`Promise.allSettled`), then feeds the combined context into Groq's LLM API to generate a natural-language response. If the ML backend is unreachable, the assistant still responds using a fallback context rather than failing completely.

### API Endpoints (FastAPI backend)

| Endpoint | Purpose |
|---|---|
| `/predict/forex/{symbol}` | Get directional prediction for a forex pair |
| `/predict` | Get prediction for crypto instruments |
| `/watchlist/forex` | Manage forex watchlist |
| `/strategies/trend-following/{symbol}` | Trend-following strategy signal analysis |
| `/feedback` | Submit feedback on prediction accuracy |
| `/retrain` | Trigger model retraining |
| `/model/info` | View current model metadata |
| `/metrics` | View model/service performance metrics |
| `/health` | Health check endpoint |

## Tech Stack

- **Frontend:** Next.js (React), TypeScript, HTML, CSS
- **Backend (BFF):** Next.js API routes
- **ML Service:** Python, FastAPI, Uvicorn
- **Machine Learning:** Scikit-learn (GradientBoostingClassifier, StandardScaler), Pandas, NumPy
- **AI Assistant:** Groq LLM API
- **Data Sources:** yFinance, FRED API (economic data)
- **Authentication:** Magic link-based login with admin verification

## Project Structure

```
AlgoEdge/
├── backend/              # Python FastAPI ML service
│   ├── server.py         # Main API entry point
│   ├── requirements.txt
│   ├── models/saved/     # Trained ML models (.joblib)
│   ├── debug/            # Debugging/exploration scripts
│   └── src/
│       ├── ml/           # Prediction models, training scripts
│       ├── strategies/   # Trend-following strategy logic
│       ├── utils/        # Data collectors, database utilities
│       └── inference/    # Prediction inference logic
├── src/                  # Next.js frontend
├── package.json
├── README.md
└── .gitignore
```

## Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- A Groq API key ([console.groq.com](https://console.groq.com))

### 1. Clone the repository
```bash
git clone https://github.com/Kefentse411/AI-Trading-App.git
cd AI-Trading-App
```

### 2. Set up the Python ML backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```
The FastAPI service will run at `http://localhost:8000`. Verify it's running by visiting `http://localhost:8000/health`.

### 3. Set up the Next.js frontend
In a **separate terminal**, from the project root:
```bash
npm install
```

Copy the example environment file and fill in your actual API keys:
```bash
cp .env.example.txt .env.local
```

Then start the development server:
```bash
npm run dev
```

### 4. Open the app
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** Both services must be running simultaneously. The Python backend must be live on port 8000 for predictions and the AI assistant to function correctly.

## Screenshots

> *(Add screenshots here once available — see instructions below)*

| Login Page | Dashboard | AI Assistant |
|---|---|---|
| *screenshot* | *screenshot* | *screenshot* |

## What I Learned

Building AlgoEdge independently, with no prior experience in several of these technologies, involved:

- Designing a multi-service architecture with a clear separation between frontend (Next.js) and ML backend (FastAPI)
- Training and serving a machine learning classification model (GradientBoostingClassifier) via a REST API
- Integrating a third-party LLM API (Groq) to build a context-aware conversational assistant
- Handling partial failure gracefully using `Promise.allSettled` so the app degrades rather than crashes when a service is down
- Implementing authentication flows including magic links and admin verification
- Managing environment variables and secrets securely across a multi-service application
- Using AI-assisted development to accelerate learning while still understanding and being able to explain every part of the system

## Disclaimer

This project is for educational and portfolio purposes only. It does not constitute financial advice, and predictions generated by the ML model should not be used for actual trading decisions.

## Author

**Kefentse Charlie**
[LinkedIn](https://www.linkedin.com/in/kefentse-charlie-612143260) | [GitHub](https://github.com/Kefentse411)