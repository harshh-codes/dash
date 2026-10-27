import os
import pandas as pd
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent

load_dotenv()
df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
agent = create_pandas_dataframe_agent(llm, df, verbose=True, allow_dangerous_code=True)
res = agent.invoke("What is the sum of column A?")
print("Result:", res["output"])
