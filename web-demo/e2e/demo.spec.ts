import { expect, test } from "@playwright/test";

test.describe("AAROP live demo", () => {
  test("renders the hero, loop chrome, agents, and architecture", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("hero-title")).toHaveText("AAROP");
    await expect(page.getByRole("heading", { name: "1 · Live Agentic Loop" })).toBeVisible();
    await expect(page.getByTestId("objective-input")).toBeVisible();
    await expect(page.getByTestId("run-agent")).toBeVisible();
    await expect(page.getByTestId("agents-grid")).toBeVisible();
    await expect(page.getByTestId("architecture")).toBeVisible();
    await expect(page.getByText("This demo runs the full agentic-loop")).toBeVisible();
  });

  test("compute scenario runs the loop and commits a verified result", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("scenario-compute").click();

    await expect(page.getByTestId("loop-result")).toContainText("60", { timeout: 20_000 });
    await expect(page.getByTestId("loop-result")).toContainText("VERIFIED");
    await expect(page.getByTestId("execution-trace")).toContainText("loop_complete");
  });

  test("budget scenario escalates instead of looping forever", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("scenario-budget").click();

    await expect(page.getByTestId("loop-result")).toContainText("ESCALATED", { timeout: 20_000 });
    await expect(page.getByTestId("execution-trace")).toContainText("escalat", { timeout: 5_000 });
  });

  test("theme toggle switches data-theme on <html>", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    expect(before).toMatch(/^(dark|light)$/);

    await page.getByTestId("theme-toggle").click();

    const after = await html.getAttribute("data-theme");
    expect(after).toMatch(/^(dark|light)$/);
    expect(after).not.toBe(before);
  });
});
