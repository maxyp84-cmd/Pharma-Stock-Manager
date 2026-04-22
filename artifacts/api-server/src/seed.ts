import {
  db,
  branches,
  users,
  categories,
  suppliers,
  products,
} from "@workspace/db";
import { hashPassword } from "./lib/auth";

async function main() {
  const existing = await db.select().from(users);
  if (existing.length > 0) {
    console.log("Already seeded");
    process.exit(0);
  }

  const [mainBranch] = await db
    .insert(branches)
    .values({
      name: "Accra Main Branch",
      address: "12 Kojo Thompson Rd, Adabraka, Accra",
      phone: "+233 30 222 1100",
    })
    .returning();
  await db.insert(branches).values({
    name: "Kumasi Branch",
    address: "Adum, Kumasi",
    phone: "+233 32 202 4400",
  });

  await db.insert(users).values([
    {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      fullName: "Akosua Mensah",
      role: "admin",
      branchId: mainBranch.id,
    },
    {
      username: "manager",
      passwordHash: hashPassword("manager123"),
      fullName: "Kwame Asante",
      role: "manager",
      branchId: mainBranch.id,
    },
    {
      username: "cashier",
      passwordHash: hashPassword("cashier123"),
      fullName: "Ama Boateng",
      role: "cashier",
      branchId: mainBranch.id,
    },
  ]);

  const cats = await db
    .insert(categories)
    .values([
      { name: "Pain Relief" },
      { name: "Antibiotics" },
      { name: "Vitamins & Supplements" },
      { name: "Cold & Flu" },
      { name: "First Aid" },
      { name: "Personal Care" },
      { name: "Maternal Care" },
    ])
    .returning();
  const catId = (n: string) => cats.find((c) => c.name === n)!.id;

  const sups = await db
    .insert(suppliers)
    .values([
      {
        name: "Ernest Chemists Ltd",
        contactName: "Frank Owusu",
        phone: "+233 30 277 6000",
        email: "orders@ernestchemists.com.gh",
        address: "Spintex Rd, Accra",
      },
      {
        name: "Kinapharma Limited",
        contactName: "Linda Quartey",
        phone: "+233 30 222 8800",
        email: "supply@kinapharma.com",
        address: "North Industrial Area, Accra",
      },
      {
        name: "Pharmanova Ghana",
        contactName: "Yaw Adjei",
        phone: "+233 30 277 9911",
        email: "info@pharmanova.com.gh",
        address: "Tema Industrial Area",
      },
    ])
    .returning();
  const supId = (n: string) => sups.find((s) => s.name === n)!.id;

  const today = new Date();
  const future = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  await db.insert(products).values([
    {
      name: "Paracetamol 500mg (24 tabs)",
      barcode: "5901234123457",
      sku: "PAR-500-24",
      categoryId: catId("Pain Relief"),
      supplierId: supId("Ernest Chemists Ltd"),
      branchId: mainBranch.id,
      unit: "pack",
      costPrice: "3.50",
      sellPrice: "6.00",
      stockQty: 120,
      reorderLevel: 30,
      expiryDate: future(420),
      batchNumber: "PCM2401",
      description: "Pain and fever relief tablets",
    },
    {
      name: "Ibuprofen 400mg (20 tabs)",
      barcode: "5901234567890",
      sku: "IBU-400-20",
      categoryId: catId("Pain Relief"),
      supplierId: supId("Kinapharma Limited"),
      branchId: mainBranch.id,
      unit: "pack",
      costPrice: "8.00",
      sellPrice: "14.00",
      stockQty: 60,
      reorderLevel: 20,
      expiryDate: future(300),
      batchNumber: "IBU2402",
    },
    {
      name: "Amoxicillin 500mg (15 caps)",
      barcode: "4006381333931",
      sku: "AMX-500-15",
      categoryId: catId("Antibiotics"),
      supplierId: supId("Pharmanova Ghana"),
      branchId: mainBranch.id,
      unit: "pack",
      costPrice: "18.00",
      sellPrice: "32.00",
      stockQty: 8,
      reorderLevel: 15,
      expiryDate: future(180),
      batchNumber: "AMX2310",
    },
    {
      name: "Vitamin C 1000mg (30 tabs)",
      barcode: "8410404000017",
      sku: "VTC-1000-30",
      categoryId: catId("Vitamins & Supplements"),
      supplierId: supId("Ernest Chemists Ltd"),
      branchId: mainBranch.id,
      unit: "bottle",
      costPrice: "22.00",
      sellPrice: "38.00",
      stockQty: 45,
      reorderLevel: 10,
      expiryDate: future(540),
      batchNumber: "VTC2403",
    },
    {
      name: "Multivitamin Syrup 200ml",
      barcode: "8901030865278",
      sku: "MVS-200",
      categoryId: catId("Vitamins & Supplements"),
      supplierId: supId("Kinapharma Limited"),
      branchId: mainBranch.id,
      unit: "bottle",
      costPrice: "26.00",
      sellPrice: "45.00",
      stockQty: 22,
      reorderLevel: 8,
      expiryDate: future(45),
      batchNumber: "MVS2401",
    },
    {
      name: "Cough Syrup 100ml",
      barcode: "8901030877892",
      sku: "CGH-100",
      categoryId: catId("Cold & Flu"),
      supplierId: supId("Pharmanova Ghana"),
      branchId: mainBranch.id,
      unit: "bottle",
      costPrice: "11.50",
      sellPrice: "20.00",
      stockQty: 35,
      reorderLevel: 12,
      expiryDate: future(30),
      batchNumber: "CGH2312",
    },
    {
      name: "Bandage Roll 5cm",
      barcode: "5012345678900",
      sku: "BND-5",
      categoryId: catId("First Aid"),
      supplierId: supId("Ernest Chemists Ltd"),
      branchId: mainBranch.id,
      unit: "roll",
      costPrice: "4.00",
      sellPrice: "8.00",
      stockQty: 80,
      reorderLevel: 25,
      expiryDate: null,
      batchNumber: "BND-A",
    },
    {
      name: "Antiseptic Solution 250ml",
      barcode: "5099999999999",
      sku: "ATS-250",
      categoryId: catId("First Aid"),
      supplierId: supId("Kinapharma Limited"),
      branchId: mainBranch.id,
      unit: "bottle",
      costPrice: "15.00",
      sellPrice: "26.00",
      stockQty: 18,
      reorderLevel: 10,
      expiryDate: future(720),
      batchNumber: "ATS2402",
    },
    {
      name: "Hand Sanitizer 500ml",
      barcode: "5012356712340",
      sku: "HS-500",
      categoryId: catId("Personal Care"),
      supplierId: supId("Ernest Chemists Ltd"),
      branchId: mainBranch.id,
      unit: "bottle",
      costPrice: "10.00",
      sellPrice: "18.00",
      stockQty: 65,
      reorderLevel: 20,
      expiryDate: future(365),
      batchNumber: "HS2403",
    },
    {
      name: "ORS Sachets (10pcs)",
      barcode: "5012345987654",
      sku: "ORS-10",
      categoryId: catId("First Aid"),
      supplierId: supId("Pharmanova Ghana"),
      branchId: mainBranch.id,
      unit: "pack",
      costPrice: "6.00",
      sellPrice: "12.00",
      stockQty: 50,
      reorderLevel: 15,
      expiryDate: future(540),
      batchNumber: "ORS2401",
    },
    {
      name: "Folic Acid 5mg (30 tabs)",
      barcode: "5099999912345",
      sku: "FA-5-30",
      categoryId: catId("Maternal Care"),
      supplierId: supId("Kinapharma Limited"),
      branchId: mainBranch.id,
      unit: "pack",
      costPrice: "5.00",
      sellPrice: "10.00",
      stockQty: 4,
      reorderLevel: 10,
      expiryDate: future(180),
      batchNumber: "FA2402",
    },
    {
      name: "Loratadine 10mg (10 tabs)",
      barcode: "5099001122334",
      sku: "LOR-10-10",
      categoryId: catId("Cold & Flu"),
      supplierId: supId("Ernest Chemists Ltd"),
      branchId: mainBranch.id,
      unit: "pack",
      costPrice: "7.50",
      sellPrice: "13.00",
      stockQty: 28,
      reorderLevel: 10,
      expiryDate: future(20),
      batchNumber: "LOR2310",
    },
  ]);

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
