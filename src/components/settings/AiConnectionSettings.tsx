"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";
import { AI_PRESETS, type AiConnectionSummary } from "@/lib/ai-connection";

type Preset = keyof typeof AI_PRESETS | "none";
export function AiConnectionSettings({ initial }: { initial?: AiConnectionSummary }) {
  const { locale, t } = useI18n();
  const zh = locale === "zh-CN";
  const uid = useId();
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [preset, setPreset] = useState<Preset>(initial?.provider === "none" ? "none" : initial?.provider === "anthropic" ? "anthropic" : initial?.baseUrl.startsWith("https://api.openai.com/") ? "openai" : "custom");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [noKey, setNoKey] = useState(initial?.noKey ?? false);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState<"models" | "test" | "save" | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const provider = preset === "none" ? "none" : AI_PRESETS[preset].provider;
  const errorText = (code: string) => {
    const errors: Record<string, [string, string]> = {
      ai_url_invalid: ["Please enter a service address, such as https://example.com/v1. Do not put a key in the address.", "请输入服务地址，例如 https://example.com/v1；不要把密钥放在地址中。"],
      ai_https_required: ["An online service needs an https:// address. A local or private-network service can use http://.", "在线服务请使用 https:// 地址；本机或局域网服务可以使用 http://。"],
      ai_key_required: ["Enter your API key. If you changed services or addresses, enter the key again. For a local service without a key, select the no-key option.", "请填写 API Key。更换服务或地址后需重新填写；本地服务不需要密钥时，可勾选下方选项。"],
      ai_key_invalid: ["The key contains spaces or line breaks. Copy the key again.", "密钥中有空格或换行，请重新复制。"],
      ai_model_required: ["Select a model or enter its exact name.", "请选择模型或输入准确的模型名称。"],
      ai_key_rejected: ["The service rejected this key. Check that it belongs to this service and is active.", "服务未接受这个密钥，请确认密钥属于该服务且有效。"],
      ai_models_unavailable: ["Could not read the model list. You can enter a model name manually and test it.", "无法读取模型列表。你仍可以手动填写模型名称，再测试连接。"],
      ai_connection_failed: ["Could not connect. Check the address, network, and whether the AI service is running.", "连接不上，请检查地址、网络，以及 AI 服务是否已启动。"],
      ai_format_unsupported: ["This model or service did not pass TrueDraft’s response-format test. Try another model, or ask the service provider whether structured responses are supported.", "这个模型或接口未通过 TrueDraft 所需的回复格式测试。可换个模型再试，或确认服务是否支持结构化回复。"],
      ai_test_timeout: ["The test took too long. Check whether the model is loading, then try again.", "测试等待时间较长，请检查模型是否还在加载，稍后重试。"],
      ai_test_rate_limited: ["The provider is limiting requests. Wait a moment or check your provider account.", "服务正在限制请求，请稍后重试或检查服务账户。"],
    };
    return errors[code]?.[zh ? 1 : 0] ?? t(`errors.${code}` as never);
  };
  function choose(next: Preset) {
    setPreset(next); setApiKey(""); setModels([]); setMessage(null); setModel("");
    setBaseUrl(next === "none" ? "" : AI_PRESETS[next].baseUrl);
    setNoKey(next === "local");
  }
  async function run(action: "models" | "test" | "save") {
    setBusy(action); setMessage(null);
    const body = { provider, baseUrl, model, noKey: provider === "openai-compatible" && noKey, ...(apiKey ? { apiKey } : {}) };
    if (action === "save") {
      const res = await apiFetch<{ connection: AiConnectionSummary }>("/api/settings/ai", { method: "PUT", body });
      if (res.ok) {
        setSaved(res.data.connection); setBaseUrl(res.data.connection.baseUrl); setApiKey("");
        setMessage({ error: false, text: zh ? "已保存，立即生效。下次打开应用也会保留；无需重启或修改文件。" : "Saved and active now. Settings persist after restarting; no file editing needed." });
        router.refresh();
      } else setMessage({ error: true, text: errorText(res.code) });
    } else {
      const res = await apiFetch<{ models?: string[]; connected?: boolean }>("/api/settings/ai/test", { method: "POST", body: { ...body, action } });
      if (res.ok) {
        if (action === "models") { const list = res.data.models ?? []; setModels(list); if (!model && list.length === 1) setModel(list[0]); }
        setMessage({ error: false, text: action === "models" ? (zh ? "已读取模型，请选择一个，再测试连接。" : "Models loaded. Choose one, then test the connection.") : (zh ? "测试通过：服务和模型可用，结构化回复正常。点击保存即可开始使用。" : "Test passed: the service and model returned a valid structured response. Save to start using it.") });
      } else setMessage({ error: true, text: errorText(res.code) });
    }
    setBusy(null);
  }
  return <section className="card mt-6 p-6" aria-labelledby={`${uid}-title`}>
    <h2 id={`${uid}-title`} className="text-xl font-semibold">{zh ? "AI 连接设置" : "AI connection settings"}</h2>
    {!initial?.editable ? <p className="mt-2 text-sm text-ink-soft">{zh ? "当前网页版的 AI 由服务管理员配置。TrueDraft 下载版可在这里直接设置自己的 AI 服务。" : "AI for this hosted app is managed by its operator. The TrueDraft desktop download lets you configure your own AI here."}</p> : <>
      <p className="mt-2 text-sm text-ink-soft">{zh ? "三步开始：选择服务 → 填入密钥并选择模型 → 测试并保存。" : "Three steps: choose a service → enter a key and choose a model → test and save."}</p>
      <p className="mt-2 text-xs text-ink-soft">{zh ? "密钥只会加密保存在这台电脑上，不会完整回显。测试只发送一条短消息，不包含个人资料或文书；云端服务可能按用量计费。" : "Keys are encrypted on this computer and never returned to the page. Tests send only a short synthetic message, not your profile or essays; cloud providers may charge for usage."}</p>
      {saved?.loadError ? <p role="alert" className="notice mt-3">{zh ? "之前保存的连接无法读取，请重新填写并保存。" : "The saved connection could not be read. Enter and save it again."}</p> : null}
      <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); void run("save"); }}>
        <div><label htmlFor={`${uid}-service`} className="field-label">{zh ? "1. 选择 AI 服务" : "1. AI service"}</label>
          <select id={`${uid}-service`} className="input" value={preset} disabled={!!busy} onChange={e => choose(e.target.value as Preset)}>
            <option value="none">{zh ? "暂不使用 AI" : "AI off"}</option>
            <option value="openai">OpenAI API</option><option value="anthropic">Claude API</option>
            <option value="local">{zh ? "本机或局域网 AI" : "Local or LAN AI"}</option>
            <option value="custom">{zh ? "其他兼容接口" : "Other compatible service"}</option>
          </select>
        </div>
        {provider !== "none" ? <>
          <div><label htmlFor={`${uid}-url`} className="field-label">{zh ? "服务地址" : "Service address"}</label>
            <input id={`${uid}-url`} className="input w-full" type="text" inputMode="url" required maxLength={500} value={baseUrl} disabled={!!busy} onChange={e => { setBaseUrl(e.target.value); setApiKey(""); setModels([]); setMessage(null); }} placeholder="http://192.168.3.113:8088" />
            <p className="field-help">{zh ? "粘贴服务提供的地址即可，常见的 /v1 或 /chat/completions 后缀会自动整理。" : "Paste the address supplied by your service. Common /v1 and /chat/completions suffixes are normalized automatically."}</p>
          </div>
          <div><label htmlFor={`${uid}-key`} className="field-label">{zh ? "2. API Key（密钥）" : "2. API key"}</label>
            <input id={`${uid}-key`} className="input w-full" type="password" autoComplete="new-password" maxLength={4096} disabled={!!busy || (noKey && provider === "openai-compatible")} value={apiKey} onChange={e => { setApiKey(e.target.value); setMessage(null); }} placeholder={saved?.hasKey && saved.provider === provider && saved.baseUrl === baseUrl ? (zh ? "已保存密钥；留空保持不变" : "Key saved; leave blank to keep it") : (zh ? "粘贴这个服务的 API Key" : "Paste this service’s API key")} />
            {provider === "openai-compatible" ? <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={noKey} disabled={!!busy} onChange={e => setNoKey(e.target.checked)} />{zh ? "这个服务不需要密钥（常见于本地 AI）" : "This service needs no key (common for local AI)"}</label> : null}
          </div>
          <div><label htmlFor={`${uid}-model`} className="field-label">{zh ? "模型" : "Model"}</label>
            <input id={`${uid}-model`} className="input w-full" list={`${uid}-models`} maxLength={200} value={model} disabled={!!busy} onChange={e => { setModel(e.target.value); setMessage(null); }} placeholder={zh ? "先读取模型，或填写服务提供的模型名称" : "Load models, or enter the model name from your provider"} />
            <datalist id={`${uid}-models`}>{models.map(m => <option key={m} value={m} />)}</datalist>
            <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={!!busy || !baseUrl} onClick={() => run("models")}>{busy === "models" ? (zh ? "正在读取…" : "Loading…") : (zh ? "读取可用模型" : "Load available models")}</button>
          </div>
        </> : null}
        <div className="flex flex-wrap gap-2">
          {provider !== "none" ? <button type="button" className="btn btn-secondary" disabled={!!busy || !baseUrl || !model} onClick={() => run("test")}>{busy === "test" ? (zh ? "正在测试…" : "Testing…") : (zh ? "3. 测试连接" : "3. Test connection")}</button> : null}
          <button className="btn btn-primary" disabled={!!busy}>{busy === "save" ? (zh ? "正在保存…" : "Saving…") : (zh ? "保存 AI 设置" : "Save AI settings")}</button>
        </div>
        <p className="text-xs text-ink-soft">{zh ? "更换连接后，下一次 AI 分析会请你确认新的服务。关闭 AI 不影响编辑和保存文书。" : "After changing the connection, your next analysis asks for consent again. Turning AI off keeps writing and saving available."}</p>
        {message ? <p role={message.error ? "alert" : "status"} className={`notice text-sm ${message.error ? "" : "notice-info"}`}>{message.text}</p> : null}
      </form>
    </>}
  </section>;
}
