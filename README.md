# 💹 FinChat: Agentic Cryptocurrency Assistant

FinChat is a full-stack, AI-powered financial assistant that provides real-time cryptocurrency data and interactive historical market charts. Built with a React/Vite frontend and a Python/FastAPI backend, it utilizes Anthropic's Claude API to process natural language queries and autonomously trigger backend financial tools.

## ✨ Key Features

* **Conversational AI:** A natural, chat-based interface that maintains context and refuses non-financial topics via strict system guardrails.
* **Autonomous Tool Calling:** The LLM dynamically triggers Python backend functions (`get_live_price`, `get_price_history`) based on user intent.
* **Interactive Charting:** Dynamically renders historical price data using `Recharts` directly within the chat feed.
* **Multi-Tenant Sessions:** Generates and stores unique session IDs via `localStorage`, allowing multiple users to maintain private, persistent chat histories simultaneously.
* **State Hydration:** Frontend automatically fetches and restores chat history upon page refresh.
* **Mobile-First UI:** A responsive, modern interface built with standard React and CSS/Tailwind principles.

## 🏗️ Architecture & Engineering Highlights

This project overcomes several classic Large Language Model (LLM) and full-stack engineering hurdles:

1. **The "Context Diet" & Relational Data Split:** To prevent the LLM from "hallucinating" chart data based on its past memory, the SQLite database utilizes a relational split. The LLM is fed a "diet" context (pure text), forcing it to re-trigger the API tool for fresh data every time a chart is requested. Meanwhile, the React frontend is fed the full context (including hidden JSON chart arrays and text summaries) to perfectly hydrate the UI.
2. **Secure Multi-Tenancy:** The application supports multiple concurrent users from a single SQLite table. The React frontend generates a `crypto.randomUUID()` that is passed as a query parameter and JSON body payload to the FastAPI backend. The database layer utilizes parameterized SQL queries (`?`) to map messages to specific sessions while strictly preventing SQL Injection (SQLi) vulnerabilities.
3. **Forced Tool Execution:** Bypasses typical AI "laziness" through strict JSON schema requirements and programmatic intent-routing, guaranteeing the UI receives the correct array structures to render graphs.
4. **Markdown Interpretation:** The React frontend utilizes `react-markdown` to safely parse and style the LLM's raw text outputs into readable lists, bold text, and headers.

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* TypeScript / JavaScript
* Recharts (Data Visualization)
* Vercel (Deployment)

**Backend:**
* Python
* FastAPI
* SQLite3
* Anthropic Claude API (`claude-3-5-haiku-20241022`)
* Render (Deployment)

---

## 🚀 Local Setup Instructions

### 1. Prerequisites
* Node.js and npm installed
* Python 3.9+ installed
* An Anthropic API Key
* A CoinGecko API Key

### 2. Backend Setup
Navigate to your backend directory:

```bash
# Create and activate a virtual environment
python -m venv venv

# On Mac/Linux:
source venv/bin/activate  
# On Windows: 
venv\Scripts\activate

# Install all required dependencies
pip install -r requirements.txt

# Set up your environment variables
# 1. Copy the example file to create your active .env file
cp .env.example .env 
```

Once your `.env` file is created, open it in your code editor and add your actual API keys:

```env
ANTHROPIC_API_KEY=your_anthropic_key_here
COINGECKO_API_KEY=your_coingecko_key_here
```

Run the FastAPI server:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
Open a new terminal and navigate to your frontend directory:

```bash
# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

The application will now be running locally at `http://localhost:5173`.

---

## 🌐 Deployment Links

* **Live Application:** [Insert Vercel Link Here]
* **Backend API Base URL:** [Insert Render Link Here]

*(Note: The backend is hosted on a free Render tier. It may take 30-60 seconds to spin up from sleep upon the first request. The SQLite database is ephemeral in this hosted environment and resets upon server sleep).*