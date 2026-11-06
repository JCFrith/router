// Public: the only Supabase values the browser is allowed to see.
module.exports = (req, res) => {
  const isProd = process.env.VERCEL_ENV === 'production';
  // The gate cannot be switched off in production, whatever the env var says.
  const requireSignin = isProd ? true : String(process.env.REQUIRE_SIGNIN || 'true').toLowerCase() !== 'false';
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.end(JSON.stringify({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    requireSignin,
  }));
};
