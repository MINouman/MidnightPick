import {
  calculateDeliveryCost,
  type DeliveryInput,
  type PaymentMethod,
} from "../../../lib/delivery";

type RequestBody = Partial<Record<keyof DeliveryInput, unknown>>;

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "bkash" || value === "cod";
}

function validateBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const input = body as RequestBody;

  if (typeof input.location !== "string" || input.location.trim() === "") {
    return "location is required and must be a non-empty string.";
  }

  if (
    typeof input.weightGrams !== "number" ||
    !Number.isFinite(input.weightGrams) ||
    !Number.isInteger(input.weightGrams) ||
    input.weightGrams <= 0
  ) {
    return "weightGrams is required and must be a positive integer.";
  }

  if (
    typeof input.orderSubtotal !== "number" ||
    !Number.isFinite(input.orderSubtotal) ||
    !Number.isInteger(input.orderSubtotal) ||
    input.orderSubtotal < 0
  ) {
    return "orderSubtotal is required and must be a non-negative integer.";
  }

  if (!isPaymentMethod(input.paymentMethod)) {
    return 'paymentMethod is required and must be either "bkash" or "cod".';
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must contain valid JSON." }, 400);
  }

  const validationError = validateBody(body);

  if (validationError !== null) {
    return jsonResponse({ error: validationError }, 400);
  }

  return jsonResponse(
    calculateDeliveryCost(body as DeliveryInput),
    200,
  );
}
