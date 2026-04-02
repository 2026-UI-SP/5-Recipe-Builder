interface GroupedCategory {
  category: string;
  icon: string;
  items: { item: { food: string; quantity: { value: number; unit: string } }; originalIndex: number }[];
}

export function formatShoppingListText(grouped: GroupedCategory[]): string {
  const lines: string[] = ["Shopping List", ""];
  for (const group of grouped) {
    lines.push(`${group.icon} ${group.category}`);
    for (const { item } of group.items) {
      const qty = item.quantity.value % 1 === 0
        ? item.quantity.value.toString()
        : item.quantity.value.toFixed(1);
      lines.push(`  - ${item.food} (${qty} ${item.quantity.unit})`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try {
    success = document.execCommand("copy");
  } catch { /* ignore */ }
  document.body.removeChild(textarea);
  return success;
}

export async function shareShoppingList(
  text: string,
  onSnackbar: (msg: string) => void
): Promise<void> {
  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title: "Shopping List", text });
      return;
    } catch (err: any) {
      if (err.name === "AbortError") return; // user cancelled
      // Other errors (NotAllowedError, etc.) — fall through to clipboard
    }
  }

  // Try modern clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      onSnackbar("Shopping list copied to clipboard");
      return;
    } catch { /* fall through */ }
  }

  // Final fallback: execCommand
  if (fallbackCopy(text)) {
    onSnackbar("Shopping list copied to clipboard");
  } else {
    onSnackbar("Failed to share or copy shopping list");
  }
}
