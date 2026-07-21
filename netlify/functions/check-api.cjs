const DEFAULT_CHECK_API_BASE = "https://check.89.167.96.182.sslip.io";
const ALLOWED_HOST_SUFFIXES = [
  "defarm.net",
  "compliance.defarm.net",
  "netlify.app",
  "netlify.live",
  "localhost",
  "127.0.0.1",
];

function isAllowedHost(value) {
  if (!value) return false;
  try {
    const { hostname } = new URL(value);
    return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

function isAllowedFrontendRequest(headers) {
  const secFetchSite = headers["sec-fetch-site"];
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") return true;

  if (isAllowedHost(headers.origin)) return true;
  if (isAllowedHost(headers.referer)) return true;

  return false;
}

function getProxyPath(event) {
  const rawPath = event.path
    .replace(/^\/\.netlify\/functions\/check-api\/?/, "")
    .replace(/^\/api\/check\/?/, "");

  const safePath = rawPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");

  return `/${safePath || "health"}`;
}

function buildTargetUrl(event) {
  const base = (process.env.CHECK_API_BASE || DEFAULT_CHECK_API_BASE).replace(/\/+$/, "");
  const target = new URL(`${base}${getProxyPath(event)}`);
  if (event.rawQuery) target.search = event.rawQuery;
  return target;
}

exports.handler = async (event) => {
  if (!isAllowedFrontendRequest(event.headers || {})) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Forbidden" }),
    };
  }

  const proxyToken = process.env.CHECK_PROXY_TOKEN;
  const apiKey = process.env.CHECK_API_KEY;
  if (!proxyToken || !apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Check proxy not configured" }),
    };
  }

  const upstreamHeaders = {
    "X-API-Key": apiKey,
    "X-Check-Proxy-Token": proxyToken,
  };

  const contentType = event.headers?.["content-type"];
  const accept = event.headers?.accept;
  if (contentType) upstreamHeaders["Content-Type"] = contentType;
  if (accept) upstreamHeaders.Accept = accept;

  const upstream = await fetch(buildTargetUrl(event), {
    method: event.httpMethod,
    headers: upstreamHeaders,
    body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
  });

  const responseType = upstream.headers.get("content-type") || "application/json";
  return {
    statusCode: upstream.status,
    headers: {
      "Content-Type": responseType,
      "Cache-Control": "private, max-age=30",
    },
    body: await upstream.text(),
  };
};
