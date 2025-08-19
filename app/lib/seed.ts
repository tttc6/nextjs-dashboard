import bcrypt from 'bcrypt';
import prisma from './db';
import { invoices, customers, revenue, users } from './placeholder-data';

export async function seedUsers() {
  console.log('🌱 Seeding users...');
  
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: hashedPassword,
        },
      });
    })
  );

  console.log(`✅ Seeded ${insertedUsers.length} users`);
  return insertedUsers;
}

export async function seedCustomers() {
  console.log('🌱 Seeding customers...');
  
  const insertedCustomers = await Promise.all(
    customers.map((customer) =>
      prisma.customer.upsert({
        where: { id: customer.id },
        update: {},
        create: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          imageUrl: customer.image_url,
        },
      })
    )
  );

  console.log(`✅ Seeded ${insertedCustomers.length} customers`);
  return insertedCustomers;
}

export async function seedInvoices() {
  console.log('🌱 Seeding invoices...');
  
  // Check if invoices already exist to avoid duplicates
  const existingInvoices = await prisma.invoice.count();
  
  if (existingInvoices > 0) {
    console.log(`ℹ️  Found ${existingInvoices} existing invoices, skipping seeding`);
    return [];
  }
  
  const insertedInvoices = await prisma.invoice.createMany({
    data: invoices.map((invoice) => ({
      customerId: invoice.customer_id,
      amount: invoice.amount,
      status: invoice.status,
      date: new Date(invoice.date),
    })),
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${insertedInvoices.count} invoices`);
  return insertedInvoices;
}

export async function seedRevenue() {
  console.log('🌱 Seeding revenue...');
  
  const insertedRevenue = await Promise.all(
    revenue.map((rev) =>
      prisma.revenue.upsert({
        where: { month: rev.month },
        update: {},
        create: {
          month: rev.month,
          revenue: rev.revenue,
        },
      })
    )
  );

  console.log(`✅ Seeded ${insertedRevenue.length} revenue records`);
  return insertedRevenue;
}

export async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...');
    
    await seedUsers();
    await seedCustomers();
    await seedRevenue();
    await seedInvoices();
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}