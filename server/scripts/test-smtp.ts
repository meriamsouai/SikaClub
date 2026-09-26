import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const host = process.env.SMTP_HOST ?? "";
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER ?? "";
const pass = process.env.SMTP_PASS ?? "";
const from = process.env.SMTP_FROM ?? "";

console.log({ host, port, user, from });

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

transport
  .verify()
  .then(() => {
    console.log("VERIFY_OK");
  })
  .catch((error: { code?: string; message: string }) => {
    console.error("VERIFY_FAIL", error.code, error.message);
    process.exitCode = 1;
  });
