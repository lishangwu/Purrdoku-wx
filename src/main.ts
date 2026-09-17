import { createEnv } from "./platform/env";
import { createApp } from "./ui/app";

const env = createEnv();
createApp(env);
