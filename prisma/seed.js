const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Creating Admin user...");

  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vodafone.com.eg" },
    update: {},
    create: {
      name: "Admin VF-Next",
      email: "admin@vodafone.com.eg",
      username: "admin",
      vpnNum: "1000",
      staffId: "ADM1000",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Admin created:", admin.email);

  // Create a test Manager
  const managerPass = await bcrypt.hash("Manager@123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@vodafone.com.eg" },
    update: {},
    create: {
      name: "مدير القسم",
      email: "manager@vodafone.com.eg",
      username: "manager",
      vpnNum: "2000",
      staffId: "MGR2000",
      password: managerPass,
      role: "MANAGER",
      isActive: true,
    },
  });
  console.log("✅ Manager created:", manager.email);

  // Create a test Employee
  const empPass = await bcrypt.hash("Employee@123", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@vodafone.com.eg" },
    update: {},
    create: {
      name: "موظف تجريبي",
      email: "employee@vodafone.com.eg",
      username: "employee",
      vpnNum: "3000",
      staffId: "EMP3000",
      password: empPass,
      role: "EMPLOYEE",
      isActive: true,
    },
  });
  console.log("✅ Employee created:", employee.email);

  console.log("\n🎉 Seed completed successfully!");
  console.log("─────────────────────────────────");
  console.log("Admin    → admin or 1000    / Admin@123");
  console.log("Manager  → manager or 2000  / Manager@123");
  console.log("Employee → employee or 3000 / Employee@123");
  console.log("─────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
