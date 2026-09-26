import { Schema, model } from "mongoose";

const counterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const CounterModel = model("Counter", counterSchema);

export async function nextSequentialReference(prefix: "FAC" | "CAD"): Promise<string> {
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
