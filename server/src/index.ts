import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`IoT admin API listening on port ${env.port} (${env.nodeEnv})`);
});
