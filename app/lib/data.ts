import prisma from './db';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await prisma.revenue.findMany();

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await prisma.invoice.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        customer: {
          select: {
            name: true,
            imageUrl: true,
            email: true,
          },
        },
      },
    });

    const latestInvoices = data.map((invoice: typeof data[0]) => ({
      id: invoice.id,
      amount: formatCurrency(invoice.amount),
      name: invoice.customer.name,
      image_url: invoice.customer.imageUrl,
      email: invoice.customer.email,
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
    const invoiceCountPromise = prisma.invoice.count();
    const customerCountPromise = prisma.customer.count();
    const invoiceStatusPromise = prisma.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'paid',
      },
    }).then(async (paidResult: Awaited<ReturnType<typeof prisma.invoice.aggregate>>) => {
      const pendingResult = await prisma.invoice.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'pending',
        },
      });
      return {
        paid: paidResult._sum?.amount ?? 0,
        pending: pendingResult._sum?.amount ?? 0,
      };
    });

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = data[0];
    const numberOfCustomers = data[1];
    const totalPaidInvoices = formatCurrency(data[2].paid);
    const totalPendingInvoices = formatCurrency(data[2].pending);

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
    const invoices = await prisma.invoice.findMany({
      skip: offset,
      take: ITEMS_PER_PAGE,
      orderBy: { date: 'desc' },
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            customer: {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            amount: {
              equals: isNaN(parseInt(query)) ? undefined : parseInt(query),
            },
          },
          {
            status: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    // Transform to match expected structure
    const transformedInvoices = invoices.map((invoice: typeof invoices[0]) => ({
      id: invoice.id,
      amount: invoice.amount,
      date: invoice.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      status: invoice.status,
      name: invoice.customer.name,
      email: invoice.customer.email,
      image_url: invoice.customer.imageUrl,
    }));

    return transformedInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await prisma.invoice.count({
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            customer: {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            amount: {
              equals: isNaN(parseInt(query)) ? undefined : parseInt(query),
            },
          },
          {
            status: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        amount: true,
        status: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found.');
    }

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
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        invoices: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to match expected structure with aggregations
    const transformedCustomers = customers.map((customer) => {
      const totalInvoices = customer.invoices.length;
      const totalPending = customer.invoices
        .filter((invoice) => invoice.status === 'pending')
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const totalPaid = customer.invoices
        .filter((invoice) => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0);

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
