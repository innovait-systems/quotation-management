import { Tenant } from '../store/tenantStore';
import { useTemplatesStore } from '../store/templatesStore';
import { getCurrencySymbol } from './currency';
import { useDocumentStore } from '../store/documentStore';

export function generateDocumentHTML(doc: any, type: 'QUOTATION' | 'PURCHASE_ORDER' | 'INVOICE' | 'SERVICE', activeTenant: Tenant): string {
  // Retrieve template configurations from Zustand store
  const template = useTemplatesStore.getState().getTemplate(doc.templateId || type);
  const config = template.config;
  const rawLayoutOrder = template.layoutOrder || [
    'logo_brand',
    'company_details',
    'customer_details',
    'details_box',
    'main_table',
    'custom_fields',
    'upi_qr',
    'signatures',
    'footer_terms'
  ];

  // Map legacy 'logo_brand' to new split 'brand_logo' and 'org_details' blocks
  let layoutOrder = [...rawLayoutOrder];
  const legacyIdx = layoutOrder.indexOf('logo_brand');
  if (legacyIdx !== -1) {
    layoutOrder.splice(legacyIdx, 1, 'brand_logo', 'org_details');
  }
  
  // If 'brand_logo' is present but 'org_details' is missing, ensure it's added
  if (layoutOrder.includes('brand_logo') && !layoutOrder.includes('org_details')) {
    const logoIdx = layoutOrder.indexOf('brand_logo');
    layoutOrder.splice(logoIdx + 1, 0, 'org_details');
  }

  // If document type is INVOICE, automatically insert 'payment_method' before signatures
  if (type === 'INVOICE' && !layoutOrder.includes('payment_method')) {
    const sigIdx = layoutOrder.indexOf('signatures');
    if (sigIdx !== -1) {
      layoutOrder.splice(sigIdx, 0, 'payment_method');
    } else {
      layoutOrder.push('payment_method');
    }
  }

  // Safe check for 'doc_title' and place it after 'org_details' (or at start if missing)
  if (!layoutOrder.includes('doc_title')) {
    const orgIdx = layoutOrder.indexOf('org_details');
    if (orgIdx !== -1) {
      layoutOrder.splice(orgIdx + 1, 0, 'doc_title');
    } else {
      const logoIdx = layoutOrder.indexOf('brand_logo');
      if (logoIdx !== -1) {
        layoutOrder.splice(logoIdx + 1, 0, 'doc_title');
      } else {
        layoutOrder.unshift('doc_title');
      }
    }
  }

  const brandColor = config.accentColor || activeTenant.brandingConfig.primary || '#6366f1';
  const logoUrl = config.logoUrl || activeTenant.logoUrl || '';
  const companyAddress = config.companyAddress || activeTenant.address || '';
  const customerAddress = doc.customerAddress || '';
  
  // Format numbers to local currency strings
  const formatCurrency = (val: number) => {
    const curSym = getCurrencySymbol(doc.currency || activeTenant.currency);
    return `${curSym}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Determine Title, Document Code, Dates, and Partner details
  let docTitle = 'DOCUMENT';
  let docRef = '';
  let dateLabel1 = 'Date Issued';
  let dateVal1 = '';
  let dateLabel2 = 'Valid Until';
  let dateVal2 = '';
  let partnerLabel = 'Customer';
  let partnerName = '';
  let partnerCompany = '';
  let status = doc.status || 'DRAFT';

  if (type === 'QUOTATION') {
    docTitle = 'PROPOSAL / QUOTATION';
    docRef = doc.quoteNumber || 'QT-DRAFT';
    dateLabel1 = 'Date Created';
    dateVal1 = doc.createdAt || new Date().toISOString().substring(0, 10);
    dateLabel2 = 'Valid Until';
    dateVal2 = doc.validUntil || 'N/A';
    partnerLabel = 'Quoted For';
    partnerName = doc.customerName || '';
    partnerCompany = doc.customerCompany || '';
  } else if (type === 'PURCHASE_ORDER') {
    docTitle = 'PURCHASE ORDER';
    docRef = doc.poNumber || 'PO-DRAFT';
    dateLabel1 = 'Date Issued';
    dateVal1 = doc.createdAt || new Date().toISOString().substring(0, 10);
    dateLabel2 = 'Delivery Terms';
    dateVal2 = doc.deliveryTerms || 'N/A';
    partnerLabel = 'Supplier / Vendor';
    partnerName = doc.supplierName || '';
    partnerCompany = doc.supplierCompany || '';
  } else if (type === 'INVOICE') {
    docTitle = 'TAX INVOICE';
    docRef = doc.invoiceNumber || 'INV-DRAFT';
    dateLabel1 = 'Issue Date';
    dateVal1 = doc.issueDate || doc.createdAt || new Date().toISOString().substring(0, 10);
    dateLabel2 = 'Due Date';
    dateVal2 = doc.dueDate || 'N/A';
    partnerLabel = 'Bill To';
    partnerName = doc.customerName || '';
    partnerCompany = doc.customerCompany || '';
  } else if (type === 'SERVICE') {
    docTitle = 'SERVICE SLA DELIVERABLES';
    docRef = doc.serviceNumber || doc.id || 'SVC-DRAFT';
    dateLabel1 = 'Date Created';
    dateVal1 = doc.createdAt || new Date().toISOString().substring(0, 10);
    dateLabel2 = 'SLA Deadline';
    dateVal2 = doc.slaDeadline || 'N/A';
    partnerLabel = 'Client Recipient';
    partnerName = doc.customerName || '';
    partnerCompany = doc.customerCompany || '';
  }

  // Check if dynamic watermark is enabled and document status is unfinalized
  const isDraft = ['DRAFT', 'SUBMITTED', 'OPEN', 'PENDING', 'IN_PROGRESS', 'PENDING_CLIENT'].includes(status.toUpperCase());
  const showWatermark = activeTenant.features.pdf_watermark && isDraft && !!config.watermarkText;

  // Fragment compilers based on block layout sequence
  const blockStyles = config.blockStyles || {};

  const compileLogoBrand = () => {
    return `
      <!-- Brand Headers & Logo (Legacy) -->
      <div class="logo-brand-block" style="
        display: flex;
        flex-direction: column;
        align-items: ${config.headerAlign === 'left' ? 'flex-start' : config.headerAlign === 'right' ? 'flex-end' : 'center'};
        text-align: ${config.headerAlign};
        width: 100%;
      ">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 50px; max-width: 240px; object-fit: contain; border-radius: 8px; margin-bottom: 12px;" />` : ''}
        <h1 class="brand-title" style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">${activeTenant.name}</h1>
        <p class="brand-sub" style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">SaaS Multi-Tenant Enterprise Services</p>
      </div>
    `;
  };

  const compileBrandLogo = () => {
    return `
      <!-- Brand Logo -->
      <div class="brand-logo-block" style="
        display: flex;
        flex-direction: column;
        align-items: ${config.headerAlign === 'left' ? 'flex-start' : config.headerAlign === 'right' ? 'flex-end' : 'center'};
        width: 100%;
      ">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 50px; max-width: 240px; object-fit: contain; border-radius: 8px;" />` : `<div style="height: 50px; width: 50px; background-color: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; font-weight: 600;">No Logo</div>`}
      </div>
    `;
  };

  const compileOrgDetails = () => {
    return `
      <!-- Organization details -->
      <div class="org-details-block" style="
        display: flex;
        flex-direction: column;
        align-items: ${config.headerAlign === 'left' ? 'flex-start' : config.headerAlign === 'right' ? 'flex-end' : 'center'};
        text-align: ${config.headerAlign};
        width: 100%;
      ">
        <h1 class="brand-title" style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">${activeTenant.name}</h1>
        <p class="brand-sub" style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Multi-tenant Cloud Services</p>
      </div>
    `;
  };

  const compileSpacer = () => {
    const heightVal = config.spacerHeights?.['spacer'] || 'medium';
    const spacerHeightsMap = {
      none: 0,
      small: 12,
      medium: 24,
      large: 36,
      xl: 48
    };
    const heightPx = spacerHeightsMap[heightVal];
    return `
      <!-- Dynamic Spacer Block -->
      <div class="spacer-block" style="height: ${heightPx}px; width: 100%; clear: both;"></div>
    `;
  };

  const compileDocTitle = () => {
    return `
      <!-- Dynamic Document Title Block -->
      <div class="doc-title-block" style="
        display: flex;
        flex-direction: column;
        align-items: ${config.headerAlign === 'left' ? 'flex-start' : config.headerAlign === 'right' ? 'flex-end' : 'center'};
        text-align: ${config.headerAlign};
        border-bottom: 2px solid ${brandColor};
        padding-bottom: 12px;
        width: 100%;
      ">
        <h2 class="doc-type" style="margin: 0; font-size: 20px; font-weight: 800; color: ${brandColor}; letter-spacing: 0.02em; text-transform: uppercase;">${docTitle}</h2>
        <p class="doc-id" style="margin: 4px 0 0 0; font-family: monospace; font-size: 15px; font-weight: 700; color: #0f172a;">${docRef}</p>
      </div>
    `;
  };

  const compileCompanyDetails = () => {
    const isCard = (blockStyles['company_details'] || 'plain') === 'card';
    const cardStyle = isCard 
      ? `background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 16px 20px;`
      : 'padding: 0;';
    return `
      <!-- Company Details Block -->
      <div class="company-details" style="page-break-inside: avoid; ${cardStyle}">
        <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Company Details</div>
        <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${activeTenant.name}</h3>
        <p style="font-size: 12px; color: #475569; margin: 0 0 6px 0;">Service Provider</p>
        ${companyAddress ? `
          <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; font-size: 11px; color: #64748b;">
            <span style="font-weight: 600; color: #475569;">Company Address:</span>
            <div style="white-space: pre-line; line-height: 1.5; margin-top: 2px;">${companyAddress}</div>
            ${activeTenant.gstNumber ? `
              <div style="margin-top: 6px; font-family: monospace; font-size: 10px; font-weight: 600; color: #0f172a; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
                GSTIN: ${activeTenant.gstNumber}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  };

  const compileCustomerDetails = () => {
    if (!config.showBillingAddress) return '';
    const isCard = (blockStyles['customer_details'] || 'card') !== 'plain';
    const cardStyle = isCard 
      ? `background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 16px 20px;`
      : 'padding: 0;';
    return `
      <!-- Customer Billing Address -->
      <div class="party-box" style="page-break-inside: avoid; ${cardStyle}">
        <div class="party-label" style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">${partnerLabel}</div>
        <h3 class="party-org" style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${partnerCompany || 'N/A'}</h3>
        <p class="party-name" style="font-size: 12px; color: #475569; margin: 0 0 6px 0;">${partnerName || 'Authorized Contact'}</p>
        ${customerAddress ? `
          <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; font-size: 11px; color: #64748b;">
            <span style="font-weight: 600; color: #475569;">Billing Address:</span>
            <div style="white-space: pre-line; line-height: 1.5; margin-top: 2px;">${customerAddress}</div>
          </div>
        ` : ''}
      </div>
    `;
  };

  const compileDetailsBox = () => {
    if (!config.showDetailsBox) return '';
    const isCard = (blockStyles['details_box'] || 'card') !== 'plain';
    const cardStyle = isCard 
      ? `background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 20px;`
      : 'padding: 0;';
    return `
      <!-- Document details box -->
      <div class="details-box" style="page-break-inside: avoid; width: 100%; ${cardStyle}">
        <div class="party-label" style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Document Details</div>
        <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
          <span class="details-lbl" style="color: #64748b; font-weight: 500;">${dateLabel1}</span>
          <span class="details-val" style="color: #0f172a; font-weight: 700; text-align: right;">${dateVal1}</span>
        </div>
        <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
          <span class="details-lbl" style="color: #64748b; font-weight: 500;">${dateLabel2}</span>
          <span class="details-val" style="color: #0f172a; font-weight: 700; text-align: right;">${dateVal2}</span>
        </div>
        ${type === 'SERVICE' ? `
          <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
            <span class="details-lbl" style="color: #64748b; font-weight: 500;">Assigned Team</span>
            <span class="details-val" style="color: #0f172a; font-weight: 700; text-align: right;">${doc.assignedTeam || 'DevOps Team'}</span>
          </div>
        ` : ''}
        ${doc.paymentTerms ? `
          <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
            <span class="details-lbl" style="color: #64748b; font-weight: 500;">Payment Terms</span>
            <span class="details-val" style="color: #0f172a; font-weight: 700; text-align: right;">${doc.paymentTerms}</span>
          </div>
        ` : ''}
        ${config.showStatus !== false ? `
          <div class="details-row" style="display: flex; justify-content: space-between; font-size: 11px;">
            <span class="details-lbl" style="color: #64748b; font-weight: 500;">Status</span>
            <span class="details-val" style="color: ${isDraft ? '#f59e0b' : '#10b981'}; font-weight: 800; text-align: right;">${status}</span>
          </div>
        ` : ''}
      </div>
    `;
  };

  const compileMainTable = () => {
    let tableAndTotalsBlock = '';
    if (type !== 'SERVICE') {
      const customCols = doc.customColumns || [];
      const descWidth = Math.max(20, 45 - (customCols.length * 10));

      // Render Table Headings dynamically based on item types
      let tableHeadings = '';
      if (type === 'PURCHASE_ORDER') {
        tableHeadings = `
          <tr>
            <th style="text-align: left; width: ${descWidth}%;">Item & Description</th>
            ${customCols.map((c: any) => `<th style="text-align: right; width: 10%;">${c.label}</th>`).join('')}
            <th style="text-align: right; width: 12%;">Qty Ordered</th>
            <th style="text-align: right; width: 12%;">Qty Received</th>
            <th style="text-align: right; width: 15%;">Unit Price</th>
            <th style="text-align: right; width: 16%;">Total</th>
          </tr>
        `;
      } else {
        tableHeadings = `
          <tr>
            <th style="text-align: left; width: ${descWidth}%;">Item & Description</th>
            ${customCols.map((c: any) => `<th style="text-align: right; width: 10%;">${c.label}</th>`).join('')}
            <th style="text-align: right; width: 10%;">Qty</th>
            <th style="text-align: right; width: 15%;">Unit Price</th>
            <th style="text-align: right; width: 10%;">Tax</th>
            <th style="text-align: right; width: 10%;">Discount</th>
            <th style="text-align: right; width: 10%;">Total</th>
          </tr>
        `;
      }

      // Render Line Items rows
      let lineRows = '';
      const lines = doc.lines || [];
      lines.forEach((line: any) => {
        const customCells = customCols.map((c: any) => `<td style="text-align: right; font-weight: 600; color: #475569;">${line[c.key] !== undefined ? String(line[c.key]) : '—'}</td>`).join('');
        if (type === 'PURCHASE_ORDER') {
          const qOrd = line.quantityOrdered || 0;
          const qRec = line.quantityReceived || 0;
          const price = line.unitPrice || 0;
          const rowTotal = line.total || (qOrd * price * (1 + (line.taxRate || 18) / 100));
          
          lineRows += `
            <tr>
              <td style="text-align: left; font-weight: 500;">${line.description || 'Custom line item'}</td>
              ${customCells}
              <td style="text-align: right; font-weight: 600;">${qOrd}</td>
              <td style="text-align: right;">${qRec}</td>
              <td style="text-align: right;">${formatCurrency(price)}</td>
              <td style="text-align: right; font-weight: 700;">${formatCurrency(rowTotal)}</td>
            </tr>
          `;
        } else {
          const qty = line.quantity || 0;
          const price = line.unitPrice || 0;
          const discount = line.discount || 0;
          const taxRate = line.taxRate || 18;
          const rowTotal = (qty * price - discount) * (1 + taxRate / 100);

          lineRows += `
            <tr>
              <td style="text-align: left; font-weight: 500;">${line.description || 'Custom line item'}</td>
              ${customCells}
              <td style="text-align: right; font-weight: 600;">${qty}</td>
              <td style="text-align: right;">${formatCurrency(price)}</td>
              <td style="text-align: right; color: #888;">${taxRate}%</td>
              <td style="text-align: right; color: ${discount > 0 ? '#ef4444' : '#888'};">
                ${discount > 0 ? `-${formatCurrency(discount)}` : '—'}
              </td>
              <td style="text-align: right; font-weight: 700;">${formatCurrency(rowTotal)}</td>
            </tr>
          `;
        }
      });

      tableAndTotalsBlock = `
        <!-- Main Table Block -->
        <div>
          <table>
            <thead>
              ${tableHeadings}
            </thead>
            <tbody>
              ${lineRows}
            </tbody>
          </table>

          ${config.borderStyle === 'accent' ? `<div style="height: 3px; background-color: ${brandColor}; width: 100%; border-radius: 2px; margin-top: 10px;"></div>` : ''}

          <!-- Totals Section -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td class="totals-lbl">Subtotal</td>
                <td class="totals-val">${formatCurrency(doc.subTotal || 0)}</td>
              </tr>
              <tr>
                <td class="totals-lbl">Tax Total</td>
                <td class="totals-val">${formatCurrency(doc.taxTotal || 0)}</td>
              </tr>
              ${doc.discountTotal > 0 ? `
                <tr>
                  <td class="totals-lbl" style="color: #ef4444;">Discount</td>
                  <td class="totals-val" style="color: #ef4444;">-${formatCurrency(doc.discountTotal)}</td>
                </tr>
              ` : ''}
              <tr class="grand-tr">
                <td class="grand-lbl">Grand Total</td>
                <td class="grand-val" style="color: ${brandColor};">${formatCurrency(doc.grandTotal || 0)}</td>
              </tr>
              ${doc.balanceDue !== undefined ? `
                <tr>
                  <td class="totals-lbl" style="font-weight: 700; color: #475569;">Balance Due</td>
                  <td class="totals-val" style="font-weight: 800; color: ${doc.balanceDue > 0 ? '#b45309' : '#10b981'};">
                    ${formatCurrency(doc.balanceDue)}
                  </td>
                </tr>
              ` : ''}
            </table>
          </div>
        </div>
      `;
    } else {
      // Generate Custom Layout Block for SLA Ticket Deliverables
      const now = new Date();
      const deadline = new Date(doc.slaDeadline);
      const diffMs = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / 86400000);
      const isExpired = diffMs < 0;
      const pct = doc.dynamicValues?.completion_percentage || 0;

      let activitiesHtml = '';
      if (doc.activities && doc.activities.length > 0) {
        activitiesHtml = doc.activities.map((act: any) => `
          <div style="position: relative; margin-bottom: 20px; padding-left: 20px;">
            <!-- Timeline dot -->
            <div style="position: absolute; left: -26px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background-color: ${brandColor}; border: 2px solid white; box-shadow: 0 0 0 2px ${brandColor}22;"></div>
            <div style="font-size: 11px; font-weight: 700; color: #1e293b;">${act.content}</div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">
              <span style="font-weight: 700; color: #64748b;">${act.user}</span> &bull; ${act.timestamp}
            </div>
          </div>
        `).join('');
      }

      tableAndTotalsBlock = `
        <!-- SLA Progress Block -->
        <div style="page-break-inside: avoid;">
          <!-- SLA Progress Card -->
          <div style="background-color: ${brandColor}08; border: 1px solid ${brandColor}18; border-radius: 16px; padding: 20px; margin-top: 10px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">SLA Service Resolution</div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">Resolution Milestones</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 15px; font-weight: 800; color: ${brandColor};">${pct}% Complete</div>
                <div style="font-size: 9px; font-weight: 700; color: ${isExpired ? '#ef4444' : diffDays <= 3 ? '#f59e0b' : '#64748b'}; margin-top: 2px;">
                  ${isExpired ? `${Math.abs(diffDays)} Days OVERDUE` : `${diffDays} Days Remaining`}
                </div>
              </div>
            </div>
            <div style="height: 8px; width: 100%; background-color: #cbd5e144; border-radius: 999px; overflow: hidden; margin-top: 8px;">
              <div style="height: 100%; border-radius: 999px; width: ${pct}%; background-color: ${brandColor}; transition: width 0.5s ease;"></div>
            </div>
          </div>

          <!-- Scope Description -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin-top: 16px; page-break-inside: avoid;">
            <h4 style="font-size: 9px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">Service Ticket Scope & Details</h4>
            <p style="font-size: 11px; color: #334155; line-height: 1.6; margin: 0; white-space: pre-line;">${doc.description || 'No scope description provided.'}</p>
          </div>

          <!-- Activities Feed -->
          ${activitiesHtml ? `
            <div style="margin-top: 20px; page-break-inside: avoid;">
              <h4 style="font-size: 9px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">Chronological Activity & Log Timeline</h4>
              <div style="position: relative; padding-left: 20px; border-left: 2px dashed #cbd5e1; margin-left: 10px;">
                ${activitiesHtml}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }
    return tableAndTotalsBlock;
  };

  const compileCustomFields = () => {
    const dynamicValues = doc.dynamicValues || {};
    const hasDynamic = Object.keys(dynamicValues).length > 0;
    
    if (hasDynamic && config.showCustomFields) {
      let fieldsHtml = '';
      Object.entries(dynamicValues).forEach(([key, val]) => {
        // Exclude service resolution statistics in dynamic grid to prevent duplication
        if (type === 'SERVICE' && ['priority', 'estimated_hours', 'completion_percentage'].includes(key)) {
          return;
        }
        const formattedKey = key.replace(/_/g, ' ').toUpperCase();
        const formattedVal = typeof val === 'boolean' ? (val ? 'YES' : 'NO') : String(val);
        fieldsHtml += `
          <div style="background-color: ${brandColor}06; border: 1px solid ${brandColor}12; border-radius: 12px; padding: 12px 16px; min-width: 140px; flex-grow: 1;">
            <div style="font-size: 8px; font-weight: 700; color: ${brandColor}; letter-spacing: 0.05em; margin-bottom: 4px;">${formattedKey}</div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b;">${formattedVal}</div>
          </div>
        `;
      });

      if (fieldsHtml) {
        return `
          <!-- Custom Metadata Block -->
          <div style="page-break-inside: avoid;">
            <h4 style="font-size: 9px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Dynamic Document Metadata</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
              ${fieldsHtml}
            </div>
          </div>
        `;
      }
    }
    return '';
  };

  const compileUpiQr = () => {
    if (type !== 'INVOICE' || !config.showQrCode) return '';
    return `
      <!-- UPI QR Code Block -->
      <div style="page-break-inside: avoid;">
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 10px 14px; display: inline-flex; align-items: center; gap: 10px; max-width: 240px;">
          <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0H14V14H0V0ZM2 2V12H12V2H2Z" fill="#166534"/>
              <path d="M4 4H10V10H4V4Z" fill="#166534"/>
              <path d="M22 0H36V14H22V0ZM24 2V12H34V2H24Z" fill="#166534"/>
              <path d="M26 4H32V10H26V4Z" fill="#166534"/>
              <path d="M0 22H14V36H0V22ZM2 24V34H12V24H2Z" fill="#166534"/>
              <path d="M4 26H10V32H4V26Z" fill="#166534"/>
              <path d="M18 4H20V6H18V4ZM16 8H18V10H16V8ZM18 10H20V12H18V10ZM16 12H18V14H16V12ZM20 16H22V18H20V16ZM18 18H20V20H18V18ZM16 20H18V22H16V20ZM20 22H22V24H20V22ZM22 26H24V28H22V26ZM24 28H26V30H24V28ZM22 30H24V32H22V30ZM24 32H26V34H24V32ZM20 34H22V36H20V34Z" fill="#166534"/>
            </svg>
          </div>
          <div style="font-size: 10px; line-height: 1.3;">
            <div style="font-weight: 800; color: #166534;">Scan to Pay via UPI</div>
            <div style="color: #666; font-size: 8px;">Instant & Secure Merchant Settlement</div>
          </div>
        </div>
      </div>
    `;
  };

  const compilePaymentMethodAndContact = () => {
    if (type !== 'INVOICE') return '';

    // Find signatory details with fallback values
    const authorizedPerson = activeTenant.authorizedPersons?.find((p: any) => p.id === doc.authorizedPersonId) || activeTenant.authorizedPersons?.[0] || {
      name: '',
      designation: '',
      email: '',
      phone: ''
    };

    // Find bank details with fallback values
    const bank = activeTenant.bankDetails && activeTenant.bankDetails.accountNo
      ? activeTenant.bankDetails
      : {
          accountNo: '—',
          beneficiaryName: '—',
          bankName: '—',
          ifscCode: '—',
          swiftCode: '—',
          branch: '—'
        };

    return `
      <!-- Payment Method & Contact Details Block -->
      <div class="payment-method-block" style="page-break-inside: avoid; display: flex; flex-wrap: wrap; gap: 16px; margin-top: 25px; margin-bottom: 25px; width: 100%;">
        <!-- Bank Details Card -->
        <div style="flex: 1; min-width: 260px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 20px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Payment Method (Bank Details)</div>
          <table style="width: 100%; font-size: 11px; margin-top: 0; border-collapse: collapse; background: transparent;">
            <tr style="border: none;"><td style="padding: 4px 0; color: #64748b; font-weight: 600; border: none; width: 40%;">A/c No:</td><td style="padding: 4px 0; color: #0f172a; font-weight: 700; border: none; font-family: monospace;">${bank.accountNo}</td></tr>
            <tr style="border: none;"><td style="padding: 4px 0; color: #64748b; font-weight: 600; border: none;">Name:</td><td style="padding: 4px 0; color: #0f172a; font-weight: 700; border: none;">${bank.beneficiaryName}</td></tr>
            <tr style="border: none;"><td style="padding: 4px 0; color: #64748b; font-weight: 600; border: none;">Bank:</td><td style="padding: 4px 0; color: #0f172a; font-weight: 700; border: none;">${bank.bankName}</td></tr>
            <tr style="border: none;"><td style="padding: 4px 0; color: #64748b; font-weight: 600; border: none;">IFSC Code:</td><td style="padding: 4px 0; color: #0f172a; font-weight: 700; border: none; font-family: monospace;">${bank.ifscCode}</td></tr>
            <tr style="border: none;"><td style="padding: 4px 0; color: #64748b; font-weight: 600; border: none;">Swift Code:</td><td style="padding: 4px 0; color: #0f172a; font-weight: 700; border: none; font-family: monospace;">${bank.swiftCode}</td></tr>
            <tr style="border: none;"><td style="padding: 4px 0; color: #64748b; font-weight: 600; border: none;">Branch:</td><td style="padding: 4px 0; color: #0f172a; font-weight: 700; border: none;">${bank.branch}</td></tr>
          </table>
        </div>

        <!-- Contact Details Card -->
        <div style="flex: 1; min-width: 260px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 20px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Seller Contact Details</div>
          <table style="width: 100%; font-size: 11px; margin-top: 0; border-collapse: collapse; background: transparent;">
            <tr style="border: none;"><td style="padding: 5px 0; color: #64748b; font-weight: 600; border: none; width: 40%;">Contact Name:</td><td style="padding: 5px 0; color: #0f172a; font-weight: 700; border: none;">${authorizedPerson.name}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 0; color: #64748b; font-weight: 600; border: none;">Designation:</td><td style="padding: 5px 0; color: #0f172a; font-weight: 700; border: none;">${authorizedPerson.designation}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 0; color: #64748b; font-weight: 600; border: none;">Email:</td><td style="padding: 5px 0; color: #6366f1; font-weight: 700; border: none; font-family: monospace;">${authorizedPerson.email || ''}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 0; color: #64748b; font-weight: 600; border: none;">Phone:</td><td style="padding: 5px 0; color: #0f172a; font-weight: 700; border: none; font-family: monospace;">${authorizedPerson.phone || ''}</td></tr>
          </table>
        </div>
      </div>
    `;
  };

  const compileSignatures = () => {
    // For SERVICE type, we only show signature if an authorizedPersonId is explicitly selected on the document.
    // For other types, we also show it if config.showSignature is enabled.
    if (type === 'SERVICE' && !doc.authorizedPersonId) return '';
    if (type !== 'SERVICE' && !config.showSignature && !doc.authorizedPersonId) return '';

    // Find the specific authorized person
    const authorizedPerson = activeTenant.authorizedPersons?.find((p: any) => p.id === doc.authorizedPersonId);

    // If type is not SERVICE, and no specific person is selected, and showSignature is true, we fallback to empty strings
    const nameToDisplay = authorizedPerson ? authorizedPerson.name : '';
    const designationToDisplay = authorizedPerson ? authorizedPerson.designation : '';
    const sigUrl = authorizedPerson?.signatureUrl;

    return `
      <!-- Signature Block -->
      <div style="display: flex; justify-content: flex-end; page-break-inside: avoid; margin-top: 25px;">
        <div style="text-align: right; min-width: 200px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
          <!-- 1. Text label Authorized Signature -->
          <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">Authorized Signature</div>
          
          <!-- 2. Signature (Optional) -->
          ${sigUrl ? `
            <div style="height: 50px; display: flex; align-items: center; justify-content: flex-end; margin-bottom: 4px;">
              <img src="${sigUrl}" alt="Signature" style="max-height: 48px; max-width: 160px; object-fit: contain;" />
            </div>
          ` : `
            <div style="height: 35px; border-bottom: 1px dashed #cbd5e1; width: 140px; margin-bottom: 4px;"></div>
          `}
          
          <!-- 3. Authorized Person Name & Title -->
          <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 4px;">${nameToDisplay}</div>
          <div style="font-size: 9px; font-weight: 500; color: #64748b;">${designationToDisplay}</div>
        </div>
      </div>
    `;
  };

  const compileFooterTerms = () => {
    const mergedTerms = [config.footerTerms, doc.terms || doc.deliveryTerms].filter(Boolean).join('\n\n');
    if (!mergedTerms) return '';
    return `
      <!-- Terms & notes block -->
      <div style="margin-top: 16px; border-top: 1px dashed #e2e8f0; padding-top: 20px; page-break-inside: avoid;">
        <h4 style="font-size: 9px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Terms, Agreements & Notes</h4>
        <p style="font-size: 10px; color: #64748b; line-height: 1.6; font-style: italic; margin: 0; white-space: pre-line;">${mergedTerms}</p>
      </div>
    `;
  };

  // Dynamic block compilation resolver supporting custom spacers and user-defined layouts
  const compileBlock = (blockId: string) => {
    if (blockId.startsWith('spacer')) {
      const heightVal = config.spacerHeights?.[blockId] || 'medium';
      const spacerHeightsMap = {
        none: 0,
        small: 12,
        medium: 24,
        large: 36,
        xl: 48
      };
      const heightPx = spacerHeightsMap[heightVal];
      return `
        <!-- Dynamic Spacer Block -->
        <div class="spacer-block" style="height: ${heightPx}px; width: 100%; clear: both;"></div>
      `;
    }

    switch (blockId) {
      case 'logo_brand': return compileLogoBrand();
      case 'brand_logo': return compileBrandLogo();
      case 'org_details': return compileOrgDetails();
      case 'doc_title': return compileDocTitle();
      case 'company_details': return compileCompanyDetails();
      case 'customer_details': return compileCustomerDetails();
      case 'details_box': return compileDetailsBox();
      case 'main_table': return compileMainTable();
      case 'custom_fields': return compileCustomFields();
      case 'upi_qr': return compileUpiQr();
      case 'payment_method': return compilePaymentMethodAndContact();
      case 'signatures': return compileSignatures();
      case 'footer_terms': return compileFooterTerms();
      default: return '';
    }
  };

  // Filter layoutOrder to only include visible blocks with non-empty output and respect explicit hiding
  const visibleBlocks = layoutOrder.filter(blockId => {
    if (config.hiddenBlocks?.[blockId]) {
      return false;
    }
    const html = compileBlock(blockId);
    return html && html.trim() !== '';
  });

  const widths = config.blockWidths || {};
  let bodyContent = `
    <div style="display: flex; flex-wrap: wrap; gap: 16px; width: 100%; align-items: flex-start;">
  `;

  visibleBlocks.forEach((blockId) => {
    const width = widths[blockId] || 'full';
    let widthStyle = 'width: 100%;';
    if (width === 'half') {
      widthStyle = 'width: calc(50% - 8px);';
    } else if (width === 'third') {
      widthStyle = 'width: calc(33.333% - 11px);';
    }

    bodyContent += `
      <div style="${widthStyle} min-width: 0; page-break-inside: avoid;">
        ${compileBlock(blockId)}
      </div>
    `;
  });

  bodyContent += `
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="en" style="color-scheme: light;">
    <head>
      <meta charset="UTF-8">
      <meta name="color-scheme" content="light">
      <title>${docRef}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        :root {
          color-scheme: light;
        }
        html {
          color-scheme: light;
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          font-family: '${config.fontFamily}', sans-serif;
        }
        body {
          margin: 0;
          padding: 18mm 15mm;
          width: 210mm;
          min-height: 297mm;
          color: #1e293b !important;
          background-color: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-scheme: light;
        }
        .container {
          width: 100%;
          position: relative;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }
        .brand-sub {
          font-size: 11px;
          color: #64748b;
          margin: 0;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .doc-meta {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .doc-type {
          font-size: 20px;
          font-weight: 800;
          color: ${brandColor};
          margin: 0;
          letter-spacing: 0.02em;
        }
        .doc-id {
          font-family: monospace;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .meta-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 35px;
          gap: 20px;
        }
        .party-box {
          flex: 1;
        }
        .party-label {
          font-size: 9px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }
        .party-org {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .party-name {
          font-size: 12px;
          color: #475569;
          margin: 0;
        }
        .details-box {
          width: 100%;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 11px;
        }
        .details-row:last-child {
          margin-bottom: 0;
        }
        .details-lbl {
          color: #64748b;
          font-weight: 500;
        }
        .details-val {
          color: #0f172a;
          font-weight: 700;
          text-align: right;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 12px;
        }
        th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.08em;
          padding: 12px 14px;
          border: none;
        }
        th:first-child {
          border-radius: 8px 0 0 8px;
        }
        th:last-child {
          border-radius: 0 8px 8px 0;
          background-color: ${brandColor};
        }
        td {
          padding: 14px 14px;
          border-bottom: ${
            config.borderStyle === 'thin'
              ? '1px solid #f1f5f9'
              : config.borderStyle === 'dotted'
              ? '1px dashed #cbd5e1'
              : config.borderStyle === 'accent'
              ? `1px solid ${brandColor}33`
              : 'none'
          };
          color: #334155;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 25px;
          page-break-inside: avoid;
        }
        .totals-table {
          width: 280px;
          font-size: 12px;
          margin: 0;
        }
        .totals-table td {
          padding: 8px 14px;
          border: none;
        }
        .totals-lbl {
          color: #64748b;
          font-weight: 500;
        }
        .totals-val {
          text-align: right;
          font-weight: 700;
          color: #0f172a;
        }
        .grand-tr {
          border-top: 1px solid #e2e8f0;
        }
        .grand-tr td {
          padding-top: 14px !important;
        }
        .grand-lbl {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }
        .grand-val {
          font-size: 16px;
          font-weight: 800;
        }
        .watermark {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 70px;
          font-weight: 900;
          color: rgba(239, 68, 68, 0.05);
          border: 8px solid rgba(239, 68, 68, 0.05);
          padding: 15px 35px;
          border-radius: 20px;
          letter-spacing: 8px;
          text-transform: uppercase;
          pointer-events: none;
          white-space: nowrap;
          z-index: 9999;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${showWatermark ? `<div class="watermark">${config.watermarkText}</div>` : ''}
        ${bodyContent}
      </div>
    </body>
    </html>
  `;
  return html;
}

