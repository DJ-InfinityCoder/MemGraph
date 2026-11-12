"""CLI: python run_eval.py --users 20 (writes results.json)"""
import argparse, json
from backend.evaluate import run_eval

p = argparse.ArgumentParser()
p.add_argument("--model", default="gemini-3.8-flash")
p.add_argument("--users", type=int, default=50)
p.add_argument("--sessions", type=int, default=8)
p.add_argument("--k", type=int, default=3)
a = p.parse_args()

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

res = run_eval(a.users, a.sessions, a.k, model=a.model)
json.dump(res, open("results.json", "w"), indent=2)
print(json.dumps(res, indent=2))
