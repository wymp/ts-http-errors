export const HttpErrorStatuses = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  420: "Enhance Your Calm",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Reserved for WebDAV",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  444: "No Response",
  449: "Retry With",
  450: "Blocked by Windows Parental Controls",
  451: "Unavailable For Legal Reasons",
  499: "Client Closed Request",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  509: "Bandwidth Limit Exceeded",
  510: "Not Extended",
  511: "Network Authentication Required",
  598: "Network read timeout error",
  599: "Network connect timeout error",
} as const;
export type HttpErrorStatuses = (typeof HttpErrorStatuses)[keyof typeof HttpErrorStatuses];

export type HttpStatusCodes = keyof typeof HttpErrorStatuses;

type SimpleLogLevel = "debug" | "info" | "notice" | "warning" | "error" | "alert" | "critical" | "emergency";

/**
 * An obstruction - a lightweight object providing a short, machine-readable code along with longer, human-readable text
 * and optional machine-readable data that can be used to help the user understand more about what's keeping them from
 * being able to do the thing they want to do.
 */
export type ObstructionInterface<Code extends string = string, Data = undefined> = Data extends undefined
  ? { code: Code; text: string }
  : { code: Code; text: string; data: Data };

/** Metadata for an HTTP error. */
export type ErrorMeta<Obstructions extends ObstructionInterface = ObstructionInterface> = {
  /** @see {@link HttpError["subcode"]} */
  subcode?: string;
  /** @see {@link HttpError["logLevel"]} */
  logLevel?: SimpleLogLevel;
  /** @see {@link HttpError["obstructions"]} */
  obstructions?: Obstructions[];
  /** @see {@link HttpError["headers"]} */
  headers?: Record<string, string>;
};

/**
 * The JSON representation of an HttpError
 *
 * Note that we're intentionally omitting stack and headers here to avoid accidental leakage of sensitive information.
 */
export type HttpErrorJSON<
  Status extends HttpStatusCodes = HttpStatusCodes,
  Obstructions extends ObstructionInterface = ObstructionInterface,
> = {
  tag: "HttpError";
  name: HttpErrorStatuses[Status];
  status: Status;
  subcode?: string;
  logLevel: string;
  obstructions?: Obstructions[];
  message: string;
};

/**
 * An HttpError is an error that can be thrown from within a route handler (or any other library code) to provide more
 * details to a system in the context of an HTTP request. It is a subclass of Error, so it can be thrown and caught
 * like any other error, but it also has some additional properties that can be used to provide more information about
 * the error.
 *
 * Specifically, an HttpError contains all of the information necessary to send an HTTP error response to the client,
 * including the status code, status text, optional headers (for example, to set a `WWW-Authenticate` header for a 401
 * response), a log-level (helping to indicate to the back-end system the log level at which this error should be
 * logged), an optional subcode to help the consumer programatically understand the error, a top-level message, and
 * an optional array of "obstructions" that can be used by the consumer to help the user understand what they need to
 * do to resolve the error.
 *
 * @example
 *
 * **In a request handler**
 *
 * ```ts
 * import { HttpError, HttpErrorStatuses } from "@wymp/http-error";
 * import { myLoginChecker } from "./myLoginLibrary";
 *
 * // For the purposes of this example, myLoginChecker will return the type indicated here
 * type LoginCheck =
 *   | { success: true; session: { token: string; refresh: string } }
 *   | { success: false; obstructions: ObstructionInterface[] }
 *
 * // Login handler - This might be hooked up to a POST /login route or something
 * export const loginHandler = async (req, res, next) => {
 *   try {
 *     const { username, password } = req.body;
 *
 *     const response: LoginCheck = await myLoginChecker(username, password);
 *
 *     if (!response.success) {
 *       throw new HttpError(400, "Login failed", {
 *         subcode: 'LOGIN_FAILED',
 *         obstructions: response.obstructions,
 *       });
 *     }
 *
 *     res.json(response);
 *   } catch (err) {
 *     next(err);
 *   }
 * }
 * ```
 *
 * **In the server's error handler**
 *
 * ```ts
 * import { isHttpError } from "@wymp/http-errors";
 * import { SimpleLoggerInterface } from "@wymp/ts-simple-interfaces";
 *
 * export errorHandler = (log: SimpleLoggerInterface) => (_err, req, res, next) => {
 *   const err = isHttpError(_err) ? _err : HttpError.from(_err);
 *
 *   // Log the error
 *   log[err.logLevel](err.stack);
 *
 *   // Format the error and send it off
 *   res.status(err.status).json({
 *     ok: false,
 *     // Automatically serializes correctly because of our toJSON method
 *     error: err,
 *   });
 * }
 * ```
 */
