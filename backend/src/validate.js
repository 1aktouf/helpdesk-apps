// Runs a zod schema on untrusted input and returns { data } or { error: <message for the client> }.
export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return { data: result.data };
  const message = result.error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ');
  return { error: `Invalid input: ${message}` };
}
