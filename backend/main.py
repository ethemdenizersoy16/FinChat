from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import llm
import dbsetup


#Database is created at startup
async def lifespan(app: FastAPI):
    dbsetup.db_setup() 
    yield

app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://fin-chat-ui.vercel.app","http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    user_message : str
    session_id : str



#REST Endpoints

#Server status check for development purposes
@app.get("/health")
async def health_check():
    """Simple endpoint to verify the server is running."""
    return {"status": "healthy", "service": "FinChat API"}


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint. 
    Receives user input and history, will eventually orchestrate AI and Finance APIs.
    """
    try:
        user_input = request.user_message
        session_id = request.session_id

        #user message is passed into llm
        return await llm.make_llm_call(user_input, session_id)

    
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(session_id :str):
    """Fetches the entire chat history from SQLite for frontend initialization."""
    try:
        history = dbsetup.read_messages_for_frontend(session_id) 
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))