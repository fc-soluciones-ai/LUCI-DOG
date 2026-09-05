export class ValidationError extends Error {}

export class BookingBlockedError extends Error {
  constructor(
    message: string,
    public billingStatus: string
  ) {
    super(message)
  }
}
