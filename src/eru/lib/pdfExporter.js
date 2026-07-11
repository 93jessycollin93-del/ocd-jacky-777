import jsPDF from 'jspdf';

export async function generatePortfolioPDF(portfolioData, marketData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 15;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 230, 118);
  doc.text('Portfolio Summary', 15, yPos);
  yPos += 10;

  // Date & time
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, yPos);
  yPos += 8;

  // Portfolio stats
  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text('Account Overview', 15, yPos);
  yPos += 6;

  doc.setFontSize(9);
  const stats = [
    `Total Balance: $${(portfolioData.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `Total Invested: $${(portfolioData.totalInvested || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `Net Gain/Loss: $${(portfolioData.netGainLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `ROI: ${(portfolioData.roi || 0).toFixed(2)}%`,
  ];

  stats.forEach(stat => {
    doc.text(stat, 15, yPos);
    yPos += 5;
  });

  yPos += 4;

  // Market Data Table
  if (marketData && marketData.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.text('Market Snapshot', 15, yPos);
    yPos += 8;

    // Table headers
    doc.setFontSize(8);
    doc.setTextColor(0, 230, 118);
    const headers = ['Symbol', 'Price', 'Change %', 'Time'];
    const colWidth = (pageWidth - 30) / 4;
    headers.forEach((header, i) => {
      doc.text(header, 15 + i * colWidth, yPos);
    });
    yPos += 5;

    // Table rows
    doc.setTextColor(180, 180, 180);
    marketData.slice(0, 10).forEach(asset => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }
      const symbol = asset.symbol || '';
      const price = `$${(asset.price || 0).toFixed(2)}`;
      const change = `${(asset.change || 0).toFixed(2)}%`;
      const time = new Date().toLocaleTimeString();

      doc.text(symbol, 15, yPos);
      doc.text(price, 15 + colWidth, yPos);
      doc.text(change, 15 + colWidth * 2, yPos);
      doc.text(time, 15 + colWidth * 3, yPos);
      yPos += 5;
    });
  }

  // Footer
  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('This report is for informational purposes only. Not financial advice.', 15, yPos);

  // Download
  doc.save(`Portfolio_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function generateAppWidePDF(appData) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 15;

  doc.setFontSize(20);
  doc.setTextColor(0, 230, 118);
  doc.text('App Data Export', 15, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, yPos);
  yPos += 8;

  const sections = [
    ['Portfolio', appData.portfolioData],
    ['Market Data', appData.marketData],
    ['Alerts', appData.alerts],
    ['Notifications', appData.notifications],
  ];

  sections.forEach(([title, value]) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.text(title, 15, yPos);
    yPos += 6;

    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    const lines = doc.splitTextToSize(JSON.stringify(value, null, 2), 180);
    lines.forEach((line) => {
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
      }
      doc.text(line, 15, yPos);
      yPos += 4;
    });

    yPos += 4;
  });

  doc.save(`App_Data_${new Date().toISOString().split('T')[0]}.pdf`);
}