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
    requireTLS: env.smtpPort === 587 || env.smtpPort === 2525,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
    family: 4,                // force IPv4
    connectionTimeout: 10000, // fail fast instead of hanging
    greetingTimeout: 10000,
    socketTimeout: 15000,
  } as any);
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

export async function sendAdminInviteEmail(input: {
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
    subject: "Accès administrateur — Club Etancheurs SIKA",
    text: [
      `Bonjour ${input.firstName},`,
      "",
      "Un compte administrateur a été créé pour vous sur le portail Club Etancheurs SIKA.",
      "",
      `E-mail de connexion : ${input.to}`,
      `Mot de passe temporaire : ${input.password}`,
      "",
      `Connectez-vous ici : ${loginUrl}`,
      "",
      "Nous vous recommandons de changer votre mot de passe après la première connexion.",
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour ${input.firstName},</p>
      <p>Un compte administrateur a été créé pour vous sur le portail Club Etancheurs SIKA.</p>
      <p><strong>E-mail de connexion :</strong> ${input.to}<br/>
      <strong>Mot de passe temporaire :</strong> ${input.password}</p>
      <p><a href="${loginUrl}">Se connecter</a></p>
      <p>Nous vous recommandons de changer votre mot de passe après la première connexion.</p>
      <p>SIKA Tunisie</p>
    `,
  });
}

function mailFrom() {
  return env.smtpFrom && env.smtpFrom.includes("@")
    ? env.smtpFrom.replace(/^["']|["']$/g, "")
    : env.smtpUser;
}

export async function sendAccountRequestEmail(input: {
  to: string[];
  firstName: string;
  surname: string;
  companyName: string;
}) {
  if (input.to.length === 0) return;

  const transport = createTransport();
  const adminUrl = `${env.clientOrigin}/admin`;
  const fullName = `${input.firstName} ${input.surname}`;

  await transport.sendMail({
    from: mailFrom(),
    to: mailFrom(),
    bcc: input.to,
    subject: "Nouvelle demande de création de compte — Club Etancheurs SIKA",
    text: [
      "Bonjour,",
      "",
      `Une nouvelle personne vient de demander l'accès au portail partenaires SIKA : ${fullName}.`,
      `Entreprise : ${input.companyName || "Non renseignée"}`,
      "",
      `Consultez et traitez la demande ici : ${adminUrl}`,
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour,</p>
      <p>Une nouvelle personne vient de demander l'accès au portail partenaires SIKA : <strong>${fullName}</strong>.</p>
      <p><strong>Entreprise :</strong> ${input.companyName || "Non renseignée"}</p>
      <p><a href="${adminUrl}">Consulter la demande</a></p>
      <p>SIKA Tunisie</p>
    `,
  });
}

export async function sendAccountRequestReceivedEmail(input: {
  to: string;
  firstName: string;
}) {
  const transport = createTransport();

  await transport.sendMail({
    from: mailFrom(),
    to: input.to,
    subject: "Votre demande de compte SIKA a bien été reçue",
    text: [
      `Bonjour ${input.firstName},`,
      "",
      "Nous avons bien reçu votre demande de création de compte.",
      "Notre service va l’étudier et vous répondra dès que possible.",
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour ${input.firstName},</p>
      <p>Nous avons bien reçu votre demande de création de compte.</p>
      <p>Notre service va l’étudier et vous répondra dès que possible.</p>
      <p>SIKA Tunisie</p>
    `,
  });
}

