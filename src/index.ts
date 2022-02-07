export type HttpStatusCode =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 420
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 444
  | 449
  | 450
  | 451
  | 499
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 509
  | 510
  | 511
  | 598
  | 599;

export interface GenericParams {
  [param: string]: unknown;
}

export interface ObstructionInterface<ParamSet = GenericParams> {
  code: string;
  text: string;
  params?: ParamSet;
}

type SimpleLogLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "alert"
  | "critical"
  | "emergency";

export abstract class HttpError<
  ObstructionParams extends GenericParams = GenericParams
> extends Error {
  public readonly tag: "HttpError" = "HttpError";
  public abstract readonly name: string;
  public abstract readonly status: number = 500;
  public errno?: number;
  public code?: string;
  public path?: string;
  public syscall?: string;
  public stack?: string;
  public loglevel: SimpleLogLevel = "error";

  public constructor(
    msg: string,
    public readonly subcode?: string,
    public obstructions: Array<ObstructionInterface<ObstructionParams>> = [],
    public headers: { [name: string]: string } = {}
  ) {
    super(msg);
  }

  /**
   * Converts any regular error into the given type of HttpError. For example, to convert an error
   * into a "BadRequest" error: `const badreq = BadRequest.fromError(new Error("something"))`
   */
  public static fromError<T>(this: { new (msg: string): T }, e: Error): T {
    return new this(e.message);
  }

  /**
   * Shortcut to getting one of the defined errors in this package. If an error for the given code
   * does not exist, returns a generic HttpError with the given code.
   */
  public static withStatus<ObsParams extends GenericParams = GenericParams>(
    code: number,
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObsParams>>,
    headers?: { [name: string]: string }
  ) {
    switch (code) {
      case 400:
        return new BadRequest(msg, subcode, obstructions, headers);
      case 401:
        return new Unauthorized(msg, subcode, obstructions, headers);
      case 403:
        return new Forbidden(msg, subcode, obstructions, headers);
      case 404:
        return new NotFound(msg, subcode, obstructions, headers);
      case 405:
        return new MethodNotAllowed(msg, subcode, obstructions, headers);
      case 406:
        return new NotAcceptable(msg, subcode, obstructions, headers);
      case 409:
        return new DuplicateResource(msg, subcode, obstructions, headers);
      case 415:
        return new UnsupportedMediaType(msg, subcode, obstructions, headers);
      case 429:
        return new TooManyRequests(msg, subcode, obstructions, headers);
      case 500:
        return new InternalServerError(msg, subcode, obstructions, headers);
      case 501:
        return new NotImplemented(msg, subcode, obstructions, headers);
      case 502:
        return new BadGateway(msg, subcode, obstructions, headers);
      case 503:
        return new ServiceUnavailable(msg, subcode, obstructions, headers);
      case 504:
        return new GatewayTimeout(msg, subcode, obstructions, headers);
      case 507:
        return new InsufficientStorage(msg, subcode, obstructions, headers);
      case 508:
        return new LoopDetected(msg, subcode, obstructions, headers);
      default:
        return new (class extends HttpError<ObsParams> {
          public readonly name: string = `Http${code}Error`;
          public readonly status = code;
          public constructor(
            msg: string,
            public readonly subcode?: string,
            public obstructions: Array<ObstructionInterface<ObsParams>> = [],
            public headers: { [name: string]: string } = {}
          ) {
            super(msg, subcode, obstructions, headers);
            this.code = `HTTP_${code}_ERROR`;
          }
        })(msg, subcode, obstructions, headers);
    }
  }
}

// 400 Errors

export class BadRequest<ObstructionParams extends GenericParams = GenericParams> extends HttpError<
  ObstructionParams
> {
  public readonly name: string = "BadRequest";
  public readonly status = 400;
  public loglevel: SimpleLogLevel = "warning";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_BAD_REQUEST";
  }
}

export class Unauthorized<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "Unauthorized";
  public readonly status = 401;
  public loglevel: SimpleLogLevel = "notice";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_UNAUTHORIZED";
  }
}

export class Forbidden<ObstructionParams extends GenericParams = GenericParams> extends HttpError<
  ObstructionParams
> {
  public readonly name: string = "Forbidden";
  public readonly status = 403;
  public loglevel: SimpleLogLevel = "notice";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_FORBIDDEN";
  }
}

export class NotFound<ObstructionParams extends GenericParams = GenericParams> extends HttpError<
  ObstructionParams
> {
  public readonly name: string = "NotFound";
  public readonly status = 404;
  public loglevel: SimpleLogLevel = "notice";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_NOT_FOUND";
  }
}

export class MethodNotAllowed<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "MethodNotAllowed";
  public readonly status = 405;
  public loglevel: SimpleLogLevel = "notice";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_METHOD_NOT_ALLOWED";
  }
}

export class NotAcceptable<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "NotAcceptable";
  public readonly status = 406;
  public loglevel: SimpleLogLevel = "notice";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_NOT_ACCEPTABLE";
  }
}

export class DuplicateResource<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "DuplicateResourceError";
  public readonly status = 409;
  public loglevel: SimpleLogLevel = "notice";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_DUPLICATE_RESOURCE";
  }
}

export class UnsupportedMediaType<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "UnsupportedMediaType";
  public readonly status = 415;
  public loglevel: SimpleLogLevel = "info";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_UNSUPPORTED_MEDIA_TYPE";
  }
}

export class TooManyRequests<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "TooManyRequests";
  public readonly status = 429;
  public loglevel: SimpleLogLevel = "warning";
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_TOO_MANY_REQUESTS";
  }
}

// 500 Errors

export class InternalServerError<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "InternalServerError";
  public readonly status = 500;
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_INTERNAL_SERVER_ERROR";
  }
}

export class NotImplemented<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "NotImplemented";
  public readonly status = 501;
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_NOT_IMPLEMENTED";
  }
}

export class BadGateway<ObstructionParams extends GenericParams = GenericParams> extends HttpError<
  ObstructionParams
> {
  public readonly name: string = "BadGateway";
  public readonly status = 502;
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_BAD_GATEWAY";
  }
}

export class ServiceUnavailable<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "ServiceUnavailable";
  public readonly status = 503;
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_SERVICE_UNAVAILABLE";
  }
}

export class GatewayTimeout<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "GatewayTimeout";
  public readonly status = 504;
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_GATEWAY_TIMEOUT";
  }
}

export class InsufficientStorage<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "InsufficientStorage";
  public readonly status = 507;
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_INSUFFICIENT_STORAGE";
  }
}

export class LoopDetected<
  ObstructionParams extends GenericParams = GenericParams
> extends HttpError<ObstructionParams> {
  public readonly name: string = "LoopDetected";
  public readonly status = 508;
  public constructor(
    msg: string,
    subcode?: string,
    obstructions?: Array<ObstructionInterface<ObstructionParams>>,
    headers?: { [name: string]: string }
  ) {
    super(msg, subcode, obstructions, headers);
    this.code = "HTTP_LOOP_DETECTED";
  }
}

// Convenience functions

export const isHttpError = function(e: any): e is HttpError {
  return typeof e === "object" && e.hasOwnProperty("tag") && e.tag === "HttpError";
};
