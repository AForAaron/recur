import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

export default defineConfig({
  plugins: [uni()],
  // 注意：不要在这里加 css.preprocessorOptions.scss.additionalData。
  // uni-app 会自动把 src/uni.scss 注入每个 .vue 的 <style lang="scss">，
  // 手动再注入一次会让 uni.scss 导入自己，触发 sass 的
  // "This file is already being loaded" 循环导入错误。
});
