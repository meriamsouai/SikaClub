import { Schema, model } from "mongoose";

const counterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const CounterModel = model("Counter", counterSchema);

/** FAC-MMYY#### e.g. FAC-09260001 (Sep 2026, seq 1). Sequence resets each calendar month. */
export async function nextInvoiceReference(now = new Date()): Promise<string> {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear() % 100).padStart(2, "0");
  const period = `${mm}${yy}`;
  const key = `FAC-${period}`;
  const doc = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const seq = doc?.seq ?? 1;
  return `FAC-${period}${String(seq).padStart(4, "0")}`;
}

/** CAD-YYYY-##### e.g. CAD-2026-00001. Sequence resets each calendar year. */
export async function nextSequentialReference(prefix: "CAD"): Promise<string> {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const doc = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const seq = doc?.seq ?? 1;
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}
