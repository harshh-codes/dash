# AI-Powered Data Analyst Platform

This is a modern, full-stack AI data analysis platform with a robust React Dashboard and a FastAPI + LangChain AI backend.

## How to Run the Project

You will need **two separate terminals** running simultaneously to operate the platform (one for the frontend, one for the backend).

### 1. Start the Backend API (FastAPI)
The backend powers the file uploading, data processing (Pandas), and AI interactions.

Open a terminal at your root project folder (`Dash/`) and run:
```bash
cd backend

# If on Windows:
.\venv\Scripts\activate
# If on Mac/Linux:
# source venv/bin/activate

# Start the server
uvicorn main:app --reload
```
*The API will start at http://localhost:8000*

*(Note: If you haven't installed dependencies yet, run `pip install -r requirements.txt` while the virtual environment is activated before starting uvicorn).*

### 2. Start the Frontend App (React/Vite)
The frontend powers the beautiful glassmorphic UI.

Open a *second* terminal at your root project folder (`Dash/`) and run:
```bash
cd frontend

# Start the Vite development server
npm run dev
```
*The app will start at http://localhost:5173*

---

### Accessing the App
Once both servers are running:
1. Open your browser and go to **[http://localhost:5173](http://localhost:5173)**
2. Drag and drop the provided `test_data.csv` file into the upload area.
3. You should see the dashboard populate automatically! In the future, you can add an `OPENAI_API_KEY` to the backend `.env` file to unlock actual LLM answers.
