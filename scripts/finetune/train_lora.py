#!/usr/bin/env python3
"""Light LoRA fine-tune of the Amanah AI base model on the fatwa set.

Trains a small adapter; the base weights stay untouched, so the result is a
folder of a few hundred MB that vLLM loads next to the base model:

    vllm serve Qwen/Qwen3.8-27B --lora-modules amanah-ai=/path/to/adapter ...

Only the assistant's answer counts toward the loss. Thinking mode is off, as
in production.

NOT YET RUN: this script was written without a GPU at hand. The first thing
to check on a real run is the list of adapted layers it prints (see
--target-modules), then the loss on the first steps.

Needs a GPU with about 80 GB for the 27B model:
    pip install "transformers>=5.8" peft accelerate
    python3 scripts/finetune/train_lora.py --out /workspace/amanah-lora
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForImageTextToText, AutoTokenizer, get_cosine_schedule_with_warmup

DATA_DIR = Path(__file__).resolve().parents[2] / "corpus" / "dataset"


def load_rows(path: Path) -> list[list[dict]]:
    return [json.loads(line)["messages"] for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def encode(tokenizer, messages: list[dict], max_tokens: int) -> dict | None:
    """Token ids for one conversation, with the prompt masked out of the loss."""
    template = {"tokenize": False, "enable_thinking": False}
    prompt = tokenizer.apply_chat_template(messages[:-1], add_generation_prompt=True, **template)
    full = tokenizer.apply_chat_template(messages, **template)
    if not full.startswith(prompt):
        raise ValueError("chat template does not extend the prompt; cannot mask it")
    prompt_ids = tokenizer(prompt, add_special_tokens=False)["input_ids"]
    ids = tokenizer(full, add_special_tokens=False)["input_ids"][:max_tokens]
    if len(ids) <= len(prompt_ids):
        return None  # the answer was cut off entirely
    labels = [-100] * len(prompt_ids) + ids[len(prompt_ids):]
    return {"input_ids": torch.tensor([ids]), "labels": torch.tensor([labels])}


@torch.no_grad()
def evaluate(model, batches: list[dict]) -> float:
    model.eval()
    losses = [model(**{k: v.to(model.device) for k, v in batch.items()}).loss.item() for batch in batches]
    model.train()
    return sum(losses) / max(len(losses), 1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--model", default="Qwen/Qwen3.8-27B")
    parser.add_argument("--out", required=True, help="folder for the adapter")
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--rank", type=int, default=8)
    parser.add_argument("--accumulate", type=int, default=8, help="conversations per optimizer step")
    parser.add_argument("--max-tokens", type=int, default=2048)
    parser.add_argument(
        "--target-modules",
        default="q_proj,k_proj,v_proj,o_proj",
        help="layer name endings to adapt; check them against the printed list",
    )
    parser.add_argument("--limit", type=int, help="use only N training rows, for a trial run")
    args = parser.parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForImageTextToText.from_pretrained(args.model, dtype=torch.bfloat16, device_map="auto")
    model.gradient_checkpointing_enable()

    # Adapt the language layers only; the vision encoder must keep reading documents as before.
    wanted = tuple(args.target_modules.split(","))
    targets = [
        name
        for name, module in model.named_modules()
        if isinstance(module, torch.nn.Linear) and name.endswith(wanted) and "visual" not in name and "vision" not in name
    ]
    if not targets:
        linear = sorted({name.rsplit(".", 1)[-1] for name, m in model.named_modules() if isinstance(m, torch.nn.Linear)})
        raise SystemExit(f"No layer ends with {wanted}. Linear layer names in this model: {linear}")
    print(f"adapting {len(targets)} layers, e.g. {targets[:3]}")
    model = get_peft_model(
        model, LoraConfig(r=args.rank, lora_alpha=2 * args.rank, lora_dropout=0.05, target_modules=targets, task_type="CAUSAL_LM")
    )
    model.print_trainable_parameters()

    train = [b for b in (encode(tokenizer, row, args.max_tokens) for row in load_rows(DATA_DIR / "train.jsonl")) if b]
    val = [b for b in (encode(tokenizer, row, args.max_tokens) for row in load_rows(DATA_DIR / "val.jsonl")) if b]
    if args.limit:
        train = train[: args.limit]
    steps = math.ceil(len(train) * args.epochs / args.accumulate)
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.lr)
    schedule = get_cosine_schedule_with_warmup(optimizer, max(1, steps // 20), steps)
    print(f"{len(train)} training rows, {len(val)} validation rows, {steps} steps")
    print(f"validation loss before: {evaluate(model, val):.4f}")

    random.seed(0)
    model.train()
    order: list[dict] = []
    for step in range(steps):
        total = 0.0
        for _ in range(args.accumulate):
            if not order:
                order = random.sample(train, len(train))
            batch = order.pop()
            loss = model(**{k: v.to(model.device) for k, v in batch.items()}).loss / args.accumulate
            loss.backward()
            total += loss.item()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        schedule.step()
        optimizer.zero_grad()
        if step % 10 == 0 or step == steps - 1:
            print(f"step {step + 1}/{steps} loss {total:.4f}", flush=True)

    print(f"validation loss after: {evaluate(model, val):.4f}")
    model.save_pretrained(args.out)
    tokenizer.save_pretrained(args.out)
    print(f"adapter saved to {args.out}")


if __name__ == "__main__":
    main()
