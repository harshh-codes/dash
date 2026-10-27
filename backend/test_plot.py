import os
import pandas as pd
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent

load_dotenv()
df = pd.DataFrame({"Category": ["A", "B", "C"], "Values": [10, 20, 15]})
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

prefix = """
You are a data analysis agent. If asked to draw a chart or plot, you must use matplotlib, save the plot to exactly "chart.png", and finish your thought. 
Do NOT try to display the plot using plt.show(). Just save it.
"""
agent = create_pandas_dataframe_agent(llm, df, verbose=True, allow_dangerous_code=True, prefix=prefix)
agent.invoke("Plot a bar chart of the categories and their values.")