export class HttpError<
  Status extends HttpStatusCodes = HttpStatusCodes,
  Obstructions extends ObstructionInterface = ObstructionInterface,
> extends Error {
  /** A tag identifying this object as an HttpError. Any object having this tag should implement this interface */
  public readonly tag = "HttpError" as const;
  /** The name of the error, which will always be the official text associated with the status code */
  public readonly name: (typeof HttpErrorStatuses)[Status];
  /** An optional subcode that you can use to further understand why an error occurred. */
  public readonly subcode?: string;
  /**
   * The level at which this error should be logged. This can be useful for keeping log noise down for unimportant
   * errors such as 404s while elevating more important errors, such as "database down".
   */
  public logLevel: SimpleLogLevel;
  /** An optional list of obstructions that can help the user understand why they can't do what they're trying to do */
  public obstructions: Obstructions[];
  /**
   * Headers to attach to the HTTP response. Useful for things like attaching the `WWW-Authenticate` header to 401
   * responses.
   */
  public readonly headers: Record<string, string>;

  public constructor(
    public readonly status: Status,
    msg: string,
    meta?: ErrorMeta<Obstructions>
  ) {
    super(msg);
    this.name = HttpErrorStatuses[status];
    this.subcode = meta?.subcode;
    this.logLevel = meta?.logLevel ?? "error";
    this.obstructions = meta?.obstructions ?? [];
    this.headers = meta?.headers ?? {};
  }

  /**
   * Create an HTTP error from a random error
   *
   * NOTE: If the passed-in error is already an HttpError, it will be passed back without modification. Any status or
   * metadata passed in will not be applied in this case. Because of this, you can think of the `status` and `meta`
   * params as defaults.
   */
  public static from<Status extends HttpStatusCodes, Obstructions extends ObstructionInterface = ObstructionInterface>(
    err: Error,
    status: Status,
    meta?: ErrorMeta<Obstructions>
  ): HttpError<Status>;
  public static from<Obstructions extends ObstructionInterface = ObstructionInterface>(
    err: Error,
    meta?: ErrorMeta<Obstructions>
  ): HttpError<HttpStatusCodes>;
  public static from<
    Status extends HttpStatusCodes = 500,
    Obstructions extends ObstructionInterface = ObstructionInterface,
  >(
    err: Error,
    statusOrMeta?: Status | ErrorMeta<Obstructions>,
    _meta?: ErrorMeta<Obstructions>
  ): HttpError<HttpStatusCodes> {
    if (isHttpError(err)) return err;
    const status = typeof statusOrMeta === "number" ? statusOrMeta : 500;
    const meta = typeof statusOrMeta === "object" ? statusOrMeta : _meta;
    const e = new HttpError(status, err.message, meta);
    e.stack = err.stack;
    return e;
  }

  /** Serialize an HTTP error to JSON */
  public toJSON(): HttpErrorJSON<Status, Obstructions> {
    return {
      tag: this.tag,
      name: this.name,
      status: this.status,
      subcode: this.subcode,
      logLevel: this.logLevel,
      obstructions: this.obstructions,
      message: this.message,
      // NOTE: We're not including the stack or headers because that would create the possibility of accidentally
      // leaking sensitive information to clients. Instead, if you want the stack or headers, you can explicitly include
      // them in your output.
      // stack: this.stack,
      // headers: this.headers,
    };
  }

  /** Create an HTTP error from a JSON representation */
  public static fromJSON<
    Status extends HttpStatusCodes = HttpStatusCodes,
    Obstructions extends ObstructionInterface = ObstructionInterface,
  >(json: string | HttpErrorJSON<Status, Obstructions>): HttpError<Status, Obstructions> {
    const obj = typeof json === "string" ? <HttpErrorJSON<Status, Obstructions>>JSON.parse(json) : json;
    const meta: ErrorMeta<Obstructions> = {
      subcode: obj.subcode,
      logLevel: obj.logLevel as SimpleLogLevel,
      obstructions: obj.obstructions,
    };
    return new HttpError(obj.status, obj.message, meta);
  }
}

/**
 * A type-guard to help you determine whether an error is an HttpError. This is useful for error handlers that might
 * receive errors from other libraries that might not be HttpErrors, but that you want to treat as HttpErrors.
 *
 * @example
 *
 * ```ts
 * export errorHandler = (_err: Error, req: Request, res: Response, next: NextFunction) => {
 *   const err = isHttpError(_err) ? _err : HttpError.from(_err);
 *   // ...
 * }
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isHttpError = function (e: any): e is HttpError<HttpStatusCodes> {
  return typeof e === "object" && Object.prototype.hasOwnProperty.call(e, "tag") && e.tag === "HttpError";
};
