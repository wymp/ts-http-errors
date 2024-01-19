Http Errors
==================================================================================================================

This is a small library whose primary export is the `HttpError` class, a derivative of the native `Error` class.
`HttpError` can be instantiated and thrown like any error, except that it carries additional information that is
pertinent to HTTP interactions.

For example:

```ts
import * as express from "express";
import { HttpError, isHttpError } from "http-errors";
import { authenticate } from "./Authnz";
import { doThings } from "./myLib";
import { SimpleLoggerConsole } from "@wymp/simple-logger-console";

const app = express();
const log = new SimpleLoggerConsole();

// Normal endpoint
app.get("/my/endpoint", function(req, res, next) {
  try {
    if (!req.headers("Authorization")) {
      throw new HttpError(
        401,
        "You must pass a standard Authorization header to use this endpoint",
        { subcode: "MissingAuthHeader" }
      );
    }

    // May throw additional HTTP errors, such as 400, 401 or 403
    authenticate(req.headers("Authorization"));
    doThings(req);

    // If nothing threw, just return 200 with our data
    return res.status(200).send({ data: "Yay!" });
  } catch (e) {
    // Otherwise, pass the error to next
    next(e);
  }
});

// Global error handler
app.use(function(_e: Error, req, res, next) {
  // If it's not already an HttpError, convert it into an InternalServerError (500)
  const e = HttpError.from(_e);

  // Log the error
  log[e.logLevel](e.stack);

  // Return the response with the correct status and structure
  return res.status(e.status).send({
    ok: false,
    // Note that an HttpError is properly serialized by JSON.stringify, so we don't need to do anything extra here
    error: e
  });
});
```


## API


### isHttpError()

A typeguard allowing you to check if a given error is an `HttpError`. Probably better to just use `HttpError.from`
instead. 


### `HttpError.from`

Takes any Error object and converts it to an `HttpError`. This is most often used in catch blocks to turn native Errors
into `HttpError`s like so:

```ts
try {
  woops this is gonna throw
} catch (_err) {
  const err = HttpError.from(_err);

  // Now we know it's an HttpError and can access its fields
  // ...
}
```


### `HttpError.toJSON` and `(static) HttpError.fromJSON`

These methods allow you to easily serialize to JSON and de-serialize back into a native `HttpError`. To serialize,
simply pass the error to `JSON.stringify` and it will output important fields (although not `headers` or `stack`, to
avoid accidental leakage). To de-serialize, pass either the string or the already-deserialized object into the
`HttpError.fromJSON` static method.

For example:

```ts
const e = new HttpError(404, "Not Found", { obstructions: [{ code: "something", text: "Some explanation" }] });
const json = JSON.stringify(e);
const inflated = HttpError.fromJSON(json);
// e.status === inflated.status
// e.name === inflated.name
// e.obstructions == inflated.obstructions
// etc...
```


### HttpError

Throw this error instead of native errors in order to attach additional data pertinent to your application and to the
HTTP context.

Important fields are:

* `status` - The status code of the error. (You must pass this into the constructor, and it defaults to 500 when
  converting regular errors)
* `name` - The standardized status text corresponding to the status code. (See also `HttpErrorStatuses`)
* `subcode` - You can use this field to offer a concise, immutable code indicating more specifically what the error
  pertains to. In the example above, we used `MissingAuthHeader` as the subcode in our 401. This can help the client
  understand what needs to change about the request in order for it to succeed.
* `logLevel` - This is an internal field that you can use in your system to determine whether or not to log this error.
* `obstructions` - An optional collection of more specific data about why the user cannot do what they want to do. See
  below.
* `headers` - Some errors (such as 401) require certain headers to be returned. This allows you to do that.


### Obstructions

The concept of obstructions is specific to the `HttpError` world. An obstruction is defined as follows:

```ts
export type ObstructionInterface<Data = undefined> = Data extends undefined
  ? { code: string; text: string }
  : { code: string; text: string; data: Data };
```

These are meant to be light-weight and data-dense packets that allow you to communicate to consumers about multiple
issues that are preventing a given request from completing successfully.

Imagine you're registering a new user. Using an `HttpError` with obstructions, you can easily stop execution and send
back a 400 with useful information from anywhere in your code. In the following example, there are certain things for
which we immediately throw and other things where we build up a list of obstructions and then throw.

```ts
// library: @my-org/types

// First we'll define our obstructions. This allows front- and back-end code to work with type-safe errors
import { ObstructionInterface } from "@wymp/http-errors";
export type MyObstructions =
  | ObstructionInterface<"NoUserName">
  | ObstructionInterface<"NoEmail">
  | ObstructionInterface<"InvalidEmail", { email: string; pattern: string }>
  | ObstructionInterface<"NoPassword">
  | ObstructionInterface<"NoPasswordConf">
  | ObstructionInterface<"PasswordConfMismatch">;
```

```ts
// app: @my-org/core

import { MyObstructions } from "@my-org/types";

const body = req.body;
if (!body) {
  throw new HttpError(400, "Missing request body. Did you send it?");
}
if (!body.user) {
  throw new HttpError(400, "Missing incoming user object. Did you send it?");
}

const obstructions: Array<MyObstructions> = [];
const ourEmailRegex = /.../;

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
      data: {
        email: body.user.email,
        pattern: ourEmailRegex.toString()
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
  throw new HttpError(400, "There were problems registering your user.", { obstructions });
}

// Continue processing....

```