export function exportDocumentToPDF(doc: any, type: 'QUOTATION' | 'PURCHASE_ORDER' | 'INVOICE' | 'SERVICE', activeTenant: Tenant, mode: 'print' | 'download' = 'print') {
  const docRef = type === 'QUOTATION' ? (doc.quoteNumber || 'QT-DRAFT')
    : type === 'PURCHASE_ORDER' ? (doc.poNumber || 'PO-DRAFT')
    : type === 'INVOICE' ? (doc.invoiceNumber || 'INV-DRAFT')
    : (doc.id || 'SVC-DRAFT');
  const filename = `${docRef.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

  if (mode === 'download' && doc.pdfBase64) {
    try {
      const byteCharacters = atob(doc.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      return;
    } catch (e) {
      console.error('Failed to download cached PDF, regenerating...', e);
    }
  }

  const html = generateDocumentHTML(doc, type, activeTenant);

  if (mode === 'download') {
    const filename = `${docRef.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

    // 1. Create a beautiful, premium loading overlay in the parent window
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(9, 9, 11, 0.7)';
    overlay.style.backdropFilter = 'blur(10px) saturate(180%)';
    overlay.style.setProperty('-webkit-backdrop-filter', 'blur(10px) saturate(180%)');
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '100000';
    overlay.style.color = '#ffffff';
    overlay.style.fontFamily = "'Plus Jakarta Sans', 'Inter', sans-serif";
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';

    overlay.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 28px 40px; border-radius: 24px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <!-- Spinning outer ring -->
          <div style="width: 56px; height: 56px; border: 3px solid rgba(99, 102, 241, 0.15); border-radius: 50%; border-top-color: #6366f1; animation: spin 1s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite;"></div>
          <!-- Pulse dot -->
          <div style="position: absolute; width: 12px; height: 12px; background-color: #6366f1; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;"></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.015em; color: #f8fafc;">Generating Document</h3>
          <p style="margin: 0; font-size: 13px; color: #94a3b8; max-width: 280px; line-height: 1.5;">Preparing layout, styles and high-fidelity PDF...</p>
        </div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(overlay);
    // Force reflow and fade in
    overlay.getBoundingClientRect();
    overlay.style.opacity = '1';

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(overlay)) document.body.removeChild(overlay);
        }, 300);
      }
    };

    // POST request to backend render endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = `${baseUrl}/api/v1/exports/pdf/render`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': activeTenant.slug,
      },
      body: JSON.stringify({
        html,
        filename,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Server returned ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Convert Blob to Base64 and store it in database
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1];
          const docStore = useDocumentStore.getState();
          if (type === 'QUOTATION') {
            docStore.updateQuotation({ ...doc, pdfBase64: base64String });
          } else if (type === 'INVOICE') {
            docStore.updateInvoice({ ...doc, pdfBase64: base64String });
          } else if (type === 'PURCHASE_ORDER') {
            docStore.updatePurchaseOrder({ ...doc, pdfBase64: base64String });
          } else if (type === 'SERVICE') {
            docStore.updateService({ ...doc, pdfBase64: base64String });
          }
        };
        reader.readAsDataURL(blob);

        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
          cleanup();
        }, 100);
      })
      .catch((err) => {
        console.error('Server PDF compilation failed:', err);
        alert(`Failed to download PDF: ${err.message || err}`);
        cleanup();
      });
  } else {
    // Dynamic Iframe Print Driver invocation
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.left = '-1000px';
    iframe.style.top = '-1000px';
    iframe.style.colorScheme = 'light';

    document.body.appendChild(iframe);

    const docFrame = iframe.contentWindow?.document || iframe.contentDocument;
    if (docFrame) {
      docFrame.open();
      docFrame.write(html);
      docFrame.close();

      // Small delay to ensure styles and web fonts are active in page scope prior to print trigger
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Clean up DOM node to avoid leakage
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  }
}
