import { getDb } from "./db";
import { hashPassword } from "./auth";

export async function seedIfEmpty() {
  const db = getDb();
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (count > 0) return;

  console.log("First run — seeding initial data…");

  const branch = db.prepare("INSERT INTO branches (name, address, phone) VALUES (?,?,?) RETURNING id").get("Main Branch", "Accra, Ghana", "+233-30-000-0000") as { id: number };

  const adminHash = await hashPassword("admin123");
  const managerHash = await hashPassword("manager123");
  const cashierHash = await hashPassword("cashier123");

  db.prepare("INSERT INTO users (username,password_hash,full_name,role,branch_id) VALUES (?,?,?,?,?)").run("admin", adminHash, "Akosua Mensah", "admin", branch.id);
  db.prepare("INSERT INTO users (username,password_hash,full_name,role,branch_id) VALUES (?,?,?,?,?)").run("manager", managerHash, "Kwame Asante", "manager", branch.id);
  db.prepare("INSERT INTO users (username,password_hash,full_name,role,branch_id) VALUES (?,?,?,?,?)").run("cashier", cashierHash, "Ama Boateng", "cashier", branch.id);

  const cats = ["Analgesics", "Antibiotics", "Antimalarials", "Vitamins & Supplements", "Antihypertensives", "Antiseptics & Wound Care", "ORS & Electrolytes"];
  const catMap: Record<string, number> = {};
  for (const name of cats) {
    const r = db.prepare("INSERT INTO categories (name) VALUES (?) RETURNING id").get(name) as { id: number };
    catMap[name] = r.id;
  }

  const sup = db.prepare("INSERT INTO suppliers (name,contact_name,phone,email) VALUES (?,?,?,?) RETURNING id").get("Pharmanova Ghana", "Kofi Adu", "+233-20-111-2222", "orders@pharmanova.com.gh") as { id: number };

  const expiry = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); };

  const insP = db.prepare("INSERT INTO products (name,barcode,sku,category_id,supplier_id,branch_id,unit,cost_price,sell_price,stock_qty,reorder_level,expiry_date,batch_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
  insP.run("Paracetamol 500mg (12 tabs)", "5000168014978", "PCM-500-12", catMap["Analgesics"], sup.id, branch.id, "pack", 3.5, 6.0, 120, 30, expiry(18), "PCM2401");
  insP.run("Ibuprofen 400mg (10 tabs)", "5000456234599", "IBU-400-10", catMap["Analgesics"], sup.id, branch.id, "pack", 5.0, 9.5, 80, 20, expiry(24), "IBU2402");
  insP.run("Amoxicillin 500mg (15 caps)", "4006381333931", "AMX-500-15", catMap["Antibiotics"], sup.id, branch.id, "pack", 18.0, 32.0, 8, 15, expiry(5), "AMX2310");
  insP.run("Artemether/Lumefantrine 20/120mg", "6009804491802", "ALU-20-6", catMap["Antimalarials"], sup.id, branch.id, "pack", 22.0, 38.0, 45, 20, expiry(12), "ALU2312");
  insP.run("ORS Sachet (Oral Rehydration)", "0012546789012", "ORS-001", catMap["ORS & Electrolytes"], sup.id, branch.id, "sachet", 1.2, 2.5, 200, 50, expiry(36), "ORS2401");
  insP.run("Vitamin C 500mg (30 tabs)", "5010477109808", "VTC-500-30", catMap["Vitamins & Supplements"], sup.id, branch.id, "pack", 8.0, 15.0, 60, 15, expiry(24), "VTC2401");
  insP.run("Metronidazole 400mg (14 tabs)", "5099627181089", "MTZ-400-14", catMap["Antibiotics"], sup.id, branch.id, "pack", 6.0, 11.0, 5, 20, expiry(3), "MTZ2309");
  insP.run("Antiseptic Solution 250ml", "5099627181002", "ANT-250", catMap["Antiseptics & Wound Care"], sup.id, branch.id, "bottle", 7.0, 13.0, 35, 10, expiry(18), "ANT2401");
  insP.run("Amlodipine 5mg (28 tabs)", "5012045670018", "AML-5-28", catMap["Antihypertensives"], sup.id, branch.id, "pack", 12.0, 22.0, 30, 10, expiry(24), "AML2401");
  insP.run("Zinc Sulphate 20mg (10 tabs)", "6009804490001", "ZNS-20-10", catMap["Vitamins & Supplements"], sup.id, branch.id, "pack", 2.5, 5.0, 90, 25, expiry(30), "ZNS2401");

  console.log("Seed complete — demo users: admin/admin123, manager/manager123, cashier/cashier123");
}
