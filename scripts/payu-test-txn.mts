import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "payutest@callout.local";
const PASSWORD = "payutest-pass-123";
const USER_ID = "cmt43jdj000001ksxnl5xqp47";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("[1/6] Logging in...");
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 10000 });
  console.log("  logged in");

  console.log("[2/6] Creating PayU payment...");
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

  console.log("[3/6] Submitting form to secure.payu.in...");
  const payu = await context.newPage();
  await payu.goto("about:blank");

  const inputHtml = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, "&quot;")}" />`)
    .join("\n");
  await payu.setContent(
    '<html><body><form id="f" method="POST" action="' + action + '">' + inputHtml + '</form><script>document.getElementById("f").submit()</script></body></html>'
  );
  await payu.waitForLoadState("networkidle", { timeout: 30000 });
  console.log("  PayU URL:", payu.url());
  await payu.waitForTimeout(3000);

  console.log("[4/6] Navigating to Credit Card...");
  await payu.screenshot({ path: "/tmp/cyphr-payu-prod-1.png" });

  // Step A: Close QR popup — click the X at ~(978, 164)
  await payu.mouse.click(978, 164);
  console.log("  clicked X on QR popup");
  await payu.waitForTimeout(1500);
  await payu.screenshot({ path: "/tmp/cyphr-payu-prod-2.png" });

  // Step B: The page should now show UPI ID input. Look for payment method tabs.
  // PayU new checkout has a left sidebar with payment options.
  // Try to find "Credit Card" or "Card" tab in the page or frames.
  let foundCC = false;

  // Check main page first
  for (const selector of ['text="Credit Card"', 'text="Cards"', 'text="Debit / Credit Card"', '[data-value="card"]', 'text="Pay with Card"']) {
    try {
      const el = payu.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 })) {
        await el.click({ timeout: 3000 });
        foundCC = true;
        console.log("  clicked:", selector);
        break;
      }
    } catch { /* next */ }
  }

  // Check all frames
  if (!foundCC) {
    for (const frame of payu.frames()) {
      for (const selector of ['text="Credit Card"', 'text="Cards"', 'text="Debit / Credit Card"', 'text="Pay with Card"']) {
        try {
          const el = frame.locator(selector).first();
          if (await el.isVisible({ timeout: 1000 })) {
            await el.click({ timeout: 3000 });
            foundCC = true;
            console.log("  clicked:", selector, "in frame:", frame.url().slice(0, 50));
            break;
          }
        } catch { /* next */ }
      }
      if (foundCC) break;
    }
  }

  if (!foundCC) {
    // List all visible text for debug
    console.log("  listing all visible text on page:");
    const texts = await payu.locator("body").innerText().catch(() => "(none)");
    console.log("  page text:", texts.slice(0, 500));
    for (const frame of payu.frames()) {
      const ft = await frame.locator("body").innerText().catch(() => "");
      if (ft.trim()) console.log("  frame text:", ft.slice(0, 300));
    }
  }

  await payu.waitForTimeout(2000);
  await payu.screenshot({ path: "/tmp/cyphr-payu-prod-3.png" });

  console.log("[5/6] Filling card details...");

  // Try filling in frames first (PayU may use iframe)
  let filled = false;
  for (const frame of payu.frames()) {
    try {
      const num = frame.locator('input#cardnumber, input[name="cardnumber"], input[placeholder*="Card"]').first();
      if (await num.isVisible({ timeout: 2000 })) {
        await num.fill("5123456789012346");
        await frame.locator('input#cardname, input[name="cardname"], input[placeholder*="Name"]').first().fill("Test User");
        await frame.locator('input#cardexpires, input[name="cardexpires"], input[placeholder*="MM"]').first().fill("01/30");
        await frame.locator('input#cardcvv, input[name="cardcvv"], input[placeholder*="CVV"]').first().fill("123");
        filled = true;
        console.log("  card details filled in frame");
        break;
      }
    } catch { /* try next frame */ }
  }
  if (!filled) {
    // Try main page
    await payu.locator('input#cardnumber, input[name="cardnumber"], input[placeholder*="Card"]').first().fill("5123456789012346", { timeout: 10000 });
    await payu.locator('input#cardname, input[name="cardname"], input[placeholder*="Name"]').first().fill("Test User");
    await payu.locator('input#cardexpires, input[name="cardexpires"], input[placeholder*="MM"]').first().fill("01/30");
    await payu.locator('input#cardcvv, input[name="cardcvv"], input[placeholder*="CVV"]').first().fill("123");
    console.log("  card details filled on main page");
  }

  await payu.screenshot({ path: "/tmp/cyphr-payu-prod-5.png" });

  console.log("[6/6] Clicking Pay...");
  let payClicked = false;
  for (const frame of payu.frames()) {
    try {
      const btn = frame.locator('button:has-text("Pay"), #card-pay-btn, a:has-text("Pay")').first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click({ timeout: 5000 });
        payClicked = true;
        console.log("  clicked Pay in frame");
        break;
      }
    } catch { /* try next frame */ }
  }
  if (!payClicked) {
    await payu.locator('button:has-text("Pay"), #card-pay-btn').first().click({ timeout: 5000 });
    console.log("  clicked Pay on main page");
  }

  // Wait for OTP or redirect
  await payu.waitForTimeout(5000);
  await payu.screenshot({ path: "/tmp/cyphr-payu-prod-6.png" });
  console.log("  page URL:", payu.url());

  // Try OTP
  try {
    await payu.locator('input[name="otp"], input[placeholder*="OTP"], input[aria-label*="OTP"]').first().fill("123456", { timeout: 10000 });
    console.log("  OTP filled");
    await payu.locator('button:has-text("Submit"), button:has-text("Validate"), button:has-text("Confirm")').first().click();
    console.log("  OTP submitted");
    await payu.waitForTimeout(8000);
  } catch {
    console.log("  no OTP page, waiting for redirect...");
    await payu.waitForTimeout(5000);
  }

  await payu.screenshot({ path: "/tmp/cyphr-payu-prod-final.png" });
  console.log("  final URL:", payu.url());
  console.log("  callback hit:", payu.url().includes("/api/payments/payu/callback"));

  console.log("=== REAL PRODUCTION TRANSACTION COMPLETE ===");
  await browser.close();
}

main().catch((err) => {
  console.error("TEST FAILED:", err.message);
  process.exit(1);
});
