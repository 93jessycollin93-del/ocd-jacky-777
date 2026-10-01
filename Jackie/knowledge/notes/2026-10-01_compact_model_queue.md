# Compact Model Queue: offline models for Jackie

This is the download plan for the small on-device models behind offline Jackie: NPC dialogue, coding, speech, embeddings, vision and documents. Like the Forge notes, **downloads run on your PC or phone, not inside the Lovable app.** The web app only shows the plan.

| What | Where |
|---|---|
| Catalog (source of truth) | `src/data/model-queue.json` |
| Browse / copy manifests | `/models` (sidebar → Build → 📦 Model Queue) |
| Downloader | `scripts/download_models.py` |

The original list had 180 queue rows. Many rows were the same model listed in more than one tier, so the catalog holds **164 unique models**. The Hub IDs were reviewed: **31 were wrong or ambiguous** and have been corrected (table below). `--check` verifies every repo, including the GGUF/ONNX mirror repos, against the live Hub before you download.

## Which format for which target

- **ONNX** is the broadest cross-platform interchange format (ONNX Runtime on desktop, Android, iOS and the web).
- **GGUF** is for llama.cpp-style runtimes (llama.cpp, Ollama, LM Studio, LLM Farm).
- **TFLite / LiteRT** is for Android and embedded devices.
- **Core ML** is for iPhone, iPad and Mac.
- **ExecuTorch** is for PyTorch-native mobile.
- **ggml** (whisper.cpp) and **CTranslate2** (faster-whisper) are for speech.

These are separate deployment paths, not interchangeable files. The downloader fetches what the Hub already hosts: native weights, ONNX and GGUF. Formats with no Hub build go in the manifest as `pending_conversions`, and you export them yourself into `converted/<format>/<id>/`.

## Phases

1. **Core mobile intelligence** (15): SmolLM2 360M/1.7B, Qwen2.5 0.5B, Qwen2.5-Coder 1.5B, Whisper tiny/base, MiniLM-L6, bge-small, nomic-embed v1.5, YOLOv8n, MobileNetV3-Small, MobileSAM, Depth Anything V2 Small, Florence-2-base, SmolVLM-256M.
2. **Balanced quality** (18): the original Phase 2, plus four Tier 0 "validate first" models that no phase listed: gemma-3-1b-it, e5-small-v2, YOLO11n and ResNet-18. Florence-2-large takes the slot Florence-2-base left when base moved to Phase 1. The duplicate Qwen2.5-Coder entry is gone.
3. **Specialized experimentation** (16): Mamba, RWKV-4, MusicGen, Bark, ECAPA, CLAP, SAM, ControlNet-depth, Tiny-SD, SD-Turbo, Table Transformer (detection + structure), LayoutLMv3, DPT, Qwen2.5-VL-3B.
4. **Backlog** (115): everything else, grouped by category.

## Memory fabric: three embedding tiers

- **Fast:** `bge-micro-v2`, `all-MiniLM-L6-v2`, `snowflake-arctic-embed-xs`
- **Balanced:** `bge-small-en-v1.5`, `e5-small-v2`, `nomic-embed-text-v1.5` (8k context)
- **Quality:** `bge-base-en-v1.5`, `mxbai-embed-large-v1`, `bge-m3`

Rerankers (`ms-marco-MiniLM-L-2/L-6`) sit in `embeddings/rerankers` and re-rank pod recall, as described in the Forge note.

## Offline accessibility pipeline

Silero VAD → Whisper / Distil-Whisper (or faster-whisper) → speaker ID (ECAPA / UniSpeech-SAT-SV) → intent/sentiment router → Piper TTS. The VAD gate keeps the big models asleep until someone actually speaks.

## Folder layout

`--out` defaults to `$JACKIE_MODELS_DIR` or `~/jackie-models`, which keeps tens of GB out of the repo.

```text
<out>/
├── text/{tiny,instruct,coding,reasoning,classification}/
├── embeddings/{fast,balanced,quality,rerankers}/
├── audio/{vad,whisper,asr,speaker,tts,music,classification,representation}/
├── vision/{classification,detection,segmentation,depth,embeddings}/
├── multimodal/{captioning,vlm,ocr,documents,generation}/
└── converted/{onnx,tflite,coreml,executorch,gguf,openvino}/
```

