import { HttpError, HttpErrorStatuses, ObstructionInterface, isHttpError } from "../src/httpErrors";

// This is a test typing for errors with specific obstructions
declare interface ObOne extends ObstructionInterface<"ObOne", { country: string }> {}
declare interface ObTwo
  extends ObstructionInterface<
    "ObTwo",
    {
      cashRequired: number;
      cashOnHand: number;
    }
  > {}
declare interface ObThree
  extends ObstructionInterface<
    "ObThree",
    {
      ourName: string;
      theirName: string;
    }
  > {}
declare type SpecificObstructions = ObOne | ObTwo | ObThree;

describe("Http Errors", () => {
  test("should have correct data", function () {
    const msg = "Something happened!";
    const e = new HttpError(500, msg);
    expect(e.name).toBe(HttpErrorStatuses[500]);
    expect(e.message).toBe(msg);
    expect(e.status).toBe(500);
    expect(e.subcode).toBeUndefined();
    expect(e.logLevel).toBe("error");
    expect(e.obstructions).toHaveLength(0);
  });

  test("should accept a subcode that is publicly accessible", function () {
    const e = new HttpError(500, "Test error!", { subcode: "test" });
    expect(e.subcode).toBe("test");
  });

  test("should allow us to attach and access obstructions", function () {
    const e = new HttpError(500, "Test error!", { subcode: "test" });
    expect(e.subcode).toBe("test");

    e.obstructions.push({
      code: "SomeObstruction",
      text: "There's something wrong with this thing.",
    });

    expect(e.obstructions).toHaveLength(1);
    expect(e.obstructions[0].code).toBe("SomeObstruction");

    const o = [
      { code: "SomeObstruction", text: "Someting's wrong." },
      { code: "SomethingElse", text: "Other things are wrong." },
    ];
    e.obstructions = o;

    expect(e.obstructions).toHaveLength(2);
    expect(e.obstructions[1].code).toBe("SomethingElse");
  });

  test("should handle specific typing of complex errors elegantly", () => {
    const e = new HttpError<400, SpecificObstructions>(400, "Test error!", { subcode: "test" });

    // _Should_ be allowed to do this
    e.obstructions.push({
      code: "ObOne",
      text: "First thing is wrong",
      data: {
        country: "US",
      },
    });
    e.obstructions.push({
      code: "ObTwo",
      text: "Second thing is wrong",
      data: {
        cashRequired: 10,
        cashOnHand: 1,
      },
    });
    e.obstructions.push({
      code: "ObThree",
      text: "Third thing is wrong",
      data: {
        ourName: "us",
        theirName: "them",
      },
    });

    expect(e.subcode).toBe("test");

    expect(3).toBe(e.obstructions.length);
    expect("ObOne").toBe(e.obstructions[0].code);

    // Type guard should work for diff-union
    const ob = e.obstructions[0];
    if (ob.code === "ObOne") {
      expect(ob.data).toBeDefined();
      expect("US").toBe(ob.data.country);
    }

    // Shouldn't be allowed to do this. Uncomment to test:
    e.obstructions = [
      {
        // @ts-expect-error "NothingThing" is not one of the valid obstruction codes
        code: "NotherThing",
        text: "Nother thing is wrong",
        data: {
          // @ts-expect-error these are not valid parameters for any of our obstruction
          ourCountry: "US",
          theirCountry: "IT",
        },
      },
    ];
    e.obstructions = [
      {
        code: "ObOne",
        text: "First thing is wrong",
        data: {
          // @ts-expect-error this is not a valid parameter for "ObOne"
          nope: "not valid",
        },
      },
    ];
  });

  test(`should accept additional obstruction and header parameters on construct`, () => {
    const ob = { code: `test`, text: `fulltext` };
    const headers = { "X-Test-Error": "true" };
    const e = new HttpError(400, `bad request`, { subcode: `subcode`, obstructions: [ob], headers });

    expect(e.obstructions).toHaveLength(1);
    expect(e.obstructions[0]).toMatchObject(ob);
    expect(e.headers).toMatchObject(headers);
    expect(e.message).toBe(`bad request`);
    expect(e.subcode).toBe(`subcode`);
  });

  test(`should allow specifying stricter obstructions`, () => {
    const ob: ObOne = { code: `ObOne`, text: `fulltext`, data: { country: "US" } };
    const e = new HttpError<400, SpecificObstructions>(400, `bad request`, { subcode: "subcode", obstructions: [ob] });
    expect(e.obstructions).toHaveLength(1);
    expect(e.obstructions[0]).toMatchObject(ob);
  });

  describe("from static method", () => {
    const msg = "Test error";
    const error = new Error(msg);

    test("should instantiate 500 error from generic error if not otherwise specified", function () {
      const e = HttpError.from(error);
      expect(e.name).toBe(HttpErrorStatuses[500]);
      expect(e.message).toBe(msg);
      expect(e.status).toBe(500);
    });

    test("should instantiate 502 error from generic error if 502 specified", function () {
      const e = HttpError.from(error, 502);
      expect(e.name).toBe(HttpErrorStatuses[502]);
      expect(e.message).toBe(msg);
      expect(e.status).toBe(502);
    });

    test("should pass back a passed-in HttpError without modifications", () => {
      const subcode = "test";
      const obstructions = [{ code: "test", text: "fulltext" }];
      const _e = new HttpError(404, "Test error", { subcode, obstructions });
      const e = HttpError.from(_e, 415, { subcode: "test2" });
      expect(e).toEqual(_e);
    });
  });

  describe("isHttpError", () => {
    test("should typeguard correctly", function () {
      [new HttpError(500, "Test error"), new Error("Test error")].forEach((error) => {
        try {
          throw error;
        } catch (_e) {
          const e = isHttpError(_e) ? _e : HttpError.from(_e);
          expect(e.name).toBe(HttpErrorStatuses[500]);
          expect(e.status).toBe(500);
          expect(e.message).toBe("Test error");
        }
      });
    });
  });

  describe("JSON", () => {
    const status = 404 as const;
    const obstructions = [{ code: "test", text: "fulltext" }];
    const subcode = "subcode";
    const headers = { "X-Test-Error": "true" };
    const e = new HttpError(status, "Test error", { obstructions, subcode, headers });

    test("should serialize using JSON.stringify", () => {
      const json = JSON.stringify(e);
      const parsed = JSON.parse(json);
      expect(parsed).toMatchObject({
        tag: "HttpError",
        status,
        name: HttpErrorStatuses[status],
        subcode,
        logLevel: "error",
        obstructions,
        message: "Test error",
      });
      expect(parsed.stack).toBeUndefined();
      expect(parsed.headers).toBeUndefined();
    });

    test("should successfully inflate from JSON string", () => {
      const json = JSON.stringify(e);
      const err = HttpError.fromJSON(json);
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(status);
      expect(err.name).toBe(HttpErrorStatuses[status]);
      expect(err.subcode).toBe(subcode);
      expect(err.message).toBe("Test error");
      expect(err.logLevel).toBe("error");
      expect(err.obstructions).toHaveLength(1);
      expect(err.obstructions[0]).toMatchObject(obstructions[0]);
      expect(JSON.stringify(err.headers)).toBe("{}");
      expect(err.stack).toBeDefined();
    });
  });
});
