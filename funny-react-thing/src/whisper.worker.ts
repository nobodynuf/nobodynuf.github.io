import { pipeline, env, AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.proxy = false;

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let aborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, audio } = e.data;

  if (type === "load") {
    self.postMessage({ type: "status", message: "Downloading model... (first time only, ~150MB)" });
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      { device: "wasm", dtype: "fp32" }
    ) as AutomaticSpeechRecognitionPipeline;
    self.postMessage({ type: "ready" });
    return;
  }

  if (type === "abort") {
    aborted = true;
    return;
  }

  if (type === "transcribe" && transcriber) {
    aborted = false;
    self.postMessage({ type: "status", message: "Transcribing..." });
    const result = await transcriber(audio as Float32Array, { language: "spanish", task: "transcribe" });
    if (aborted) return;
    const text = Array.isArray(result) ? result[0].text : (result as { text: string }).text;
    self.postMessage({ type: "result", text });
  }
};
