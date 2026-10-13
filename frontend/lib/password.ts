export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

/** The five requirements a signup password must satisfy. */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number (0-9)", test: (v) => /[0-9]/.test(v) },
  { id: "special", label: "One special character (!@#$...)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export type StrengthLevel = "weak" | "fair" | "strong";

export interface PasswordEvaluation {
  results: (PasswordRule & { met: boolean })[];
  score: number;
  total: number;
  valid: boolean;
  level: StrengthLevel;
}

export function evaluatePassword(value: string): PasswordEvaluation {
  const results = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(value) }));
  const score = results.filter((r) => r.met).length;
  const total = PASSWORD_RULES.length;
  const level: StrengthLevel = score <= 2 ? "weak" : score < total ? "fair" : "strong";
  return { results, score, total, valid: score === total, level };
}
