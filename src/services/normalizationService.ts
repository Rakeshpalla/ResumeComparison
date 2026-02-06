const DEFAULT_SYNONYMS: Record<string, string> = {
  storage: "storage_capacity",
  "disk size": "storage_capacity",
  capacity: "storage_capacity",
  memory: "memory",
  ram: "memory",
  cpu: "processor",
  processor: "processor",
  weight: "weight",
  dimensions: "dimensions",
  height: "height",
  width: "width",
  depth: "depth",
  warranty: "warranty",
  price: "price"
};

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function normalizeAttributeName(rawName: string) {
  const normalized = rawName.trim().toLowerCase();
  if (DEFAULT_SYNONYMS[normalized]) {
    return DEFAULT_SYNONYMS[normalized];
  }

  const tokens = tokenize(normalized);
  const tokenKey = tokens.join(" ");
  if (DEFAULT_SYNONYMS[tokenKey]) {
    return DEFAULT_SYNONYMS[tokenKey];
  }

  return tokenKey || normalized;
}

export function displayNameForKey(key: string) {
  const lookup = Object.entries(DEFAULT_SYNONYMS).find(
    ([, mapped]) => mapped === key
  );
  if (lookup) {
    return titleCase(lookup[0]);
  }
  return titleCase(key.replace(/_/g, " "));
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}
