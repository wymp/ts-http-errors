Http Errors
==================================================================================================================

This is a small library that presents a set of pre-configured errors that correspond to some common HTTP status codes, such as 400, 401, 403, 404, 500, etc....

The idea is that you can throw these like normal errors in your code, but then use them to fine-tune your actual HTTP response in a global handler function. For example, using express:

```ts
import * as express from "express";
import * as Errors from "http-errors";
import { authenticate } from "./Authnz";

const app = express();

// Normal endpoint
app.get("/my/endpoint", function(req, res, next) {
  try {
    if (!req.headers("Authorization")) {
      throw new Errors.Unauthorized(
        "You must pass a standard Authorization header to use this endpoint",
        "MissingAuthHeader"
      );
    }

    // May throw Errors.Forbidden
    authenticate(req.headers("Authorization"));

    return res.status(200).send({ data: "Yay!" });
  } catch (e) {
    next(e);
  }
});

// Global handler, handling errors for all endpoints
app.use(function(e: Error, req, res, next) {
  // If it's not already an HttpError, convert it into an InternalServerError (500)
  if (!Errors.isHttpError(e)) {
    e = Errors.InternalServerError.fromError(e);
  }

  // This happens to be JSON:API structure, but you could use the data however you'd like
  return res.status(e.status).send({
    errors: [
      {
        status: e.status,
        code: e.code!,
        title: e.title,
        detail: e.message,
      },
    ],
  });
});
```

## API

The best way to understand the API for these errors is to simply look at the
[definitions file](https://github.com/wymp/ts-http-errors/blob/current/src/index.ts),
which is fairly small. However, for ease of reference, below is an overview:

### isHttpError()

This is a simple function that offers typeguarding for errors. For any catch block, you
can simply pass in the error object you receive, and if it's not an HttpError, you can
convert it to one using the static `fromError()` method available on all errors in the library.

### HttpError

This is the (abstract) base class for all errors in this library. All errors have the following
properties, which are defined in this base class:

- `readonly tag: "HttpError" = "HttpError"` -- Always `HttpError` so you can easily tell whether
  or not you're dealing with an `HttpError`.
- `readonly name: string;` -- An error ID which is usually statically defined. For example,
  a "Bad Request" might be defined with this property set to `BadRequest`, such that you can
  always determine what type of error you're dealing with at runtime.
- `readonly status: HttpStatusCode;` -- any of the (finite) list of valid HTTP numeric status
  codes. This is usually defined statically in the specific error definition, so you don't have
  to set it yourself.
- `errno?: number;` -- Part of the `NodeJS.ErrnoException` interface.
- `code?: string;` -- A useful code indicating what specific error this is (e.g., `IncorrectEmail`,
- `readonly subcode?: string;` -- A secondary code to further specify the error (e.g., `IncorrectFormat`,
  `MiddleNameRequired`, etc....)
- `path?: string;` -- The path through the data where the error occurred (e.g.,
  `data.attributes.legalName`)
- `syscall?: string;` -- Part of the `NodeJS.ErrnoException` interface.
- `stack?: string;` -- Part of the `NodeJS.ErrnoException` interface.
- `obstructions: Array<ObstructionInterface<{[param: string]: any}>>;` -- This error's
  array of obstructions (see [Obstructions](#obstructions) below).

`HttpError` itself is an abstract class. You'll actually be using descendent classes when
throwing errors (see [Basic Errors](#basic-errors) below). These descendent errors are
distinguishable at runtime (and in the context of
[discriminated unions](https://www.typescriptlang.org/docs/handbook/advanced-types.html#discriminated-unions))
via the `name` attribute, which will usually be the same as the constructor, but is defined
statically in the descendant class definitions.

The `code`, and `subcode` properties allow for further differentiation. `code` is a property
from the `NodeJS.ErrnoException` interface and often used by native errors. Therefore, it is
usually avoided in `HttpError`s. `subcode`, on the other hand, is settable via the optional
second constructor parameter on every `HttpError` and may be used to very specifically
describe the error.

For example, you might define and use a new `InvalidEmail` Error like so:

```
class InvalidEmailError extends BadRequest {
  code = "InvalidEmail"
}

// ...

throw new InvalidEmailError("Your email must be in standard format", "IncorrectFormat");
```

In the above example, you can easily throw an error with a lot of data attached to it
by default, then add specificity ("IncorrectFormat") in context.

### `fromError`

`HttpError` defines a static method, `fromError` which takes any Error object and converts
it to an `HttpError` of the given type. This is most often used to turn native Errors into
`InternalServerErrors` like so:

```ts
try {
  woops this is gonna throw
} catch (e) {
  if (!isHttpError(e)) {
    e = InternalServerError.fromError(e);
  }

  // Now we know it's an HttpError. Format it and return a response
  // ...
}
```

### Obstructions

The concept of obstructions is specific to the `HttpError`s world. An obstruction is defined
as follows:

```ts
interface ObstructionInterface<ParamSet extends {[param: string]: unknown}> {
  code: string;
  text: string;
  params?: ParamSet;
}
```

These are meant to be light-weight and data-dense packets that allow you to communicate to
consumers about multiple issues that are preventing a given request from completing
successfully.

Imagine you're registering a new user. Using the `BadRequest` error with obstructions, you
can easily stop execution and send back a 400 with useful information from anywhere in your
code:

```ts
const body = req.body;
if (!body) {
  throw new BadRequest("Missing request body. Did you send it?");
}
if (!body.user) {
  throw new BadRequest("Missing incoming user object. Did you send it?");
}

const obstructions: Array<ObstructionInterface<GenericParams>> = [];

if (!body.user.name) {
  obstructions.push({
    code: "NoUserName",
    text: "You must send a user name to register."
  });
}

if (!body.user.email) {
  obstructions.push({
    code: "NoEmail",
    text: "You must send an email for the user you're registering."
  });
} else {
  if (!validateEmail(body.user.email, ourEmailRegex)) {
    obstructions.push({
      code: "InvalidEmail",
      text: "Your email doesn't appear to be in valid format.",

      // Note that we can provide data so consumers can be more detailed about
      // how they display the errors
      params: {
        email: body.user.email,
        pattern: ourEmailRegex
      }
    });
  }
}

if (!body.user.password) {
  obstructions.push({
    code: "NoPassword",
    text: "You haven't provided a password."
  });
} else {
  if (!body.user.passwordConfirmation) {
    obstructions.push({
      code: "NoPasswordConf",
      text: "You haven't provided a password confirmation."
    });
  } else {
    if (body.user.password !== body.user.passwordConfirmation) {
      obstructions.push({
        code: "PasswordConfMismatch",
        text: "Your password confirmation doesn't match the password you entered."
      });
    }
  }
}

if (obstructions.length > 0) {
  const e = new BadRequest("There were problems registering your user.");
  e.obstructions = obstructions;
  throw e;
}

// Now we know it's safe. Continue processing here....

```
