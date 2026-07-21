const DEFAULT_CHECK_API_BASE = "https://check.89.167.96.182.sslip.io";
const ALLOWED_HOST_SUFFIXES = [
  "defarm.net",
  "netlify.app",
  "netlify.live",
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

function isAllowedFrontendRequest(request) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") return true;

  const origin = request.headers.get("origin");
  if (isAllowedHost(origin)) return true;

  const referer = request.headers.get("referer");
  if (isAllowedHost(referer)) return true;

  return false;
}

function buildTargetUrl(request) {
  const requestUrl = new URL(request.url);
  const rawPath = requestUrl.pathname.replace(/^\/api\/check\/?/, "");
  const safePath = rawPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");

  const base = (process.env.CHECK_API_BASE || DEFAULT_CHECK_API_BASE).replace(/\/+$/, "");
  const target = new URL(`${base}/${safePath}`);
  target.search = requestUrl.search;
  return target;
}

export default async (request) => {
  if (!isAllowedFrontendRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const proxyToken = process.env.CHECK_PROXY_TOKEN;
  if (!proxyToken) {
    return Response.json({ error: "Proxy not configured" }, { status: 500 });
  }

  const target = buildTargetUrl(request);
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  const authorization = request.headers.get("authorization");

  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  if (authorization) headers.set("authorization", authorization);
  headers.set("x-check-proxy-token", proxyToken);

  const init = {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
  };

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) responseHeaders.set("content-type", upstreamType);
  responseHeaders.set("cache-control", "private, max-age=60");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};
