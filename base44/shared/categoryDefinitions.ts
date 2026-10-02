// Category definitions stored in the TransactionCategory entity.
// Each record pairs a category name with a free-text description of how it
// should be applied. The AI auto-categorizer loads these descriptions and
// includes them in its prompt so it categorizes consistently with user intent.

// Loads all category definitions as a Map keyed by lowercased name.
export async function fetchCategoryDefinitions(base44) {
  const list = await base44.asServiceRole.entities.TransactionCategory.list("-created_date", 500);
  const map = new Map();
  for (const c of list) {
    const name = (c.name || "").trim();
    if (!name) continue;
    map.set(name.toLowerCase(), {
      name,
      description: c.description || "",
      tax_type: c.tax_type || "business",
      pinnable: !!c.pinnable,
    });
  }
  return map;
}

// Formats category definitions as guideline text for the LLM prompt.
// Categories with descriptions include the description; others are just names.
export function formatCategoryGuidelines(defMap) {
  if (!defMap || !defMap.size) return "(none yet)";
  const lines = [];
  for (const def of defMap.values()) {
    if (def.description) {
      lines.push(`- ${def.name}: ${def.description}`);
    } else {
      lines.push(`- ${def.name}`);
    }
  }
  return lines.join("\n");
}

// Creates a TransactionCategory record if one doesn't already exist for the
// given name. Returns the definition object, or null if creation failed.
export async function ensureCategoryDefinition(base44, name, tax_type, pinnable) {
  const defMap = await fetchCategoryDefinitions(base44);
  const key = (name || "").toLowerCase().trim();
  if (defMap.has(key)) return defMap.get(key);
  try {
    const created = await base44.asServiceRole.entities.TransactionCategory.create({
      name: name.trim(),
      description: "",
      tax_type: tax_type === "personal" ? "personal" : "business",
      pinnable: !!pinnable,
    });
    return {
      name: created.name,
      description: "",
      tax_type: created.tax_type,
      pinnable: created.pinnable,
    };
  } catch (e) {
    return null;
  }
}