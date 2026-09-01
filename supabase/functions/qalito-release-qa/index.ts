import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.57.4"
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0"

const REPOSITORY = "traviscomber/n3uralia-intelligence-platform-propertyparners"
const AUDIENCE = "qalito-release-qa"
const ISSUER = "https://token.actions.githubusercontent.com"
const MAIN_REF = "refs/heads/main"
const ALLOWED_WORKFLOWS = new Set([
  `${REPOSITORY}/.github/workflows/authenticated-role-qa.yml@${MAIN_REF}`,
  `${REPOSITORY}/.github/workflows/authenticated-visual-qa.yml@${MAIN_REF}`,
])
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`))

const PROFILE_SPECS = [
  { key: "ceo", role: "ceo", team: "CEO", label: "CEO" },
  { key: "director", role: "director", team: "Lo Beltrán", label: "Director" },
  { key: "subdirector", role: "subdirector", team: "Lo Beltrán", label: "Subdirector" },
  { key: "lo-beltran", role: "seller", team: "Lo Beltrán", label: "Seller Lo Beltrán" },
  { key: "nueva-costanera", role: "seller", team: "Nueva Costanera", label: "Seller Nueva Costanera" },
  { key: "santa-maria", role: "seller", team: "Santa María", label: "Seller Santa María" },
] as const

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  })
}

function randomPassword() {
  const bytes = new Uint8Array(30)
  crypto.getRandomValues(bytes)
  const encoded = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
  return `Q!a9-${encoded}`
}

async function authorize(req: Request, body: Record<string, unknown>) {
  const header = req.headers.get("authorization") || ""
  if (!header.startsWith("Bearer ")) throw new Error("missing_oidc_token")
  const token = header.slice("Bearer ".length)
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE })

  if (payload.repository !== REPOSITORY) throw new Error("repository_not_allowed")
  if (payload.repository_owner !== "traviscomber") throw new Error("owner_not_allowed")
  if (payload.ref !== MAIN_REF) throw new Error("ref_not_allowed")
  if (!ALLOWED_WORKFLOWS.has(String(payload.workflow_ref || ""))) throw new Error("workflow_not_allowed")
  if (!new Set(["push", "workflow_dispatch"]).has(String(payload.event_name || ""))) throw new Error("event_not_allowed")

  const runId = String(body.runId || "")
  const sha = String(body.sha || "")
  if (!/^\d{5,20}$/.test(runId)) throw new Error("invalid_run_id")
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("invalid_sha")
  if (String(payload.run_id || "") !== runId) throw new Error("run_id_mismatch")
  if (String(payload.sha || "") !== sha) throw new Error("sha_mismatch")
  return { runId, sha, workflowRef: String(payload.workflow_ref) }
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !serviceRole) throw new Error("supabase_admin_env_missing")
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function findQaUserIds(client: ReturnType<typeof adminClient>, runId: string) {
  const ids = new Set<string>()
  let page = 1
  while (page <= 10) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    for (const user of data.users) {
      if (String(user.user_metadata?.qa_run_id || "") === runId && user.user_metadata?.qa === true) ids.add(user.id)
    }
    if (data.users.length < 1000) break
    page += 1
  }
  return [...ids]
}

async function cleanupRun(client: ReturnType<typeof adminClient>, runId: string) {
  const userIds = await findQaUserIds(client, runId)

  const { error: entityError } = await client
    .from("management_entities")
    .delete()
    .contains("metadata", { qa: true, qa_run_id: runId })
  if (entityError) throw entityError

  if (userIds.length) {
    const { error: profileError } = await client.from("profiles").delete().in("id", userIds)
    if (profileError) throw profileError
    for (const id of userIds) {
      const { error } = await client.auth.admin.deleteUser(id)
      if (error) throw error
    }
  }
  return userIds.length
}

async function provisionRun(client: ReturnType<typeof adminClient>, runId: string, sha: string) {
  await cleanupRun(client, runId)

  const { data: offices, error: officeError } = await client
    .from("management_entities")
    .select("id,name")
    .eq("entity_type", "office")
    .eq("active", true)
  if (officeError) throw officeError
  const officeByName = new Map((offices || []).map((row) => [row.name, row.id]))

  const created: Array<{ key: string; email: string; password: string }> = []
  try {
    for (const spec of PROFILE_SPECS) {
      const email = `qalito-qa+${runId}-${spec.key}@n3uralia.com`
      const password = randomPassword()
      const { data, error: userError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          qa: true,
          qa_run_id: runId,
          qa_profile: spec.key,
          qa_sha: sha,
        },
        app_metadata: { qa: true },
      })
      if (userError || !data.user) throw userError || new Error(`user_not_created:${spec.key}`)

      const { error: profileError } = await client.from("profiles").insert({
        id: data.user.id,
        full_name: `[QA ${runId}] ${spec.label}`,
        role: spec.role,
        team: spec.team,
      })
      if (profileError) throw profileError

      if (spec.role === "seller") {
        const parentId = officeByName.get(spec.team)
        if (!parentId) throw new Error(`office_not_found:${spec.team}`)
        const { error: entityError } = await client.from("management_entities").insert({
          entity_type: "partner",
          name: `[QA ${runId}] ${spec.team}`,
          parent_id: parentId,
          profile_id: data.user.id,
          active: true,
          metadata: { qa: true, qa_run_id: runId, qa_profile: spec.key, qa_sha: sha },
        })
        if (entityError) throw entityError
      }

      created.push({ key: spec.key, email, password })
    }
    return created
  } catch (error) {
    await cleanupRun(client, runId).catch(() => null)
    throw error
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: "invalid_json" }, 400)
  }

  let identity: { runId: string; sha: string; workflowRef: string }
  try {
    identity = await authorize(req, body)
  } catch (error) {
    console.error("QA OIDC authorization rejected", error instanceof Error ? error.message : String(error))
    return json({ error: "unauthorized" }, 401)
  }

  const action = String(body.action || "")
  const client = adminClient()
  try {
    if (action === "cleanup") {
      const deletedUsers = await cleanupRun(client, identity.runId)
      return json({ ok: true, action, deletedUsers })
    }
    if (action !== "provision") return json({ error: "invalid_action" }, 400)

    const profiles = await provisionRun(client, identity.runId, identity.sha)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    if (!supabaseUrl || !anonKey) {
      await cleanupRun(client, identity.runId)
      throw new Error("supabase_public_env_missing")
    }
    return json({
      ok: true,
      action,
      runId: identity.runId,
      sha: identity.sha,
      profiles,
      supabaseUrl,
      anonKey,
    })
  } catch (error) {
    console.error("QA provisioning operation failed", {
      action,
      runId: identity.runId,
      error: error instanceof Error ? error.message : String(error),
    })
    return json({ error: "qa_operation_failed" }, 500)
  }
})
