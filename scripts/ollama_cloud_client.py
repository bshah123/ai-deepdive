import os
import json
import urllib.request
import urllib.error

OLLAMA_API_KEY = os.environ.get("OLLAMA_API_KEY", os.environ.get("OLLAMA_API_KEY", ""))
OLLAMA_CLOUD_URL = "https://ollama.com/api/chat"

# Active models tested and accessible with this key:
# - "gpt-oss:120b" (Fastest, ultra-high capability)
# - "minimax-m3" (Exceptional depth on architecture, Hopper TMA, FP8, agentic)
# - "nemotron-3-super" (120B MoE, multi-agent & systems reasoning)
# - "nemotron-3-ultra" (High-throughput reasoning)
# - "gemma4:31b" (Google open weights)
# - "gpt-oss:20b"
# - "nemotron-3-nano:30b"

def query_ollama_cloud(
    prompt: str,
    system_prompt: str = "You are an elite Principal AI Systems Engineer.",
    model: str = "gpt-oss:120b",
    temperature: float = 0.2
) -> str:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "options": {
            "temperature": temperature
        },
        "stream": False
    }
    
    req = urllib.request.Request(
        OLLAMA_CLOUD_URL,
        headers={
            "Authorization": f"Bearer {OLLAMA_API_KEY}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload).encode("utf-8")
    )
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("message", {}).get("content", "")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        return f"HTTP Error {e.code}: {err}"
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    print("Testing Ollama Cloud Client with gpt-oss:120b...")
    reply = query_ollama_cloud("What are the 3 pillars of the RAG Triad? Be concise.")
    print(reply)
