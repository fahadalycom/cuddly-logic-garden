export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatWhatsAppProductInfo(product: { name: string; description?: string | null; base_price: number }, variants?: { name: string; price: number }[]): string {
  let msg = `*${product.name}*\n`;
  if (product.description) msg += `${product.description}\n`;
  msg += `\nBase Price: ${formatCurrency(product.base_price)}`;
  if (variants?.length) {
    msg += "\n\n*Plans:*";
    variants.forEach((v) => {
      msg += `\n• ${v.name}: ${formatCurrency(v.price)}`;
    });
  }
  return msg;
}