Compared with the original plan, the tree adds `text/classification`, `embeddings/rerankers`, `audio/{asr,classification,representation}` and `multimodal/generation`, because those models had no home. Each model gets `<folder>/<id>/manifest.json` with the planned fields (name, source, task, parameters, formats, quantizations, runtime_targets, memory_tier, fallbacks), plus the files actually fetched, their real byte counts, and any pending conversions.

## Running it

```bash
pip install "huggingface_hub>=0.23"
hf auth login                                            # only needed for gated repos (Gemma, MobileLLM)
python scripts/download_models.py --plan --phase 1       # offline dry run
python scripts/download_models.py --check --phase 1      # verify every repo + real download size
python scripts/download_models.py --phase 1              # download
python scripts/download_models.py --phase 1 --formats gguf,onnx --onnx-quant q4
python scripts/download_models.py --skip-flag non-commercial --skip-flag agpl
```

**About file sizes.** A repo's size depends on its format, precision and quantization, and on extra encoders. "Q4" isn't one fixed size either: Q4_K_M, Q4_K_S, GPTQ and AWQ all differ. The catalog therefore records no download sizes. Use `--check`, which totals the exact bytes of the files that would be fetched.

## License and safety flags

- **non-commercial**: MobileLLM ×3, MusicGen-small, XTTS-v2, SegFormer `mit-b0`, Qwen2.5-VL-3B (Qwen Research License), LayoutLMv3
- **agpl**: YOLOv5n / YOLOv8n / YOLO11n (Ultralytics). For a commercial detector, RT-DETR-R18 is Apache-2.0.
- **custom-license** (review before you ship): OPT, StableLM 2, BLOOMZ ×2, Apple MobileViT, Tiny-SD, SD-Turbo, SDXL-Turbo
- **gated** (accept the terms on the Hub first): Gemma ×4, MobileLLM ×3
- **remote-code** (`trust_remote_code`; read the `.py` before running it): nomic-embed ×2, jina-embeddings ×2, gte-Qwen2, Florence-2 ×2, Phi-3.5-vision, Emu3, MobileLLM

## Corrections to the original list

