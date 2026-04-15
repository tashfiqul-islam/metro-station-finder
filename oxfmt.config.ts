import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// https://oxc.rs/docs/guide/usage/formatter
export default defineConfig({
  extends: [ultracite],
});
