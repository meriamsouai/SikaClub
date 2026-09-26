import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDb } from "../config/db";
import { env } from "../config/env";
import { hashPassword } from "../lib/password";
import { ensureWelcomeBonus, recordInvoicePoints } from "../lib/pointsLedger";
import { GiftModel } from "../models/Gift";
import { InvoiceModel } from "../models/Invoice";
import { ProductModel } from "../models/Product";
import { UserModel } from "../models/User";

const defaultProducts = [
  {
    reference: "SIKASHIELD-P36-PG",
    name: "SikaShield® P36 PG",
    unit: "rouleaux",
    imageUrl: "/images/products/tn-sikashield-P36-PE-01781889_1-1.jpg",
    tiers: [
      { minQty: 250, maxQty: 500, points: 2 },
      { minQty: 501, maxQty: 1000, points: 5 },
      { minQty: 1001, maxQty: null, points: 12 },
    ],
  },
  {
    reference: "SIKASHIELD-P34-S",
    name: "SikaShield® P34 S",
    unit: "rouleaux",
    imageUrl: "/images/products/tn-sikashield-P34-S-01354046_1-1.jpg",
    tiers: [
      { minQty: 240, maxQty: 480, points: 2 },
      { minQty: 481, maxQty: 960, points: 6 },
      { minQty: 961, maxQty: null, points: 13 },
    ],
  },
  {
    reference: "SIKASHIELD-P34-MG",
    name: "SikaShield® P34 MG",
    unit: "rouleaux",
    imageUrl: "/images/products/tn-sikashield-P34-MG-vert-01189161_1-1.jpg",
    tiers: [
      { minQty: 180, maxQty: 360, points: 3 },
      { minQty: 361, maxQty: 720, points: 6 },
      { minQty: 721, maxQty: null, points: 14 },
    ],
  },
  {
    reference: "SIKASHIELD-P35-ALU",
    name: "SikaShield® P35 ALU",
    unit: "rouleaux",
    imageUrl: "/images/products/tn-sikashield-P35-ALU-1080px-03165280_1-1.jpg",
    tiers: [
      { minQty: 240, maxQty: 480, points: 3 },
      { minQty: 481, maxQty: 960, points: 6 },
      { minQty: 961, maxQty: null, points: 13 },
    ],
  },
];

const defaultGifts = [
  {
    name: "3 x Carnet Tickets Restaurant de 100TND chacun (Pour vos équipes)",
    valueTnd: 300,
    pointsRequired: 4,
    imageUrl: "/images/Cadeau-ticker-resto.png",
    sortOrder: 0,
  },
  {
    name: "3 x Carte prépayée 250TND de carburants chacune",
    valueTnd: 750,
    pointsRequired: 6,
    imageUrl: "/images/Cadeau-carte-carburant.png",
    sortOrder: 1,
  },
  {
    name: "1 x Bon d'achats Produits Sika 1KTND HT",
    valueTnd: 1000,
    pointsRequired: 9,
    imageUrl: "",
    sortOrder: 2,
  },
  {
    name: "1 x CHARIOT ALUMINIUM PLIABLE 150KG",
    valueTnd: 1500,
    pointsRequired: 11,
    imageUrl: "",
    sortOrder: 3,
  },
  {
    name: "Aspirateur eau et poussières KWD 1",
    valueTnd: 2000,
    pointsRequired: 13,
    imageUrl: "",
    sortOrder: 4,
  },
  {
    name: "1 x Bon d'achats Produits Sika 2.500KTND HT",
    valueTnd: 2500,
    pointsRequired: 17,
    imageUrl: "",
    sortOrder: 5,
  },
  {
    name: "Mesure laser 50M Bluetooth DEWALT",
    valueTnd: 3000,
    pointsRequired: 20,
    imageUrl: "",
    sortOrder: 6,
  },
  {
    name: "GROUPE ELECTROGENE 220V ESSENCE 0.8KW-EGGRR0821 EMTOP",
    valueTnd: 3500,
    pointsRequired: 24,
    imageUrl: "",
    sortOrder: 7,
  },
  {
    name: "Thermomètre infrarouge Fluke 62 MAX+",
    valueTnd: 4000,
    pointsRequired: 27,
    imageUrl: "",
    sortOrder: 8,
  },
  {
    name: "1 x Bon d'achats Produits Sika 5KTND HT",
    valueTnd: 5000,
    pointsRequired: 30,
    imageUrl: "",
    sortOrder: 9,
  },
  {
    name: "Échafaudage aluminium TEK UP 4M55",
    valueTnd: 5750,
    pointsRequired: 35,
    imageUrl: "",
    sortOrder: 10,
  },
  {
    name: "Échelle coulissante C2 STAB 2 plans 8.90m",
    valueTnd: 6500,
    pointsRequired: 38,
    imageUrl: "",
    sortOrder: 11,
  },
  {
    name: "Séjour 2 PAX 3 j/ 2 nuitées en 1/2 pension Hotel Cigale (Hors H. Saison)",
    valueTnd: 7500,
    pointsRequired: 42,
    imageUrl: "",
    sortOrder: 12,
  },
  {
    name: "1 x Bon d'achats Produits Sika 10KTND HT",
    valueTnd: 10000,
    pointsRequired: 50,
    imageUrl: "",
    sortOrder: 13,
  },
];

