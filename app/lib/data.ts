import db from './db';
import { revenue, invoices, customers } from './schema';
import { eq, desc, count, sum, like, or, inArray } from 'drizzle-orm';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await db.select().from(revenue);

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await db
      .select({
        id: invoices.id,
        amount: invoices.amount,
        name: customers.name,
        imageUrl: customers.imageUrl,
        email: customers.email,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .orderBy(desc(invoices.date))
      .limit(5);

    const latestInvoices = data.map((invoice) => ({
      id: invoice.id,
      amount: formatCurrency(invoice.amount),
      name: invoice.name!,
      image_url: invoice.imageUrl!,
      email: invoice.email!,
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = db.select({ count: count() }).from(invoices);
    const customerCountPromise = db.select({ count: count() }).from(customers);
    
    const paidInvoicesPromise = db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(eq(invoices.status, 'paid'));
    
    const pendingInvoicesPromise = db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(eq(invoices.status, 'pending'));

    const [invoiceCountResult, customerCountResult, paidInvoicesResult, pendingInvoicesResult] = 
      await Promise.all([
        invoiceCountPromise,
        customerCountPromise,
        paidInvoicesPromise,
        pendingInvoicesPromise,
      ]);

    const numberOfInvoices = invoiceCountResult[0].count;
    const numberOfCustomers = customerCountResult[0].count;
    const totalPaidInvoices = formatCurrency(Number(paidInvoicesResult[0].total) || 0);
    const totalPendingInvoices = formatCurrency(Number(pendingInvoicesResult[0].total) || 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const queryAsNumber = parseInt(query);
    const searchCondition = or(
      like(customers.name, `%${query}%`),
      like(customers.email, `%${query}%`),
      like(invoices.status, `%${query}%`),
      isNaN(queryAsNumber) ? undefined : eq(invoices.amount, queryAsNumber)
    );

    const invoiceData = await db
      .select({
        id: invoices.id,
        amount: invoices.amount,
        date: invoices.date,
        status: invoices.status,
        name: customers.name,
        email: customers.email,
        imageUrl: customers.imageUrl,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(searchCondition)
      .orderBy(desc(invoices.date))
      .limit(ITEMS_PER_PAGE)
      .offset(offset);

    // Transform to match expected structure
    const transformedInvoices = invoiceData.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      date: invoice.date, // Already a string from schema
      status: invoice.status,
      name: invoice.name!,
      email: invoice.email!,
      image_url: invoice.imageUrl!,
    }));

    return transformedInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const queryAsNumber = parseInt(query);
    const searchCondition = or(
      like(customers.name, `%${query}%`),
      like(customers.email, `%${query}%`),
      like(invoices.status, `%${query}%`),
      isNaN(queryAsNumber) ? undefined : eq(invoices.amount, queryAsNumber)
    );

    const countResult = await db
      .select({ count: count() })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(searchCondition);

    const totalPages = Math.ceil(countResult[0].count / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const invoiceResult = await db
      .select({
        id: invoices.id,
        customerId: invoices.customerId,
        amount: invoices.amount,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoiceResult.length) {
      throw new Error('Invoice not found.');
    }

    const invoice = invoiceResult[0];

    // Convert amount from cents to dollars and transform to match expected structure
    return {
      id: invoice.id,
      customer_id: invoice.customerId,
      amount: invoice.amount / 100,
      status: invoice.status as 'pending' | 'paid',
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const customersData = await db
      .select({
        id: customers.id,
        name: customers.name,
      })
      .from(customers)
      .orderBy(customers.name);

    return customersData;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const searchCondition = or(
      like(customers.name, `%${query}%`),
      like(customers.email, `%${query}%`)
    );

    // First get the customers that match the search
    const customersData = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        imageUrl: customers.imageUrl,
      })
      .from(customers)
      .where(searchCondition)
      .orderBy(customers.name);

    // Then get invoice data for each customer
    const customerIds = customersData.map(c => c.id);
    type InvoiceData = {
      customerId: string;
      amount: number;
      status: string;
    };
    let invoicesData: InvoiceData[] = [];
    
    if (customerIds.length > 0) {
      invoicesData = await db
        .select({
          customerId: invoices.customerId,
          amount: invoices.amount,
          status: invoices.status,
        })
        .from(invoices)
        .where(inArray(invoices.customerId, customerIds));
    }

    // Group invoices by customer and calculate aggregations
    const invoicesByCustomer = invoicesData.reduce((acc: Record<string, InvoiceData[]>, invoice) => {
      if (!acc[invoice.customerId]) {
        acc[invoice.customerId] = [];
      }
      acc[invoice.customerId].push(invoice);
      return acc;
    }, {});

    // Transform to match expected structure with aggregations
    const transformedCustomers = customersData.map((customer) => {
      const customerInvoices = invoicesByCustomer[customer.id] || [];
      const totalInvoices = customerInvoices.length;
      const totalPending = customerInvoices
        .filter((invoice: InvoiceData) => invoice.status === 'pending')
        .reduce((sum: number, invoice: InvoiceData) => sum + invoice.amount, 0);
      const totalPaid = customerInvoices
        .filter((invoice: InvoiceData) => invoice.status === 'paid')
        .reduce((sum: number, invoice: InvoiceData) => sum + invoice.amount, 0);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.imageUrl,
        total_invoices: totalInvoices,
        total_pending: formatCurrency(totalPending),
        total_paid: formatCurrency(totalPaid),
      };
    });

    return transformedCustomers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
