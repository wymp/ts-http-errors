export type HttpStatusCode = 
    400|401|402|403|404|405|406|407|408|409|410|411|412|413|414|415|416|
    417|418|420|422|423|424|425|426|428|429|431|444|449|450|451|499|
    500|501|502|503|504|505|506|507|508|509|510|511|598|599;

export interface GenericParams {
  [param: string]: unknown
}

export interface ObstructionInterface<ParamSet = GenericParams> {
  code: string;
  text: string;
  params?: ParamSet;
}

export abstract class HttpError extends Error implements NodeJS.ErrnoException {
  public readonly tag: "HttpError" = "HttpError";
  public abstract readonly name: string;
  public abstract readonly status: HttpStatusCode = 500;
  public errno?: number;
  public code?: string;
  public path?: string;
  public syscall?: string;
  public stack?: string;
  public obstructions: Array<ObstructionInterface<{[param: string]: any}>> = [];

  public constructor(msg:string, public readonly subcode?: string) {
    super(msg);
  }

  /**
   * This takes any 
   */
  public static fromError<T>(this: { new(msg: string): T }, e: Error): T {
    return new this(e.message);
  }
}

// 400 Errors

export class BadRequest extends HttpError {
  public readonly name: string = "BadRequest";
  public readonly status = 400;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_BAD_REQUEST";
  }
}

export class Unauthorized extends HttpError {
  public readonly name: string = "Unauthorized";
  public readonly status = 401;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_UNAUTHORIZED";
  }
}

export class Forbidden extends HttpError {
  public readonly name: string = "Forbidden";
  public readonly status = 403;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_FORBIDDEN";
  }
}

export class NotFound extends HttpError {
  public readonly name: string = "NotFound";
  public readonly status = 404;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_NOT_FOUND";
  }
}

export class NotAcceptable extends HttpError {
  public readonly name: string = "NotAcceptable";
  public readonly status = 406;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_NOT_ACCEPTABLE";
  }
}

export class DuplicateResource extends HttpError {
  public readonly name: string = "DuplicateResourceError";
  public readonly status = 409;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_DUPLICATE_RESOURCE";
  }
}

export class UnsupportedMediaType extends HttpError {
  public readonly name: string = "UnsupportedMediaType";
  public readonly status = 415;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_UNSUPPORTED_MEDIA_TYPE";
  }
}

export class TooManyRequests extends HttpError {
  public readonly name: string = "TooManyRequests";
  public readonly status = 429;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_DUPLICATE_RESOURCE";
  }
}


// 500 Errors

export class InternalServerError extends HttpError {
  public readonly name: string = "InternalServerError";
  public readonly status = 500;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_INTERNAL_SERVER_ERROR";
  }
}

export class NotImplemented extends HttpError {
  public readonly name: string = "NotImplemented";
  public readonly status = 501;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_NOT_IMPLEMENTED";
  }
}

export class BadGateway extends HttpError {
  public readonly name: string = "BadGateway";
  public readonly status = 502;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_BAD_GATEWAY";
  }
}

export class ServiceUnavailable extends HttpError {
  public readonly name: string = "ServiceUnavailable";
  public readonly status = 503;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_SERVICE_UNAVAILABLE";
  }
}

export class GatewayTimeout extends HttpError {
  public readonly name: string = "GatewayTimeout";
  public readonly status = 504;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_GATEWAY_TIMEOUT";
  }
}

export class InsufficientStorage extends HttpError {
  public readonly name: string = "InsufficientStorage";
  public readonly status = 507;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_INSUFFICIENT_STORAGE";
  }
}

export class LoopDetected extends HttpError {
  public readonly name: string = "LoopDetected";
  public readonly status = 508;
  public constructor(msg: string, subcode?: string) {
    super(msg, subcode);
    this.code = "HTTP_LOOP_DETECTED";
  }
}








// Convenience functions

export const isHttpError = function(e: any): e is HttpError {
  return typeof e === "object" &&
    e.hasOwnProperty("tag") &&
    e.tag === "HttpError";
}
