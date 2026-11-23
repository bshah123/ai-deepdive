import json
import numpy as np


class PretrainedConfig:
    """Plain data: what a checkpoint's config.json describes."""
    model_type = "base"

    def __init__(self, **kwargs):
        self.hidden_size = kwargs.get("hidden_size", 4)
        self.vocab_size = kwargs.get("vocab_size", 10)
        self.num_labels = kwargs.get("num_labels", 2)
        self.architectures = kwargs.get("architectures", [])


class BertConfig(PretrainedConfig):
    model_type = "bert"


class GPT2Config(PretrainedConfig):
    model_type = "gpt2"


# model_type string -> config class (the library keeps this table in one place)
CONFIG_MAPPING = {"bert": BertConfig, "gpt2": GPT2Config}


class PreTrainedModel:
    """Base class: creates named parameters, loads weights, sets eval mode."""
    base_model_prefix = ""

    def __init__(self, config):
        self.config = config
        self.training = True                      # a freshly built model is in training mode
        rng = np.random.default_rng(0)
        self.params = {name: rng.normal(0.0, 0.02, size=shape)
                       for name, shape in type(self).shapes(config).items()}
        self.load_report = None

    @classmethod
    def from_pretrained(cls, checkpoint, config=None):
        if config is None:
            config = auto_config(checkpoint)
        model = cls(config)
        model.load_report = load_weights(model, checkpoint["weights"])
        model.training = False                    # eval mode by default
        return model


class BertModel(PreTrainedModel):
    base_model_prefix = "bert"

    @staticmethod
    def shapes(c):
        return {"embeddings.weight": (c.vocab_size, c.hidden_size),
                "encoder.weight": (c.hidden_size, c.hidden_size)}

    def forward(self, ids):
        x = self.params["embeddings.weight"][ids]          # (seq, hidden)
        return np.tanh(x @ self.params["encoder.weight"])  # "last_hidden_state"


class BertForSequenceClassification(PreTrainedModel):
    base_model_prefix = "bert"

    @staticmethod
    def shapes(c):
        base = {"bert." + k: v for k, v in BertModel.shapes(c).items()}
        base["classifier.weight"] = (c.num_labels, c.hidden_size)
        return base


class GPT2Model(PreTrainedModel):
    base_model_prefix = "transformer"

    @staticmethod
    def shapes(c):
        return {"wte.weight": (c.vocab_size, c.hidden_size),
                "mlp.weight": (c.hidden_size, c.hidden_size)}


class GPT2ForSequenceClassification(PreTrainedModel):
    base_model_prefix = "transformer"

    @staticmethod
    def shapes(c):
        base = {"transformer." + k: v for k, v in GPT2Model.shapes(c).items()}
        base["score.weight"] = (c.num_labels, c.hidden_size)
        return base


class GPT2LMHeadModel(PreTrainedModel):
    base_model_prefix = "transformer"

    @staticmethod
    def shapes(c):
        base = {"transformer." + k: v for k, v in GPT2Model.shapes(c).items()}
        base["lm_head.weight"] = (c.vocab_size, c.hidden_size)
        return base


# config class -> model class (one class, or a list to choose from by config.architectures)
MODEL_MAPPING = {BertConfig: BertModel, GPT2Config: GPT2Model}
SEQ_CLS_MAPPING = {BertConfig: BertForSequenceClassification,
                   GPT2Config: [GPT2ForSequenceClassification, GPT2LMHeadModel]}


def auto_config(checkpoint):
    data = json.loads(checkpoint["config.json"])          # 1. read model_type from the file
    return CONFIG_MAPPING[data["model_type"]](**data)     # 2. look up the config class


def pick_class(config, mapping):
    candidates = mapping[type(config)]                    # 3. config class -> model class
    if not isinstance(candidates, list):
        return candidates
    by_name = {cls.__name__: cls for cls in candidates}
    for arch in config.architectures:                     # 4. list: match architectures
        if arch in by_name:
            return by_name[arch]
    return candidates[0]                                  # 5. otherwise the first entry


def load_weights(model, weights):
    expected = set(model.params)
    prefix = model.base_model_prefix + "."
    renamed = {}
    for key, value in weights.items():
        new = key
        if model.base_model_prefix and key not in expected:
            if key.startswith(prefix):
                new = key[len(prefix):]               # saved with prefix, loading the bare base
            elif prefix + key in expected:
                new = prefix + key                    # saved from the bare base, loading a head
        renamed[new] = value
    for name in sorted(expected & set(renamed)):
        if model.params[name].shape != renamed[name].shape:
            raise ValueError(f"shape mismatch for {name}: checkpoint {renamed[name].shape}, "
                             f"model {model.params[name].shape}")
    for name in expected & set(renamed):
        model.params[name] = renamed[name].copy()
    return {"missing": sorted(expected - set(renamed)),
            "unexpected": sorted(set(renamed) - expected)}


class AutoModel:
    mapping = MODEL_MAPPING

    @classmethod
    def from_pretrained(cls, checkpoint):
        config = auto_config(checkpoint)
        return pick_class(config, cls.mapping).from_pretrained(checkpoint, config=config)


class AutoModelForSequenceClassification(AutoModel):
    mapping = SEQ_CLS_MAPPING


def n_params(model):
    return sum(p.size for p in model.params.values())


# ---- demo ----
rng = np.random.default_rng(42)
bert_json = json.dumps({"model_type": "bert", "hidden_size": 4, "vocab_size": 10,
                        "architectures": ["BertForSequenceClassification"]})
base_weights = {"embeddings.weight": rng.normal(size=(10, 4)),
                "encoder.weight": rng.normal(size=(4, 4))}
base_ckpt = {"config.json": bert_json, "weights": base_weights}   # saved from the bare encoder

print("1. config class:", type(auto_config(base_ckpt)).__name__)

m = AutoModel.from_pretrained(base_ckpt)
print("2. AutoModel ->", type(m).__name__, "| training =", m.training)
print("   missing:", m.load_report["missing"], "| unexpected:", m.load_report["unexpected"])
print("   last_hidden_state shape:", m.forward(np.array([1, 5, 2])).shape, "| params:", n_params(m))

h = AutoModelForSequenceClassification.from_pretrained(base_ckpt)
print("3. AutoModelForSequenceClassification ->", type(h).__name__)
print("   missing:", h.load_report["missing"], "| unexpected:", h.load_report["unexpected"])
print("   params:", n_params(h))

head_weights = {"bert." + k: v for k, v in base_weights.items()}
head_weights["classifier.weight"] = rng.normal(size=(2, 4))
m2 = AutoModel.from_pretrained({"config.json": bert_json, "weights": head_weights})
print("4. head checkpoint into BertModel -> missing:", m2.load_report["missing"],
      "| unexpected:", m2.load_report["unexpected"])

for archs in (["GPT2LMHeadModel"], []):
    cfg = json.dumps({"model_type": "gpt2", "architectures": archs})
    chosen = pick_class(auto_config({"config.json": cfg}), SEQ_CLS_MAPPING)
    print(f"5. architectures={archs} -> {chosen.__name__}")

bad_json = json.dumps({"model_type": "bert", "hidden_size": 8, "vocab_size": 10})
try:
    AutoModel.from_pretrained({"config.json": bad_json, "weights": base_weights})
except ValueError as err:
    print("6. shape mismatch ->", err)
