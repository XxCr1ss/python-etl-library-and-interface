"""Opt-in local codec measurement; prints counts/timing/memory, never source rows."""
import argparse
import json
from pathlib import Path
import sys
import time
import tracemalloc

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import pandas as pd
from etl.load_transport import encode_dataset, decode_dataset, serialize_command


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows", type=int, default=10_000)
    parser.add_argument("--text-width", type=int, default=180)
    args = parser.parse_args()
    frame = pd.DataFrame({"id": range(args.rows), "text": ["x" * args.text_width] * args.rows})
    tracemalloc.start()
    started = time.perf_counter()
    dataset = encode_dataset(frame)
    message = {"request_id": "0" * 32, "action": "execute_load", "payload": {"load_protocol_version": 1,
               "target_connection": {"db_type": "postgresql", "host": "synthetic", "database": "synthetic", "user": "etl", "password": ""},
               "load_config": {"table_name": "synthetic", "table_type": "dimension"}, "dataset": dataset}}
    encoded = serialize_command(message)
    encoded_at = time.perf_counter()
    restored = decode_dataset(json.loads(encoded)["payload"]["dataset"])
    pd.testing.assert_frame_equal(frame, restored)
    elapsed = time.perf_counter() - started
    _, peak = tracemalloc.get_traced_memory()
    print(json.dumps({"rows": len(frame), "message_bytes": len(encoded.encode("utf-8")), "encode_seconds": round(encoded_at - started, 3),
                      "roundtrip_seconds": round(elapsed, 3), "peak_python_heap_bytes": peak}))


if __name__ == "__main__":
    main()
