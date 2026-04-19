import sqlite3
import json
from pathlib import Path 

db_path = Path(__file__).parent.parent / "data" / "chat_history.db" 

def db_setup():
    
    conn = sqlite3.connect(db_path)
    curs = conn.cursor()
    
    curs.execute("""CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,   
    role TEXT NOT NULL,          
    content TEXT NOT NULL,
    chart_data TEXT,    
    chart_string TEXT, 
    session_id TEXT NOT NULL,  
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)""")
    
    conn.commit()
    conn.close()

def save_message(role : str, content:str, chart_data:dict = None, chart_string:str = "", session_id:str = ""):
    conn = sqlite3.connect(db_path)
    curs = conn.cursor()

    chart_json = json.dumps(chart_data) if chart_data else None

    curs.execute("INSERT INTO messages (role,content,chart_data,chart_string, session_id) VALUES (?, ?, ?, ?, ?)",(role,content,chart_json, chart_string, session_id))
    conn.commit()
    conn.close()



def read_messages_for_llm(session_id : str = "") -> list:
    """The 'Diet' query. Excludes chart_data completely."""
    conn = sqlite3.connect(db_path)
    curs = conn.cursor()
    curs.execute("SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC",(session_id,))
    
    return [{"role": row[0], "content": row[1]} for row in curs.fetchall()]


def read_messages_for_frontend(session_id : str = "") -> list:
    """The 'Fat' query. Pulls everything for React hydration."""
    conn = sqlite3.connect(db_path)
    curs = conn.cursor()
    curs.execute("SELECT id, role, content, chart_data, chart_string, created_at FROM messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
    rows = curs.fetchall()
        
    history = []
    for row in rows:
            parsed_charts = json.loads(row[3]) if row[3] else None
            
            history.append({
                "id": row[0],
                "role": row[1],
                "content": row[2],
                "chart_data": parsed_charts,
                "chart_string": row[4],
                "created_at": row[5]
            })
    return history