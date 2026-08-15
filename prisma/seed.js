const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Creating Admin user...");

  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vf-next.local" },
    update: {},
    create: {
      name: "Admin VF-Next",
      email: "admin@vf-next.local",
      password: hashedPassword,
      role: "ADMIN",
      department: "Management",
      isActive: true,
    },
  });

  console.log("✅ Admin created:", admin.email);

  // Create a test Manager
  const managerPass = await bcrypt.hash("Manager@123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@vf-next.local" },
    update: {},
    create: {
      name: "مدير القسم",
      email: "manager@vf-next.local",
      password: managerPass,
      role: "MANAGER",
      department: "Operations",
      isActive: true,
    },
  });
  console.log("✅ Manager created:", manager.email);

  // Create a test Employee
  const empPass = await bcrypt.hash("Employee@123", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@vf-next.local" },
    update: {},
    create: {
      name: "موظف تجريبي",
      email: "employee@vf-next.local",
      password: empPass,
      role: "EMPLOYEE",
      department: "Operations",
      isActive: true,
    },
  });
  console.log("✅ Employee created:", employee.email);

  console.log("\n🎉 Seed completed successfully!");
  console.log("─────────────────────────────────");
  console.log("Admin    → admin@vf-next.local    / Admin@123");
  console.log("Manager  → manager@vf-next.local  / Manager@123");
  console.log("Employee → employee@vf-next.local / Employee@123");
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
