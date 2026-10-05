import { test, expect, type Page } from "@playwright/test";
const setting = {
  se: false,
  bgm: false,
  seVolume: 0.6,
  bgmVolume: 0.15,
  three: false,
  confetti: false,
  animation: false,
};
const data = (times: number[]) =>
  times.map((timeMs, i) => ({
    id: `seed-${i}`,
    nickname: `パイロット${i + 1}`,
    timeMs,
    createdAt: `2026-10-05T03:00:${String(i).padStart(2, "0")}.000Z`,
  }));
async function seed(page: Page, times: number[] = [], extra = {}) {
  await page.addInitScript(
    ({ records, s }) => {
      localStorage.setItem("droneRaceRanking", JSON.stringify(records));
      localStorage.setItem("droneRaceSettings", JSON.stringify(s));
    },
    { records: data(times), s: { ...setting, ...extra } },
  );
  await page.goto("/");
}
async function race(page: Page, name = "かずき", wait = 80) {
  await page.getByRole("button", { name: "挑戦する", exact: true }).click();
  await page.getByLabel("ニックネームを入力してください").fill(name);
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await page.keyboard.press("Enter");
  await expect(page.getByText("まもなくスタート")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ストップ", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(wait);
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "ランキングを見る", exact: true }),
  ).toBeVisible();
}
test("一連の操作・空欄検証・トリム・新記録・二重STOP・再読込", async ({
  page,
}) => {
  await seed(page);
  await expect(page.getByText("まだ記録がありません")).toBeVisible();
  await page.getByRole("button", { name: "挑戦する", exact: true }).click();
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await expect(
    page.getByText("ニックネームを入力してください", { exact: true }).last(),
  ).toBeVisible();
  await page.getByLabel("ニックネームを入力してください").fill("  かずき  ");
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await page.getByRole("button", { name: "スタート", exact: true }).dblclick();
  await expect(
    page.getByRole("button", { name: "ストップ", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(150);
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await expect(page.getByText("新記録！")).toBeVisible();
  const r = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("droneRaceRanking")!),
  );
  expect(r).toHaveLength(1);
  expect(r[0].nickname).toBe("かずき");
  expect(r[0].timeMs).toBeGreaterThan(100);
  expect(r[0].timeMs).toBeLessThan(1800);
  await page.reload();
  await expect(page.getByText("ランキング TOP10")).toBeVisible(); // check actual storage without reseeding on reload separately below
});
for (const scenario of [
  { name: "2位", times: [1, 60000], rank: "2位" },
  { name: "3位", times: [1, 2, 60000], rank: "3位" },
  {
    name: "TOP10入り・11件目切り捨て",
    times: [1, 2, 3, 4, 5, 6, 7, 8, 9, 60000],
    rank: "10位",
  },
  {
    name: "TOP10圏外",
    times: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    rank: "TOP10圏外",
  },
]) {
  test(scenario.name, async ({ page }) => {
    await seed(page, scenario.times);
    await race(page);
    await expect(page.locator(".result-rank")).toHaveText(scenario.rank);
    const records = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("droneRaceRanking")!),
    );
    expect(records.length).toBeLessThanOrEqual(10);
    expect(records.map((r: { timeMs: number }) => r.timeMs)).toEqual(
      records
        .map((r: { timeMs: number }) => r.timeMs)
        .sort((a: number, b: number) => a - b),
    );
    if (scenario.rank === "TOP10圏外")
      expect(
        records.some((r: { nickname: string }) => r.nickname === "かずき"),
      ).toBe(false);
  });
}
test("既存1位更新・画像背景・演出ON", async ({ page }) => {
  await seed(page, [60000], {
    three: true,
    confetti: true,
    animation: true,
    se: true,
  });
  await race(page);
  await expect(page.getByText("NEW RECORD")).toBeVisible();
  await expect(page.locator(".app")).toHaveCSS(
    "background-image",
    /bg_drone_race_victory/,
  );
});
test("保存保持・管理画面・設定保存・JSON・初期化確認", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    ({ r, s }) => {
      localStorage.setItem("droneRaceRanking", JSON.stringify(r));
      localStorage.setItem("droneRaceSettings", JSON.stringify(s));
    },
    { r: data([12000, 18000, 24000]), s: setting },
  );
  await page.reload();
  await expect(page.getByText("パイロット1")).toBeVisible();
  await page.goto("/admin");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "JSONエクスポート", exact: true })
    .click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toMatch(
    /^drone-race-ranking-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const path = await dl.path();
  const fs = await import("node:fs/promises");
  expect(JSON.parse(await fs.readFile(path!, "utf8"))).toHaveLength(3);
  for (const label of ["SE", "BGM", "Three.js", "紙吹雪", "アニメーション"]) {
    await page.getByLabel(label, { exact: true }).check();
  }
  await page.getByLabel("SE音量", { exact: true }).focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await page.reload();
  await expect(page.getByLabel("Three.js", { exact: true })).toBeChecked();
  await expect(page.getByLabel("SE音量", { exact: true })).toHaveValue("0.25");
  await page
    .getByRole("button", { name: "ランキング初期化", exact: true })
    .click();
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("droneRaceRanking")!).length,
    ),
  ).toBe(3);
  await page
    .getByRole("button", { name: "ランキング初期化", exact: true })
    .click();
  await page
    .getByRole("button", { name: "すべて削除する", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("droneRaceRanking")),
  ).toBe("[]");
});
test("保存エラーでも計測・結果・JSONバックアップ可能", async ({ page }) => {
  await seed(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await race(page);
  await expect(page.getByRole("alert")).toContainText(
    "ランキングを保存できません",
  );
  await expect(page.getByText("新記録！")).toBeVisible();
  const p = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "JSONバックアップ", exact: true })
    .click();
  await p;
});
test("破損ランキングを上書きしない", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("droneRaceRanking", "broken");
    localStorage.setItem(
      "droneRaceSettings",
      JSON.stringify({ three: false, animation: false, se: false }),
    );
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("読み込めません");
  await race(page);
  expect(
    await page.evaluate(() => localStorage.getItem("droneRaceRanking")),
  ).toBe("broken");
});
test("オフライン再読み込み・計測", async ({ page, context }) => {
  await seed(page, [20000]);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("パイロット1")).toBeVisible();
  await race(page);
  await expect(page.getByText("新記録！")).toBeVisible();
});
test("計測中再読み込みは待機に戻る・記録追加なし", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "挑戦する", exact: true }).click();
  await page.getByLabel("ニックネームを入力してください").fill("テスト");
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "ストップ", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await page.reload();
  await expect(page.getByText("まだ記録がありません")).toBeVisible();
});
test("12文字・絵文字・狭い画面・3D無効でも操作可能", async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "挑戦する", exact: true }).click();
  await page
    .getByLabel("ニックネームを入力してください")
    .fill("😀😀😀😀😀😀😀😀😀😀😀😀😀");
  expect(
    Array.from(
      await page.getByLabel("ニックネームを入力してください").inputValue(),
    ),
  ).toHaveLength(12);
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "スタート", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("3Dコード読込失敗でもSTART・STOP・保存が動く", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("**/assets/Scene-*.js", (route) => route.abort());
  await seed(page, [], { three: true, animation: true });
  await race(page);
  await expect(page.getByText("新記録！")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("droneRaceRanking")!).length,
    ),
  ).toBe(1);
  await context.close();
});
test("WebGL非対応でも計測・保存が動く", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl" || type === "webgl2") return null;
      return original.apply(this, [type, ...args] as never);
    } as typeof original;
  });
  await seed(page, [], { three: true, animation: true });
  await race(page);
  await expect(page.getByText("新記録！")).toBeVisible();
});
test("アニメーションOFF・SE OFF・3D OFFの一連動作とスクリーンショット", async ({
  page,
}) => {
  await seed(
    page,
    [19080, 18420, 20310, 21020, 21550, 22040, 22480, 23100, 23860, 24200],
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/ranking.png", fullPage: true });
  await page.getByRole("button", { name: "挑戦する", exact: true }).click();
  await page.getByLabel("ニックネームを入力してください").fill("かずき");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/entry.png", fullPage: true });
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: "準備はできましたか？", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/ready.png", fullPage: true });
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "ストップ", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/playing.png", fullPage: true });
  await page.getByRole("button", { name: "ストップ", exact: true }).click();
  await expect(page.getByText("新記録！")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/result.png", fullPage: true });
  await page.getByRole("button", { name: "スタッフ設定", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: "スタッフ管理画面", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/admin.png", fullPage: true });
  await expect(page.getByLabel("SE", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Three.js", { exact: true })).not.toBeChecked();
  await expect(
    page.getByLabel("アニメーション", { exact: true }),
  ).not.toBeChecked();
});
test("1366×768でランキング・STOPが画面内に収まる", async ({ page }) => {
  await seed(
    page,
    [18420, 19080, 20310, 21020, 21550, 22040, 22480, 23100, 23860, 24200],
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => document.fonts.ready);
  const challenge = await page
    .getByRole("button", { name: "挑戦する", exact: true })
    .boundingBox();
  expect(challenge!.y + challenge!.height).toBeLessThanOrEqual(768);
  await page.screenshot({ path: "docs/ranking-1366.png", fullPage: true });
  await page.getByRole("button", { name: "挑戦する", exact: true }).click();
  await page.getByLabel("ニックネームを入力してください").fill("かずき");
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "ストップ", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  const stop = await page
    .getByRole("button", { name: "ストップ", exact: true })
    .boundingBox();
  expect(stop!.y + stop!.height).toBeLessThanOrEqual(768);
  await page.keyboard.press("Space");
});
