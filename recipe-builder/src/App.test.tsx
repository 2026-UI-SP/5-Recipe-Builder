import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock useMediaQuery before importing App
jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: () => false,
  };
});

import App from "./App";

beforeEach(() => {
  localStorage.clear();
});

/** Helper: navigate to a bottom-nav tab by label. */
async function goToTab(user: ReturnType<typeof userEvent.setup>, label: string) {
  const buttons = screen.getAllByText(label);
  await user.click(buttons[buttons.length - 1]);
}

test("renders app with Recipe Builder title", () => {
  render(<App />);
  expect(screen.getByText("Recipe Builder")).toBeInTheDocument();
});

test("renders bottom navigation with three tabs", () => {
  render(<App />);
  expect(screen.getByText("Plan")).toBeInTheDocument();
  expect(screen.getByText("Pantry")).toBeInTheDocument();
  expect(screen.getByText("Shopping")).toBeInTheDocument();
});

test("dashboard shows week view with all days", () => {
  render(<App />);
  expect(screen.getByText("Monday")).toBeInTheDocument();
  expect(screen.getByText("Sunday")).toBeInTheDocument();
});

test("pantry page shows empty state initially", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Pantry");

  expect(screen.getByText("Your pantry is empty")).toBeInTheDocument();
});

/** Helper: open the pantry Add dialog, fill it, and submit. */
async function addPantryItem(user: ReturnType<typeof userEvent.setup>, name: string, amount: string) {
  // Click the "Add" button in the pantry header to open the dialog
  await user.click(screen.getByRole("button", { name: /add/i }));
  // Wait for the dialog to appear
  const ingredientField = await screen.findByLabelText("Ingredient");
  await user.type(ingredientField, name);
  await user.type(screen.getByLabelText("Amount"), amount);
  // Click the "Add" button inside the dialog
  const buttons = screen.getAllByRole("button", { name: /add/i });
  await user.click(buttons[buttons.length - 1]);
  // Wait for dialog to fully close before any subsequent call
  await waitFor(() => {
    expect(screen.queryByLabelText("Ingredient")).not.toBeInTheDocument();
  });
}

test("can add an ingredient to pantry", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Pantry");

  await addPantryItem(user, "Chicken", "2");

  expect(screen.getByText("Chicken")).toBeInTheDocument();
  expect(screen.getByText("2 pieces")).toBeInTheDocument();
});

test("adding ingredient with empty name does nothing", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Pantry");

  await user.click(screen.getByRole("button", { name: /add/i }));
  const amountField = await screen.findByLabelText("Amount");
  await user.type(amountField, "5");
  const buttons = screen.getAllByRole("button", { name: /add/i });
  await user.click(buttons[buttons.length - 1]);

  // Dialog should still be open, pantry is still empty behind it
  await user.click(screen.getByText("Cancel"));
  expect(screen.getByText("Your pantry is empty")).toBeInTheDocument();
});

test("adding ingredient with zero amount does nothing", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Pantry");

  await user.click(screen.getByRole("button", { name: /add/i }));
  const ingredientField = await screen.findByLabelText("Ingredient");
  await user.type(ingredientField, "Rice");
  await user.type(screen.getByLabelText("Amount"), "0");
  const buttons = screen.getAllByRole("button", { name: /add/i });
  await user.click(buttons[buttons.length - 1]);

  await user.click(screen.getByText("Cancel"));
  expect(screen.getByText("Your pantry is empty")).toBeInTheDocument();
});

test("can add multiple ingredients to pantry", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Pantry");

  await addPantryItem(user, "Tomato", "3");
  await addPantryItem(user, "Onion", "2");

  expect(screen.getByText("Tomato")).toBeInTheDocument();
  expect(screen.getByText("3 pieces")).toBeInTheDocument();
  expect(screen.getByText("Onion")).toBeInTheDocument();
  expect(screen.getByText("2 pieces")).toBeInTheDocument();
});

test("can navigate to shopping list tab", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Shopping");

  expect(screen.getByText("Grocery List")).toBeInTheDocument();
});

test("recipes tab shows sample recipes", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Recipes");
  expect(screen.getByText("Classic Spaghetti Carbonara")).toBeInTheDocument();
  expect(screen.getByText("Chicken Stir-Fry")).toBeInTheDocument();
});

/** Helper: open the shopping list Add dialog, fill it, and submit. */
async function addShoppingItem(user: ReturnType<typeof userEvent.setup>, name: string, amount: string) {
  // Find the Add button within the shopping list section (identified by "Grocery List")
  const heading = screen.getByText("Grocery List");
  const section = heading.closest(".MuiBox-root")!;
  const addButton = within(section as HTMLElement).getByRole("button", { name: /add/i });
  await user.click(addButton);
  const itemField = await screen.findByLabelText("Item");
  await user.type(itemField, name);
  await user.type(screen.getByLabelText("Amount"), amount);
  // Click the dialog's Add button
  const dialogAddButtons = screen.getAllByRole("button", { name: /^add$/i });
  await user.click(dialogAddButtons[dialogAddButtons.length - 1]);
  await waitFor(() => {
    expect(screen.queryByLabelText("Item")).not.toBeInTheDocument();
  });
}

test("shopping list mark-bought moves item to pantry and removes from list", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Shopping");

  await addShoppingItem(user, "Milk", "1");

  // Click the quantity chip to open edit dialog, then click Mark Bought
  await user.click(screen.getByText("1 pieces"));
  await user.click(await screen.findByText("Mark Bought"));

  await waitFor(() => {
    expect(screen.getByText("Your shopping list is empty")).toBeInTheDocument();
  });

  await goToTab(user, "Pantry");
  expect(screen.getByText("Milk")).toBeInTheDocument();
  expect(screen.getByText("1 pieces")).toBeInTheDocument();
});

test("shopping list mark-bought merges quantity for existing pantry item", async () => {
  const user = userEvent.setup();
  render(<App />);
  await goToTab(user, "Pantry");

  await addPantryItem(user, "Eggs", "6");

  await goToTab(user, "Shopping");
  await addShoppingItem(user, "Eggs", "6");

  // Click the quantity chip to open edit dialog, then click Mark Bought
  await user.click(screen.getByText("6 pieces"));
  await user.click(await screen.findByText("Mark Bought"));

  await goToTab(user, "Pantry");
  expect(screen.getByText("Eggs")).toBeInTheDocument();
  expect(screen.getByText("12 pieces")).toBeInTheDocument();
}, 15000);
