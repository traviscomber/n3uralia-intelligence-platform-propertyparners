import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPORT_TYPE = "n3uralia_client_canonical";
const TEMPLATE_VERSION = "n3uralia-client-canonical-v1";
const DEFAULT_MODEL = "gpt-5.6-sol";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const openAIKey = requireEnv("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_REPORT_MODEL") || DEFAULT_MODEL;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    validateInput(body);

    const admin = createClient(supabaseUrl, serviceKey);
    const canonicalPayload = await loadCanonicalPayload(admin, body);
    const prompt = buildPrompt(canonicalPayload, body);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: "high" },
        input: prompt,
        text: { format: { type: "json_object" } },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`openai_generation_failed:${response.status}:${detail.slice(0, 500)}`);
    }

    const result = await response.json();
    const outputText = result.output_text;
    if (!outputText) throw new Error("openai_empty_output");

    const content = JSON.parse(outputText);
    validateOutput(content);

    const report = {
      report_type: REPORT_TYPE,
      title: body.title,
      summary: content.resumen_ejecutivo,
      content: {
        ...content,
        metadata: {
          report_type: REPORT_TYPE,
          template_version: TEMPLATE_VERSION,
          requested_model: model,
          actual_model: result.model || model,
          reasoning_effort: "high",
          canonical_cutoff: body.canonical_cutoff,
          period_start: body.period_start,
          period_end: body.period_end,
          client: body.client,
          recipient: body.recipient || null,
          status: "pending_review",
          delivery_status: "not_sent",
          approval_status: "pending",
          source_hashes: body.source_hashes || [],
        },
      },
      period_date: body.period_end,
      metrics_snapshot: canonicalPayload.metrics,
      recommendations: content.recomendaciones || [],
      source_material: canonicalPayload.sources,
      is_demo: false,
      created_by: user.id,
    };

    const { data: saved, error: saveError } = await admin
      .from("ai_reports")
      .insert(report)
      .select("id, report_type, title, created_at")
      .single();
    if (saveError) throw saveError;

    return json({ report: saved, model: result.model || model }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: "canonical_report_generation_failed" }, 500);
  }
});

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}

function validateInput(body: Record<string, unknown>) {
  for (const key of ["title", "client", "period_start", "period_end", "canonical_cutoff"]) {
    if (!body[key]) throw new Error(`missing_field:${key}`);
  }
}

async function loadCanonicalPayload(admin: ReturnType<typeof createClient>, body: any) {
  const [{ data: metrics, error: metricsError }, { data: goals, error: goalsError }] = await Promise.all([
    admin.from("management_metric_values").select("*").gte("period_start", body.period_start).lte("period_end", body.period_end).eq("quality_status", "verified"),
    admin.from("management_goals").select("*").gte("period_start", body.period_start).lte("period_end", body.period_end),
  ]);
  if (metricsError || goalsError) throw metricsError || goalsError;
  if (!metrics?.length) throw new Error("no_verified_canonical_metrics");
  return { metrics, goals, sources: body.sources || [] };
}

function buildPrompt(payload: unknown, body: any): string {
  return `Genera un informe ejecutivo en JSON para ${body.client}. Usa EXCLUSIVAMENTE el bloque DATA_CANONICA. No inventes ni completes vacíos. Marca N/D cuando falte información. Separa valores literales y derivados, universos operativos, de alcance y acreditados. No declares pago, aceptación, UAT, capacitación, despliegue o cierre contractual sin evidencia explícita. Estructura obligatoria: resumen_ejecutivo (string), metricas_y_tendencias (array), conclusiones_y_riesgos (array), avances_y_features_portal (array), estado_tecnico_contractual (array), proximos_hitos (array), metodologia_fuentes_limitaciones (array), recomendaciones (array).\nDATA_CANONICA=${JSON.stringify(payload)}`;
}

function validateOutput(content: any) {
  const required = ["resumen_ejecutivo", "metricas_y_tendencias", "conclusiones_y_riesgos", "avances_y_features_portal", "estado_tecnico_contractual", "proximos_hitos", "metodologia_fuentes_limitaciones"];
  for (const key of required) if (!(key in content)) throw new Error(`invalid_output:${key}`);
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
