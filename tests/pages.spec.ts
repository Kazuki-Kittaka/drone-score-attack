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
