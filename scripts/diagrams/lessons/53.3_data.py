# Runs the lesson simulator (53.3_sim.py) and writes the numbers the diagrams use.
import importlib.util
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("sim53_3", os.path.join(HERE, "53.3_sim.py"))
sim = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sim)

if __name__ == "__main__":
    R = sim.results()
    with open(os.path.join(HERE, "53.3_data.json"), "w") as f:
        json.dump(R, f, indent=1)
    print("wrote 53.3_data.json")
