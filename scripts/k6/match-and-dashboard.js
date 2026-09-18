import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.QUALITY_BASE_URL || "http://127.0.0.1:3000";
const fixtureId = __ENV.QUALITY_MATCH_FIXTURE_ID || "1570355";
const cookieHeader = __ENV.K6_AUTH_COOKIE || "";

export const options = {
  vus: Number(__ENV.K6_VUS || 50),
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

function headers() {
  const h = { Accept: "text/html" };
  if (cookieHeader) {
    h.Cookie = cookieHeader;
  }
  return h;
}

export default function matchAndDashboardLoad() {
  const roll = Math.random();
  if (roll < 0.7) {
    const res = http.get(`${baseUrl}/matches/${fixtureId}`, {
      headers: headers(),
    });
    check(res, { "match status 200": (r) => r.status === 200 });
  } else {
    const res = http.get(`${baseUrl}/dashboard`, { headers: headers() });
    check(res, { "dashboard status 200": (r) => r.status === 200 });
  }
  sleep(0.3);
}
