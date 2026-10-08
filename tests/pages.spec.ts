import {test,expect} from '@playwright/test';
test('Pages形式の管理画面は再読み込み・戻るでも維持される',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'スタッフ設定',exact:true}).click();
 await expect(page).toHaveURL(/\/?\?admin=1$/);
 await page.reload();
 await expect(page.getByRole('heading',{name:'スタッフ管理画面',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'会場画面に戻る',exact:true}).click();
 await expect(page.getByRole('button',{name:'挑戦する',exact:true})).toBeVisible();
 await page.goBack();
 await expect(page.getByRole('heading',{name:'スタッフ管理画面',exact:true})).toBeVisible();
});
test('BGMは既定でOFFで、設定画面からのみONにできる', async ({page}) => {
 await page.goto('/admin');
 const bgm = page.getByLabel('BGM', { exact: true });
 await expect(bgm).not.toBeChecked();
 await expect(page.getByText('BGMは既定でOFF。設定画面からのみONにできます。')).toBeVisible();
 await bgm.check();
 await expect(bgm).toBeChecked();
 await page.reload();
 await expect(page.getByLabel('BGM', { exact: true })).toBeChecked();
});