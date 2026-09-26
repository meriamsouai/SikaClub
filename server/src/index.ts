import { app } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import "./models/Product";
import "./models/Invoice";

async function main() {
  try {
    await connectDb();
  } catch (error) {
    console.error("Could not connect to MongoDB.");
    console.error(`URI: ${env.mongodbUri}`);
    console.error("Start MongoDB locally, or run: docker compose up -d");
    console.error(error);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`SIKA API listening on http://localhost:${env.port}`);
  });
}

void main();
