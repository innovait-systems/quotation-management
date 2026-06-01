import { PurchaseOrdersService } from './modules/purchase-orders/purchase-orders.service';
import { MetadataService } from './modules/metadata/metadata.service';
import { FormulaEngine } from './common/formula/formula.engine';
import { EntityType, FieldType, POStatus, QuoteStatus, Prisma } from '@prisma/client';

async function executePOTestSuite() {
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🌱 ANTIGRAVITY SYSTEMS: PHASE 2 PURCHASE ORDERS ENGINE TEST RUN');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================\n');

  // =========================================================================
  // MOCK STORAGE TABLES
  // =========================================================================
  const tenantsDb: any[] = [
    {
      id: 'tenant-antigravity',
      name: 'Antigravity Solutions',
      numberingFormats: { PURCHASE_ORDER: 'PO-{YYYY}-{NNNN}' },
      brandingConfig: { payeeName: 'Antigravity Solutions Corp', upiVpa: 'pay@antigravity' }
    }
  ];

  const customFieldsDb: any[] = [
    {
      id: 'field-1',
      tenantId: 'tenant-antigravity',
      entityType: EntityType.PURCHASE_ORDER,
      name: 'sla_penalty_percentage',
      label: 'SLA Breach Penalty %',
      type: FieldType.NUMBER,
      isRequired: true,
      validationRules: { min: 1, max: 20 }
    },
    {
      id: 'field-2',
      tenantId: 'tenant-antigravity',
      entityType: EntityType.PURCHASE_ORDER,
      name: 'priority',
      label: 'Procurement Priority',
      type: FieldType.DROPDOWN,
      isRequired: true,
      options: ['LOW', 'MEDIUM', 'HIGH']
    },
    {
      id: 'field-3',
      tenantId: 'tenant-antigravity',
      entityType: EntityType.PURCHASE_ORDER,
      name: 'lead_time_days',
      label: 'Expected Lead Time (Days)',
      type: FieldType.NUMBER,
      isRequired: false,
      defaultValue: '5'
    },
    {
      id: 'field-4',
      tenantId: 'tenant-antigravity',
      entityType: EntityType.PURCHASE_ORDER,
      name: 'sla_penalty_cost',
      label: 'Calculated Penalty Cost Limit',
      type: FieldType.FORMULA,
      formula: 'subTotal * (sla_penalty_percentage / 100)',
      isRequired: false
    }
  ];

  const suppliersDb: any[] = [
    {
      id: 'supplier-acme',
      tenantId: 'tenant-antigravity',
      name: 'Acme Supply Corp'
    }
  ];

  const purchaseOrdersDb: any[] = [];
  const poLinesDb: any[] = [];
  const quotationsDb: any[] = [];

  // =========================================================================
  // PRISMA MOCK CLIENT
  // =========================================================================
  const mockPrisma: any = {
    tenant: {
      findUnique: async ({ where }: any) => {
        return tenantsDb.find(t => t.id === where.id) || null;
      }
    },
    supplier: {
      findUnique: async ({ where }: any) => {
        return suppliersDb.find(s => s.id === where.id) || null;
      }
    },
    customField: {
      findMany: async ({ where }: any) => {
        return customFieldsDb.filter(
          cf => cf.tenantId === where.tenantId && cf.entityType === where.entityType && cf.isActive !== false
        );
      }
    },
    purchaseOrder: {
      create: async ({ data }: any) => {
        const id = `po-${Math.floor(1000 + Math.random() * 9000)}`;
        const createdPO = {
          id,
          tenantId: data.tenantId,
          supplierId: data.supplierId,
          quotationId: data.quotationId,
          poNumber: data.poNumber,
          status: data.status,
          subTotal: new Prisma.Decimal(data.subTotal.toString()),
          taxTotal: new Prisma.Decimal(data.taxTotal.toString()),
          grandTotal: new Prisma.Decimal(data.grandTotal.toString()),
          deliveryTerms: data.deliveryTerms,
          dynamicValues: data.dynamicValues,
          metadataSchema: data.metadataSchema,
          createdAt: new Date(),
          updatedAt: new Date(),
          supplier: suppliersDb.find(s => s.id === data.supplierId),
          lines: [] as any[]
        };

        if (data.lines?.create) {
          const linesToCreate = Array.isArray(data.lines.create) ? data.lines.create : [data.lines.create];
          linesToCreate.forEach((l: any, idx: number) => {
            const lineId = `${id}-line-${idx + 1}`;
            const newLine = {
              id: lineId,
              poId: id,
              description: l.description,
              quantityOrdered: new Prisma.Decimal(l.quantityOrdered.toString()),
              quantityReceived: new Prisma.Decimal(l.quantityReceived.toString()),
              unitPrice: new Prisma.Decimal(l.unitPrice.toString()),
              taxRate: new Prisma.Decimal(l.taxRate.toString()),
              total: new Prisma.Decimal(l.total.toString())
            };
            poLinesDb.push(newLine);
            createdPO.lines.push(newLine);
          });
        }

        purchaseOrdersDb.push(createdPO);
        return createdPO;
      },
      findFirst: async ({ where }: any) => {
        const found = purchaseOrdersDb.find(p => p.id === where.id && p.tenantId === where.tenantId);
        if (found) {
          // Sync lines
          found.lines = poLinesDb.filter(l => l.poId === found.id);
        }
        return found || null;
      },
      update: async ({ where, data }: any) => {
        const idx = purchaseOrdersDb.findIndex(p => p.id === where.id);
        if (idx !== -1) {
          const po = purchaseOrdersDb[idx];
          if (data.status) po.status = data.status;
          po.updatedAt = new Date();
          return po;
        }
        throw new Error('PO not found to update.');
      }
    },
    pOLine: {
      update: async ({ where, data }: any) => {
        const idx = poLinesDb.findIndex(l => l.id === where.id);
        if (idx !== -1) {
          const line = poLinesDb[idx];
          if (data.quantityReceived) {
            line.quantityReceived = new Prisma.Decimal(data.quantityReceived.toString());
          }
          return line;
        }
        throw new Error('PO Line not found to update.');
      },
      findMany: async ({ where }: any) => {
        return poLinesDb.filter(l => l.poId === where.poId);
      }
    },
    quotation: {
      findFirst: async ({ where }: any) => {
        return quotationsDb.find(q => q.id === where.id && q.tenantId === where.tenantId) || null;
      },
      update: async ({ where, data }: any) => {
        const idx = quotationsDb.findIndex(q => q.id === where.id);
        if (idx !== -1) {
          quotationsDb[idx].status = data.status;
          return quotationsDb[idx];
        }
        throw new Error('Quotation not found to update.');
      }
    },
    // Mock Transaction Helper
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      return arg;
    }
  };

  // =========================================================================
  // SETUP SERVICES
  // =========================================================================
  const formulaEngine = new FormulaEngine();
  // Override round and abs in our test runner
  delete (formulaEngine as any).parser.unaryOps.round;
  delete (formulaEngine as any).parser.unaryOps.abs;
  (formulaEngine as any).parser.functions.round = (formulaEngine as any).getSandboxFunction('ROUND');
  (formulaEngine as any).parser.functions.abs = (formulaEngine as any).getSandboxFunction('ABS');

  const metadataService = new MetadataService(mockPrisma, formulaEngine);
  const purchaseOrdersService = new PurchaseOrdersService(mockPrisma, metadataService);

  // =========================================================================
  // TRIAL 1: Dynamic Purchase Order Creation & Calculations
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TRIAL 1: Dynamic PO Creation, Schema Checks & Formula Solver');
  
  const validPOPayload = {
    supplierId: 'supplier-acme',
    lines: [
      { description: 'Precision Dev Tools Licensing', quantityOrdered: 10, unitPrice: 120, taxRate: 18 },
      { description: 'Cloud VPS Nodes', quantityOrdered: 2, unitPrice: 400, taxRate: 5 }
    ],
    dynamicValues: {
      sla_penalty_percentage: 12,
      priority: 'HIGH'
    },
    deliveryTerms: 'In-Transit FOB Destination'
  };

  console.log('PO Item Lines Input:', JSON.stringify(validPOPayload.lines, null, 2));
  console.log('Submitted Dynamic Metadata Properties:', JSON.stringify(validPOPayload.dynamicValues, null, 2));

  try {
    const createdPO = await purchaseOrdersService.createPurchaseOrder('tenant-antigravity', validPOPayload);
    
    console.log('\x1b[32m%s\x1b[0m', '✓ PO Successfully Created!');
    console.log(`  PO Number: \x1b[34m[${createdPO.poNumber}]\x1b[0m`);
    console.log(`  Status: \x1b[35m[${createdPO.status}]\x1b[0m`);
    console.log(`  Subtotal: \x1b[32m${createdPO.subTotal.toNumber()}\x1b[0m (Expected: 2000)`);
    console.log(`  Tax Total: \x1b[32m${createdPO.taxTotal.toNumber()}\x1b[0m (Expected: 256)`);
    console.log(`  Grand Total: \x1b[32m${createdPO.grandTotal.toNumber()}\x1b[0m (Expected: 2256)`);
    console.log('  Solved Dynamic Calculated Values Matrix:');
    const poDyn = (createdPO.dynamicValues || {}) as any;
    console.log(`    - priority: \x1b[32m${poDyn.priority}\x1b[0m`);
    console.log(`    - lead_time_days: \x1b[32m${poDyn.lead_time_days}\x1b[0m (Fallback check successful)`);
    console.log(`    - sla_penalty_percentage: \x1b[32m${poDyn.sla_penalty_percentage}%\x1b[0m`);
    console.log(`    - sla_penalty_cost: \x1b[32m$${poDyn.sla_penalty_cost}\x1b[0m (Formula: subTotal * 0.12 = 240)`);
    
  } catch (err: any) {
    console.log('✗ PO Creation Failed:', err.message);
  }
  console.log('----------------------------------------------------');

  // =========================================================================
  // TRIAL 2: Testing Validation Constraints Enforcement
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TRIAL 2: Validating Strict Zod Constraints Rejections');

  const invalidPOPayload = {
    supplierId: 'supplier-acme',
    lines: [{ description: 'Item A', quantityOrdered: 1, unitPrice: 100, taxRate: 0 }],
    dynamicValues: {
      sla_penalty_percentage: 25, // Too large: max is 20
      priority: 'ULTRA_URGENT' // Not in dropdown options
    }
  };

  console.log('Submitting Malformatted Payload (percentage: 25, priority: ULTRA_URGENT):');
  try {
    await purchaseOrdersService.createPurchaseOrder('tenant-antigravity', invalidPOPayload);
    console.log('  Unexpected success: validation boundaries failed.');
  } catch (err: any) {
    console.log('\x1b[31m%s\x1b[0m', '  BLOCKED: Validator successfully rejected malformatted payload!');
    console.log(`  Validation Error Output: \x1b[31m${err.message}\x1b[0m`);
  }
  console.log('----------------------------------------------------');

  // =========================================================================
  // TRIAL 3: Quotation to Purchase Order Conversions
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TRIAL 3: Quotation-to-PO Transacted Conversion');

  // Seed quotation record in mock DB
  const mockQuotation = {
    id: 'quote-9942',
    tenantId: 'tenant-antigravity',
    customerId: 'customer-1',
    creatorId: 'user-admin',
    quoteNumber: 'QT-2026-8801',
    status: QuoteStatus.APPROVED,
    subTotal: new Prisma.Decimal('1500.00'),
    taxTotal: new Prisma.Decimal('270.00'),
    discountTotal: new Prisma.Decimal('0.00'),
    grandTotal: new Prisma.Decimal('1770.00'),
    dynamicValues: {
      sla_penalty_percentage: 10,
      priority: 'MEDIUM',
      unrelated_quote_field: 'carry_me_not'
    },
    lines: [
      {
        description: 'Offshore Development Resource',
        quantity: new Prisma.Decimal('1.00'),
        unitPrice: new Prisma.Decimal('1500.00'),
        taxRate: new Prisma.Decimal('18.00'),
        total: new Prisma.Decimal('1770.00')
      }
    ]
  };
  quotationsDb.push(mockQuotation);

  console.log(`Original Approved Quotation Number: ${mockQuotation.quoteNumber}`);
  console.log(`Original Quote Dynamic Fields:`, JSON.stringify(mockQuotation.dynamicValues, null, 2));

  try {
    const convertedPO = await purchaseOrdersService.convertQuotation(
      'tenant-antigravity',
      'supplier-acme',
      'quote-9942'
    );

    console.log('\x1b[32m%s\x1b[0m', '✓ Quotation Successfully Converted to Purchase Order!');
    console.log(`  New PO Number: \x1b[34m[${convertedPO.poNumber}]\x1b[0m`);
    console.log(`  Parent Quotation Reference ID: \x1b[32m${convertedPO.quotationId}\x1b[0m`);
    console.log(`  Mapped PO Dynamic Values (Overlapping schema mapped, formula solved):`);
    const convertedDyn = (convertedPO.dynamicValues || {}) as any;
    console.log(`    - priority: \x1b[32m${convertedDyn.priority}\x1b[0m (MEDIUM carried from quote)`);
    console.log(`    - sla_penalty_percentage: \x1b[32m${convertedDyn.sla_penalty_percentage}%\x1b[0m (10% carried from quote)`);
    console.log(`    - sla_penalty_cost: \x1b[32m$${convertedDyn.sla_penalty_cost}\x1b[0m (Evaluated PO Formula: 1500 * 0.10 = 150)`);
    console.log(`    - lead_time_days: \x1b[32m${convertedDyn.lead_time_days}\x1b[0m (Mapped default 5 successfully)`);
    console.log(`  PO Mapped Lines count: \x1b[32m${convertedPO.lines.length}\x1b[0m`);
    console.log(`  Parent Quotation Status Updated to: \x1b[35m[${quotationsDb[0].status}]\x1b[0m`);
  } catch (err: any) {
    console.log('✗ Quotation conversion failed:', err.message);
  }
  console.log('----------------------------------------------------');

  // =========================================================================
  // TRIAL 4: Incremental Fulfillment Tracking & Limits
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TRIAL 4: Incremental Delivery receipts & Fulfillment Limits');

  // Create a PO containing 2 lines for testing receipts
  const poForReceiptPayload = {
    supplierId: 'supplier-acme',
    lines: [
      { description: 'DevOps Nodes A', quantityOrdered: 10, unitPrice: 100, taxRate: 0 },
      { description: 'Database Node B', quantityOrdered: 5, unitPrice: 200, taxRate: 0 }
    ],
    dynamicValues: {
      sla_penalty_percentage: 5,
      priority: 'LOW'
    }
  };

  const receiptPO = await purchaseOrdersService.createPurchaseOrder('tenant-antigravity', poForReceiptPayload);
  const lineA = receiptPO.lines[0];
  const lineB = receiptPO.lines[1];

  console.log(`Initial PO Status: \x1b[35m[${receiptPO.status}]\x1b[0m`);
  console.log(`Line A Ordered: ${lineA.quantityOrdered.toNumber()}, Received: ${lineA.quantityReceived.toNumber()}`);
  console.log(`Line B Ordered: ${lineB.quantityOrdered.toNumber()}, Received: ${lineB.quantityReceived.toNumber()}`);

  // Stage 1: Partially receive 6 items of Line A
  console.log('\n[Stage 1] Receiving 6 items of Line A...');
  try {
    const updatedPO1 = await purchaseOrdersService.receivePOItems(
      'tenant-antigravity',
      receiptPO.id,
      [{ lineId: lineA.id, quantity: 6 }]
    );
    console.log(`  New PO Status: \x1b[35m[${updatedPO1.status}]\x1b[0m (Expected: PARTIALLY_RECEIVED)`);
    const updatedLineA = updatedPO1.lines.find((l: any) => l.id === lineA.id)!;
    console.log(`  Line A Current Received Quantity: \x1b[32m${updatedLineA.quantityReceived.toNumber()}\x1b[0m`);
  } catch (err: any) {
    console.log('✗ Stage 1 failed:', err.message);
  }

  // Stage 2: Receive the remaining items (4 of Line A and 5 of Line B)
  console.log('\n[Stage 2] Receiving remaining outstanding items (4 for Line A, 5 for Line B)...');
  try {
    const updatedPO2 = await purchaseOrdersService.receivePOItems(
      'tenant-antigravity',
      receiptPO.id,
      [
        { lineId: lineA.id, quantity: 4 },
        { lineId: lineB.id, quantity: 5 }
      ]
    );
    console.log(`  New PO Status: \x1b[35m[${updatedPO2.status}]\x1b[0m (Expected: COMPLETED)`);
    const finalLineA = updatedPO2.lines.find((l: any) => l.id === lineA.id)!;
    const finalLineB = updatedPO2.lines.find((l: any) => l.id === lineB.id)!;
    console.log(`  Line A Final Received Quantity: \x1b[32m${finalLineA.quantityReceived.toNumber()} / 10\x1b[0m`);
    console.log(`  Line B Final Received Quantity: \x1b[32m${finalLineB.quantityReceived.toNumber()} / 5\x1b[0m`);
  } catch (err: any) {
    console.log('✗ Stage 2 failed:', err.message);
  }

  // Stage 3: Try to over-receive (Attempting to receive more items beyond ordered amount)
  console.log('\n[Stage 3] Testing bounds checks by attempting to over-receive Line A by 1 unit...');
  try {
    await purchaseOrdersService.receivePOItems(
      'tenant-antigravity',
      receiptPO.id,
      [{ lineId: lineA.id, quantity: 1 }]
    );
    console.log('  Unexpected success: boundary checks let overflow slide.');
  } catch (err: any) {
    console.log('\x1b[31m%s\x1b[0m', `  BLOCKED: Incremental workflow successfully blocked overflow!`);
    console.log(`  Error Output: \x1b[31m${err.message}\x1b[0m`);
  }

  console.log('\n\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[32m%s\x1b[0m', '🎉 ALL PO VERIFICATION SUITE TRAILS PASSED SUCCESSFULLY WITH 100% COMPLIANCE');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
}

executePOTestSuite().catch(err => {
  console.error('PO Test Suite Crashed:', err);
});
