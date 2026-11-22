const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Telegram initData validation edge function.
 * Validates the HMAC-SHA256 signature to prevent spoofing.
 * 
 * POST /telegram-validate
 * Body: { initData: string }
 * Returns: { valid: boolean, user?: object }
 */

// Offline by default: this function lets Telegram users in, so it only runs
// when the owner turns its group on in the ONLINE_FEATURES secret
// (comma-separated, e.g. "cloud_ai,pc_bridge", or "all"). Empty or unset = offline.
function offlineResponse(group: string): Response | null {
  const on = (Deno.env.get('ONLINE_FEATURES') ?? '').split(',').map((g) => g.trim().toLowerCase());
  if (on.includes('all') || on.includes(group)) return null;
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'offline_mode',
      group,
      message: `Offline mode: "${group}" is turned off. The owner can add it to the ONLINE_FEATURES secret.`,
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const offline = offlineResponse('telegram')
  if (offline) return offline

  try {
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')
    if (!TELEGRAM_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { initData } = await req.json()
    if (!initData || typeof initData !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse initData query string
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing hash' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build data-check-string (sorted key=value pairs, excluding hash)
    const entries: string[] = []
    params.forEach((value, key) => {
      if (key !== 'hash') entries.push(`${key}=${value}`)
    })
    entries.sort()
    const dataCheckString = entries.join('\n')

    // HMAC-SHA256 validation per Telegram spec
    const encoder = new TextEncoder()
    
    // secret_key = HMAC_SHA256("WebAppData", bot_token)
    const secretKeyData = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const secretKey = await crypto.subtle.sign('HMAC', secretKeyData, encoder.encode(TELEGRAM_API_KEY))

    // calculated_hash = HMAC_SHA256(secret_key, data_check_string)
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const calculatedHash = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(dataCheckString))

    // Convert to hex
    const hashHex = Array.from(new Uint8Array(calculatedHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const valid = hashHex === hash

    if (!valid) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check auth_date freshness (reject if older than 5 minutes)
    const authDate = params.get('auth_date')
    if (authDate) {
      const age = Math.floor(Date.now() / 1000) - parseInt(authDate, 10)
      if (age > 300) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Init data expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse user data
    let user = null
    const userStr = params.get('user')
    if (userStr) {
      try { user = JSON.parse(userStr) } catch { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ valid: true, user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
