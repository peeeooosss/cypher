import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "payutest@callout.local";
const PASSWORD = "payutest-pass-123";
const USER_ID = "cmt43jdj000001ksxnl5xqp47";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("[1/4] Logging in...");
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 10000 });
  console.log("  logged in");

  console.log("[2/4] Creating PayU payment...");
  const createRes = await page.evaluate(async (uid: string) => {
    const r = await fetch("/api/payments/payu/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ type: "GIG_WORK", referenceId: uid, phone: "9999999999" }),
    });
    return { status: r.status, body: await r.json() };
  }, USER_ID);

  if (createRes.status !== 200 || !createRes.body.fields?.hash) {
    console.error("  FAILED:", JSON.stringify(createRes.body, null, 2));
    throw new Error("Payment creation failed");
  }
  const { action, fields } = createRes.body;
  console.log("  txnid:", fields.txnid);
  console.log("  amount:", fields.amount, "INR");

  console.log("[3/4] Opening PayU checkout...");
  const payu = await context.newPage();
  await payu.goto("about:blank");

  const inputHtml = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, "&quot;")}" />`)
    .join("\n");
  await payu.setContent(
    '<html><body><form id="f" method="POST" action="' + action + '">' + inputHtml + '</form><script>document.getElementById("f").submit()</script></body></html>'
  );
  await payu.waitForLoadState("networkidle", { timeout: 30000 });
  await payu.waitForTimeout(3000);

  // Expand the QR code
  try {
    await payu.locator('text="Pay through UPI QR Code"').first().click({ timeout: 5000 });
    await payu.waitForTimeout(2000);
  } catch { /* QR may already be expanded */ }

  await payu.screenshot({ path: "/tmp/cyphr-payu-qr.png", fullPage: true });
  console.log("  QR screenshot saved to /tmp/cyphr-payu-qr.png");
  console.log("  PAYU URL:", payu.url());

  console.log("[4/4] Waiting for payment (scan the QR code)...");
  console.log("  Waiting up to 5 minutes for callback...");

  // Wait for navigation to callback URL (PayU redirects after payment)
  try {
    await payu.waitForURL("**/api/payments/payu/callback**", { timeout: 300000 });
    console.log("  Callback received! URL:", payu.url());
    await payu.waitForTimeout(3000);
    await payu.screenshot({ path: "/tmp/cyphr-payu-callback.png" });
  } catch {
    console.log("  Timeout waiting for callback");
    await payu.screenshot({ path: "/tmp/cyphr-payu-timeout.png" });
  }

  console.log("=== DONE ===");
  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
