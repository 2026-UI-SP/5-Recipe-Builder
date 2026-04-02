import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MealPlan, Recipe } from "../data/types";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];

export function generateMealPlanPDF(
  mealPlan: MealPlan,
  getRecipeById: (id: string) => Recipe | undefined
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Meal Plan", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 24);
  doc.setTextColor(0);

  // Build table data
  const head = [["Day", ...MEAL_TYPES]];
  const body: string[][] = [];

  for (const day of DAYS_OF_WEEK) {
    const dayMeals = mealPlan[day];
    if (!dayMeals || Object.keys(dayMeals).length === 0) {
      body.push([day, "", "", ""]);
      continue;
    }

    const row = [day];
    for (const mealType of MEAL_TYPES) {
      const recipeId = dayMeals[mealType];
      if (!recipeId) {
        row.push("");
        continue;
      }
      const recipe = getRecipeById(recipeId);
      if (!recipe) {
        row.push("");
        continue;
      }
      const parts = [recipe.title];
      if (recipe.total_time_minutes) parts.push(`${recipe.total_time_minutes} min`);
      if (recipe.nutrition_info?.calories) parts.push(`${recipe.nutrition_info.calories} cal`);
      row.push(parts.join("\n"));
    }
    body.push(row);
  }

  autoTable(doc, {
    startY: 28,
    head,
    body,
    theme: "grid",
    headStyles: {
      fillColor: [0, 150, 136], // teal primary
      textColor: 255,
      fontStyle: "bold",
      fontSize: 11,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      valign: "top",
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28, halign: "center", valign: "middle" },
      1: { cellWidth: 70 },
      2: { cellWidth: 70 },
      3: { cellWidth: 70 },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
  });

  doc.save("meal-plan.pdf");
}