async function seed() {
  if (env.isProduction && process.env.SEED_ALLOW !== "true") {
    throw new Error("Refusing to seed in production. Set SEED_ALLOW=true to override.");
  }
  if (env.seedPartnerPassword.length < 10) {
    throw new Error("SEED_PARTNER_PASSWORD must be at least 10 characters.");
  }
  if (env.seedAdminPassword.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
  }

  await connectDb();
  fs.mkdirSync(path.resolve(__dirname, "../../uploads/gifts"), { recursive: true });
  fs.mkdirSync(path.resolve(__dirname, "../../uploads/invoices"), { recursive: true });
  fs.mkdirSync(path.resolve(__dirname, "../../uploads/ads"), { recursive: true });

  const partnerPassword = await hashPassword(env.seedPartnerPassword);
  const partner = await UserModel.findOneAndUpdate(
    { email: env.seedPartnerEmail },
    {
      firstName: "Alex",
      surname: "Martin",
      email: env.seedPartnerEmail,
      password: partnerPassword,
      phone: "+33 1 23 45 67 89",
      companyName: "Entreprise Démo",
      role: "client",
      status: "approved",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (partner) await ensureWelcomeBonus(partner);

  const adminPassword = await hashPassword(env.seedAdminPassword);
  await UserModel.findOneAndUpdate(
    { email: env.seedAdminEmail },
    {
      firstName: "Admin",
      surname: "SIKA",
      email: env.seedAdminEmail,
      password: adminPassword,
      phone: "+216 70 022 700",
      companyName: "Sika Tunisie",
      role: "admin",
      status: "approved",
      totalPoints: 0,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const clients = await UserModel.find({ role: "client" });
  for (const client of clients) {
    await ensureWelcomeBonus(client);
  }
  console.log(`Welcome bonus ensured for ${clients.length} client account(s).`);

  const approvedInvoices = await InvoiceModel.find({ status: "approved", pointsAwarded: { $gt: 0 } });
  let invoiceEntries = 0;
  for (const invoice of approvedInvoices) {
    const created = await recordInvoicePoints({
      userId: invoice.user,
      invoiceId: invoice._id.toString(),
      points: invoice.pointsAwarded,
      label: invoice.products.map((line) => line.productName).join(", ") || "Facture approuvée",
    });
    if (created) invoiceEntries += 1;
  }
  console.log(`Invoice point entries ensured: ${invoiceEntries} new / ${approvedInvoices.length} approved.`);

  for (const product of defaultProducts) {
    await ProductModel.findOneAndUpdate(
      { reference: product.reference },
      {
        $set: {
          reference: product.reference,
          name: product.name,
          unit: product.unit,
          tiers: product.tiers,
          imageUrl: product.imageUrl,
        },
        $unset: { pointsPerUnit: "" },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }
  console.log(`Products ready: ${defaultProducts.length}`);

  const giftCount = await GiftModel.countDocuments();
  if (giftCount === 0) {
    await GiftModel.insertMany(defaultGifts.map((gift) => ({ ...gift, active: true })));
    console.log(`Seeded ${defaultGifts.length} gifts.`);
  } else {
    console.log(`Gifts already present (${giftCount}), skipped gift seed.`);
  }

  console.log(`Approved partner ready: ${env.seedPartnerEmail}`);
  console.log(`Admin ready: ${env.seedAdminEmail}`);
  console.log("Passwords come from SEED_PARTNER_PASSWORD / SEED_ADMIN_PASSWORD in server/.env");
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
