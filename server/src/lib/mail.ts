import nodemailer from "nodemailer";
import { env } from "../config/env";

function createTransport() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    requireTLS: env.smtpPort === 587,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

export async function sendAccountApprovedEmail(input: {
  to: string;
  firstName: string;
  password: string;
}) {
  const transport = createTransport();
  const loginUrl = `${env.clientOrigin}/login`;
  const from =
    env.smtpFrom && env.smtpFrom.includes("@")
      ? env.smtpFrom.replace(/^["']|["']$/g, "")
      : env.smtpUser;

  await transport.sendMail({
    from,
    to: input.to,
    subject: "Votre compte Club Etancheurs SIKA est approuvé",
    text: [
      `Bonjour ${input.firstName},`,
      "",
      "Votre demande d'accès au portail partenaires SIKA a été approuvée.",
      "",
      `E-mail de connexion : ${input.to}`,
      `Mot de passe temporaire : ${input.password}`,
      "",
      "Cadeau de bienvenue : +1 point offert par l’équipe SIKA. Vous le retrouverez dans votre historique de points.",
      "",
      `Connectez-vous ici : ${loginUrl}`,
      "",
      "Nous vous recommandons de changer votre mot de passe après la première connexion.",
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour ${input.firstName},</p>
      <p>Votre demande d'accès au portail partenaires SIKA a été approuvée.</p>
      <p><strong>E-mail de connexion :</strong> ${input.to}<br/>
      <strong>Mot de passe temporaire :</strong> ${input.password}</p>
      <p><strong>Cadeau de bienvenue :</strong> +1 point offert par l’équipe SIKA.<br/>
      Vous le retrouverez dans votre historique de points.</p>
      <p><a href="${loginUrl}">Se connecter</a></p>
      <p>Nous vous recommandons de changer votre mot de passe après la première connexion.</p>
      <p>SIKA Tunisie</p>
    `,
  });
}

export async function sendGiftRedeemedEmail(input: {
  to: string;
  firstName: string;
  giftName: string;
  reference: string;
  pointsSpent: number;
}) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    console.info(
      `Gift redemption email (SMTP not configured) for ${input.to}: ${input.reference} — ${input.giftName}`,
    );
    return;
  }

  const transport = createTransport();
  const from =
    env.smtpFrom && env.smtpFrom.includes("@")
      ? env.smtpFrom.replace(/^["']|["']$/g, "")
      : env.smtpUser;

  await transport.sendMail({
    from,
    to: input.to,
    subject: `Cadeau échangé — référence ${input.reference}`,
    text: [
      `Bonjour ${input.firstName},`,
      "",
      "Vous avez échangé vos points contre un cadeau avec succès.",
      "",
      `Cadeau : ${input.giftName}`,
      `Points utilisés : ${input.pointsSpent}`,
      `Référence : ${input.reference}`,
      "",
      "Notre équipe vous contactera pour vous remettre votre cadeau.",
      "",
      "Vous pouvez suivre le statut de votre échange dans votre espace partenaire.",
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour ${input.firstName},</p>
      <p>Vous avez échangé vos points contre un cadeau avec succès.</p>
      <p><strong>Cadeau :</strong> ${input.giftName}<br/>
      <strong>Points utilisés :</strong> ${input.pointsSpent}<br/>
      <strong>Référence :</strong> ${input.reference}</p>
      <p>Notre équipe vous contactera pour vous remettre votre cadeau.</p>
      <p>Vous pouvez suivre le statut de votre échange dans votre espace partenaire.</p>
      <p>SIKA Tunisie</p>
    `,
  });
}
