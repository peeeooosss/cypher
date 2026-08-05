import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD ?? "";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("CallOut core flow", () => {
  test("rejects unauthenticated event creation", async ({ request }) => {
    const response = await request.post("/api/events", {
      data: {
        title: "Unauthorized Event",
        slug: "unauthorized-event",
        startsAt: "2030-01-01T20:00:00.000Z",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("organizer can create an event and category", async ({ page }) => {
    test.skip(!password, "Set E2E_PASSWORD to run authenticated tests");
    await signIn(page, "organizer@callout.local");
    await page.goto("/organizer");

    const suffix = Date.now().toString();
    await page.getByPlaceholder("Event title").fill(`E2E Battle ${suffix}`);
    await page.getByPlaceholder("event-slug").fill(`e2e-battle-${suffix}`);
    await page.getByPlaceholder("Venue").fill("E2E Warehouse");
    await page.getByPlaceholder("City").fill("Test City");
    await page.locator('input[name="startsAt"]').fill("2030-01-01T20:00");
    await page.getByRole("button", { name: "Create event" }).click();

    await expect(page.getByRole("heading", { name: `E2E Battle ${suffix}` })).toBeVisible();
    await page.locator('input[name="name"]').fill("1v1 Popping");
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("1v1 Popping")).toBeVisible();
  });

  test("artist can access the artist space but not organizer routes", async ({ page }) => {
    test.skip(!password, "Set E2E_PASSWORD to run authenticated tests");
    await signIn(page, "artist@callout.local");
    await page.goto("/artist");
    await expect(page.getByRole("heading", { name: "Find your next battle." })).toBeVisible();

    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/login/);
  });
});