export async function sendInvoiceSubmittedAdminEmail(input: {
  to: string[];
  firstName: string;
  surname: string;
  reference: string;
  submittedAt: Date;
}) {
  if (input.to.length === 0) return;

  const transport = createTransport();
  const adminUrl = `${env.clientOrigin}/admin/factures`;
  const fullName = `${input.firstName} ${input.surname}`;
  const date = input.submittedAt.toLocaleString("fr-FR");

  await transport.sendMail({
    from: mailFrom(),
    to: mailFrom(),
    bcc: input.to,
    subject: `Nouvelle facture soumise — ${input.reference}`,
    text: [
      "Bonjour,",
      "",
      `${fullName} vient de soumettre la facture ${input.reference}.`,
      `Date de soumission : ${date}`,
      "",
      `Consultez la facture ici : ${adminUrl}`,
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour,</p>
      <p><strong>${fullName}</strong> vient de soumettre la facture <strong>${input.reference}</strong>.</p>
      <p><strong>Date de soumission :</strong> ${date}</p>
      <p><a href="${adminUrl}">Consulter la facture</a></p>
      <p>SIKA Tunisie</p>
    `,
  });
}

export async function sendInvoiceSubmittedEmail(input: {
  to: string;
  firstName: string;
  reference: string;
  submittedAt: Date;
}) {
  const transport = createTransport();
  const historyUrl = `${env.clientOrigin}/historique`;
  const date = input.submittedAt.toLocaleString("fr-FR");

  await transport.sendMail({
    from: mailFrom(),
    to: input.to,
    subject: `Votre facture ${input.reference} a été soumise`,
    text: [
      `Bonjour ${input.firstName},`,
      "",
      `Votre facture ${input.reference} a été soumise avec succès le ${date}.`,
      "",
      `Vous pouvez consulter son statut dans votre historique : ${historyUrl}`,
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour ${input.firstName},</p>
      <p>Votre facture <strong>${input.reference}</strong> a été soumise avec succès le ${date}.</p>
      <p><a href="${historyUrl}">Consulter le statut dans votre historique</a></p>
      <p>SIKA Tunisie</p>
    `,
  });
}

export async function sendInvoiceDecisionEmail(input: {
  to: string;
  firstName: string;
  reference: string;
  status: "approved" | "rejected";
  pointsAwarded: number;
}) {
  const transport = createTransport();
  const historyUrl = `${env.clientOrigin}/historique`;
  const approved = input.status === "approved";
  const decision = approved ? "approuvée" : "refusée";

  await transport.sendMail({
    from: mailFrom(),
    to: input.to,
    subject: `Votre facture ${input.reference} a été ${decision}`,
    text: [
      `Bonjour ${input.firstName},`,
      "",
      `Votre facture ${input.reference} a été ${decision}.`,
      `Points reçus : ${input.pointsAwarded}.`,
      "",
      `Consultez votre historique : ${historyUrl}`,
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour ${input.firstName},</p>
      <p>Votre facture <strong>${input.reference}</strong> a été ${decision}.</p>
      <p><strong>Points reçus :</strong> ${input.pointsAwarded}</p>
      <p><a href="${historyUrl}">Consulter votre historique</a></p>
      <p>SIKA Tunisie</p>
    `,
  });
}

export async function sendGiftRedemptionAdminEmail(input: {
  to: string[];
  firstName: string;
  surname: string;
  giftName: string;
  reference: string;
  pointsSpent: number;
}) {
  if (input.to.length === 0) return;

  const transport = createTransport();
  const adminUrl = `${env.clientOrigin}/admin/echanges`;
  const fullName = `${input.firstName} ${input.surname}`;

  await transport.sendMail({
    from: mailFrom(),
    to: mailFrom(),
    bcc: input.to,
    subject: `Nouvel échange cadeau à traiter — ${input.reference}`,
    text: [
      "Bonjour,",
      "",
      `${fullName} a échangé ses points contre le cadeau ${input.giftName}.`,
      `Référence : ${input.reference}`,
      `Points utilisés : ${input.pointsSpent}`,
      "",
      `Consultez et suivez cette demande ici : ${adminUrl}`,
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour,</p>
      <p><strong>${fullName}</strong> a échangé ses points contre le cadeau <strong>${input.giftName}</strong>.</p>
      <p><strong>Référence :</strong> ${input.reference}<br/>
      <strong>Points utilisés :</strong> ${input.pointsSpent}</p>
      <p><a href="${adminUrl}">Suivre la demande</a></p>
      <p>SIKA Tunisie</p>
    `,
  });
}

export async function sendAccountRejectedEmail(input: {
  to: string;
  firstName: string;
}) {
  const transport = createTransport();

  await transport.sendMail({
    from: mailFrom(),
    to: input.to,
    subject: "Votre demande de compte SIKA a été refusée",
    text: [
      `Bonjour ${input.firstName},`,
      "",
      "Nous sommes désolés de vous informer que votre demande de création de compte a été refusée.",
      "",
      "Si vous avez une question ou rencontrez un problème, vous pouvez contacter notre service en répondant directement à cet e-mail.",
      "",
      "SIKA Tunisie",
    ].join("\n"),
    html: `
      <p>Bonjour ${input.firstName},</p>
      <p>Nous sommes désolés de vous informer que votre demande de création de compte a été refusée.</p>
      <p>Si vous avez une question ou rencontrez un problème, vous pouvez contacter notre service en répondant directement à cet e-mail.</p>
      <p>SIKA Tunisie</p>
    `,
  });
}
