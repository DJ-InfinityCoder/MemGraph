"""Reproducible retrieval benchmark; defaults to offline rule extraction."""
import argparse
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from backend.evaluate import run_eval


def main():
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=os.getenv("GEMINI_MODEL"))
    parser.add_argument("--extraction", choices=["rules", "llm"], default="rules")
    parser.add_argument("--users", type=int, default=50)
    parser.add_argument("--sessions", type=int, default=8)
    parser.add_argument("--k", type=int, default=3)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--max-context-words", type=int, default=80)
    parser.add_argument("--output", default="results.json")
    args = parser.parse_args()
    try:
        results = run_eval(args.users, args.sessions, args.k, model=args.model,
                           extraction=args.extraction, seed=args.seed, max_context_words=args.max_context_words)
    except Exception as error:
        parser.exit(1, f"Evaluation failed; no result written: {error}\n")
    Path(args.output).write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