| Requested | Now | Why |
|---|---|---|
| `Cerebras/Cerebras-GPT-111M` | `cerebras/Cerebras-GPT-111M` | The Hub organization is lowercase `cerebras`. |
| `Cerebras/Cerebras-GPT-590M` | `cerebras/Cerebras-GPT-590M` | The Hub organization is lowercase `cerebras`. |
| `stabilityai/stablelm-2-1.6b` | `stabilityai/stablelm-2-1_6b` | The repo name uses an underscore (`1_6b`). Covered by the Stability AI Community License, so check the commercial terms. |
| `allenai/OLMo-300M` | `allenai/OLMo-2-0425-1B-Instruct` | There is no OLMo-300M. OLMo 2 1B is the smallest OLMo, and the substitute here. |
| `IBM/granite-3.0-2b-instruct` | `ibm-granite/granite-3.0-2b-instruct` | IBM publishes Granite under the `ibm-granite` organization. |
| `microsoft/MobileBERT-uncased` | `google/mobilebert-uncased` | MobileBERT is published by Google, not Microsoft. This is a pretrained encoder with no task head. Fine-tune it on your own labels before you route with it. |
| `MoritzLaurer/Multi-BERT-L-2-mnli-xnli` | `MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli` | No Multi-BERT-L-2 checkpoint exists. This is the smallest multilingual NLI model from the same author. |
| `faster-whisper model family` | `Systran/faster-whisper-base` | faster-whisper is a runtime. Its CTranslate2 checkpoints are published as Systran/faster-whisper-{tiny,base,small,medium,large-v3}. |
| `microsoft/unispeech-sat-base` | `microsoft/unispeech-sat-base-plus-sv` | unispeech-sat-base is the pretrain-only backbone. The -plus-sv checkpoint carries the speaker-verification head. |
| `snakers4/silero-vad` | `onnx-community/silero-vad` | snakers4/silero-vad is the GitHub code repo, not a Hub model. The ONNX weights are mirrored at onnx-community/silero-vad. |
| `s3prl/uper-emo` | `superb/wav2vec2-base-superb-er` | s3prl/uper-emo does not exist on the Hub. This is the SUPERB (s3prl) emotion-recognition port with 4 classes: neutral, happy, angry and sad. |
| `ultralytics/yolov5n` | `https://github.com/ultralytics/yolov5/releases` | This is not a Hub model repo. Get yolov5n.pt from the GitHub releases, or `pip install ultralytics` and load YOLO('yolov5nu.pt'). Ultralytics weights and code are AGPL-3.0. Closed-source distribution needs an Ultralytics Enterprise license. |
| `ultralytics/yolov8n` | `Ultralytics/YOLOv8` | yolov8n.pt lives in the Ultralytics/YOLOv8 repo. Export with `yolo export model=yolov8n.pt format=onnx\|tflite\|coreml`. Ultralytics weights and code are AGPL-3.0. Closed-source distribution needs an Ultralytics Enterprise license. |
| `ultralytics/yolov11n` | `Ultralytics/YOLO11` | The model is named YOLO11, with no 'v'. Weights are yolo11n.pt in the Ultralytics/YOLO11 repo. Ultralytics weights and code are AGPL-3.0. Closed-source distribution needs an Ultralytics Enterprise license. |
| `google/mobilenet_v3_small` | `timm/mobilenetv3_small_100.lamb_in1k` | Google never published a MobileNetV3 checkpoint on the Hub. The canonical weights are in timm, and an ONNX build is in onnx-community. |
| `google/vit-tiny-patch16-224` | `WinKawaks/vit-tiny-patch16-224` | Google only published ViT base and larger on the Hub. This is the community port of timm's ViT-Tiny. |
| `google/efficientnet-lite0` | `timm/tf_efficientnet_lite0.in1k` | There is no google/efficientnet-lite0 on the Hub. This is the TF-trained checkpoint ported to timm. The TFLite build ships through Kaggle Models / TF Hub. |
| `timm/efficientnet_b0` | `timm/efficientnet_b0.ra_in1k` | timm repos carry a pretrained-tag suffix. |
| `timm/convnextv2_atto` | `timm/convnextv2_atto.fcmae_ft_in1k` | timm repos carry a pretrained-tag suffix. |
| `timm/mobilevitv2_050` | `timm/mobilevitv2_050.cvnets_in1k` | timm repos carry a pretrained-tag suffix. |
| `ChaoningZhang/MobileSAM` | `dhkim2810/MobileSAM` | ChaoningZhang/MobileSAM is the GitHub code repo. Weights are mirrored on the Hub (dhkim2810/MobileSAM) and at download.pytorch.org/models/mobilesam/mobile_sam.pt. |
| `depth-anything/Depth-Anything-Small` | `LiheYoung/depth-anything-small-hf` | Depth Anything v1 is published under LiheYoung. The `depth-anything` org hosts v2 only. |
| `depth-anything/Depth-Anything-V2-Small` | `depth-anything/Depth-Anything-V2-Small-hf` | The -hf repo is the 🤗 Transformers layout, which exports cleanly to ONNX/Core ML. The non-hf repo holds the raw .pth for the original codebase. Only Small is Apache-2.0; Base/Large are CC-BY-NC. |
| `Intel/dpt-beit-base` | `Intel/dpt-beit-base-384` | The repo name includes the input resolution (`-384`). |
| `isl-org/MiDaS` | `Intel/dpt-hybrid-midas` | isl-org/MiDaS is the GitHub code repo. The MiDaS v3 hybrid weights are on the Hub as Intel/dpt-hybrid-midas. |
| `open-mmlab/mmdetection RTMDet-tiny` | `https://github.com/open-mmlab/mmdetection/tree/main/configs/rtmdet` | This lives in the MMDetection model zoo, not on the Hub. Export it to ONNX with mmdeploy. |
| `microsoft/Florence-2-small` | `microsoft/Florence-2-base` | Florence-2 has no 'small' size. Base (0.23B) is the smallest and Large (0.77B) is next. |
| `microsoft/phi-3.5-vision-instruct` | `microsoft/Phi-3.5-vision-instruct` | Canonical repo casing is `Phi-3.5-vision-instruct`. |
| `BAAI/Emu3-Vision` | `BAAI/Emu3-Chat` | There is no Emu3-Vision repo. Emu3 ships as Emu3-Chat (understanding), Emu3-Gen (generation) and Emu3-VisionTokenizer. At about 8B it is not a compact model. |
| `Salesforce/blip-base` | `Salesforce/blip-image-captioning-base` | Salesforce/blip-base does not exist, so the base captioner is used. Queue rows #158 and #173 were the same model. |
| `PaddlePaddle/PaddleOCR mobile models` | `https://github.com/PaddlePaddle/PaddleOCR` | PP-OCR mobile det/rec models are distributed from PaddleOCR's model list. Convert them with paddle2onnx. |

Rows are generated from the catalog's `requested_as` and `note` fields. If you edit one side, update the other.
