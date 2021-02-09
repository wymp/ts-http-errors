import * as errors from "../src/index";

// This is a test typing for errors with specific obstructions
declare interface ObOne extends errors.ObstructionInterface<{ country: string }> {
  code: "ObOne";
}
declare interface ObTwo
  extends errors.ObstructionInterface<{
    cashRequired: number;
    cashOnHand: number;
  }> {
  code: "ObTwo";
}
declare interface ObThree
  extends errors.ObstructionInterface<{
    ourName: string;
    theirName: string;
  }> {
  code: "ObThree";
}
declare type SpecificObstructions = ObOne | ObTwo | ObThree;
class MySpecificError extends errors.BadRequest {
  public readonly name: string = "MySpecificError";
  public obstructions: Array<SpecificObstructions> = [];
}

// Tests
describe("General", () => {
  it("should have correct data", function() {
    const msg = "Something happened!";
    const e = new errors.InternalServerError(msg);
    expect(e.name).toBe("InternalServerError");
    expect(e.message).toBe(msg);
    expect(e.status).toBe(500);
    expect(e.code).toBe("HTTP_INTERNAL_SERVER_ERROR");
  });

  it("should accept a subcode that is publicly accessible", function() {
    const e = new errors.InternalServerError("Test error!", "test");
    expect(e.subcode).toBe("test");
  });

  it("should allow us to attach and access obstructions", function() {
    const e = new errors.InternalServerError("Test error!", "test");
    expect(e.subcode).toBe("test");

    e.obstructions.push({
      code: "SomeObstruction",
      text: "There's something wrong with this thing.",
    });

    expect(1).toBe(e.obstructions.length);
    expect("SomeObstruction").toBe(e.obstructions[0].code);

    const o = [
      { code: "SomeObstruction", text: "Someting's wrong." },
      { code: "SomethingElse", text: "Other things are wrong." },
    ];
    e.obstructions = o;

    expect(2).toBe(e.obstructions.length);
    expect("SomethingElse").toBe(e.obstructions[1].code);
  });

  it("should handle specific typing of complex errors elegantly", () => {
    const e = new MySpecificError("Test error!", "test");

    // Shouldn't be allowed to do this. Uncomment to test:
    /*
    e.obstructions = [{
      code: "NotherThing",
      text: "Nother thing is wrong",
      params: {
        ourCountry: "US",
        theirCountry: "IT",
      }
    }];
    e.obstructions = [{
      code: "ObOne",
      text: "First thing is wrong",
      params: {
        nope: "not valid"
      }
    }];
     */

    // _Should_ be allowed to do this
    e.obstructions.push({
      code: "ObOne",
      text: "First thing is wrong",
      params: {
        country: "US",
      },
    });
    e.obstructions.push({
      code: "ObTwo",
      text: "Second thing is wrong",
      params: {
        cashRequired: 10,
        cashOnHand: 1,
      },
    });
    e.obstructions.push({
      code: "ObThree",
      text: "Third thing is wrong",
      params: {
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
      expect(ob.params).toBeDefined();
      expect("US").toBe(ob.params!.country);
    }
  });

  test(`should accept additional obstruction and header parameters on construct`, () => {
    const ob = { code: `test`, text: `fulltext` };
    const header = { "X-Test-Error": "true" };
    const e = new errors.BadRequest(`bad request`, `subcode`, [ob], header);

    expect(e.obstructions).toHaveLength(1);
    expect(e.obstructions[0]).toMatchObject(ob);
    expect(e.headers).toMatchObject(header);
    expect(e.message).toBe(`bad request`);
    expect(e.subcode).toBe(`subcode`);
  });

  test(`should allow specifying stricter obstructions`, () => {
    const ob = { code: `test`, text: `fulltext`, params: { one: 1, two: 2 } };
    const e = new errors.BadRequest<{ one: number; two: number } | { three: number; four: number }>(
      `bad request`,
      `subcode`,
      [ob]
    );
    expect(e.obstructions).toHaveLength(1);
    expect(e.obstructions[0]).toMatchObject(ob);
  });
});

describe("fromError static method", () => {
  const msg = "Test error";
  const error = new Error(msg);
  it("should instantiate whatever class it's used on", function() {
    let e: errors.HttpError = errors.InternalServerError.fromError(error);
    expect(e.name).toBe("InternalServerError");
    expect(e.message).toBe(msg);
    expect(e.status).toBe(500);
    expect(e.code).toBe("HTTP_INTERNAL_SERVER_ERROR");

    e = errors.BadGateway.fromError(error);
    expect(e.name).toBe("BadGateway");
    expect(e.message).toBe(msg);
    expect(e.status).toBe(502);
    expect(e.code).toBe("HTTP_BAD_GATEWAY");
  });
});

describe("withStatus static method", () => {
  it("should instantiate different errors according to the code provided", () => {
    const badreq = errors.HttpError.withStatus(400, "Bad request");
    expect(badreq.status).toBe(400);
    expect(badreq.name).toBe("BadRequest");
    expect(badreq.code).toBe("HTTP_BAD_REQUEST");
    expect(badreq.message).toBe("Bad request");

    const loop = errors.HttpError.withStatus(508, "Loop!");
    expect(loop.status).toBe(508);
    expect(loop.name).toBe("LoopDetected");
    expect(loop.code).toBe("HTTP_LOOP_DETECTED");
    expect(loop.message).toBe("Loop!");

    const custom = errors.HttpError.withStatus(555, "My custom error");
    expect(custom.status).toBe(555);
    expect(custom.name).toBe("Http555Error");
    expect(custom.code).toBe("HTTP_555_ERROR");
    expect(custom.message).toBe("My custom error");
  });
});

describe("isHttpError", () => {
  it("should typeguard correctly", function() {
    [new errors.InternalServerError("Test error"), new Error("Test error")].forEach(function(
      error
    ) {
      try {
        throw error;
      } catch (e) {
        if (!errors.isHttpError(e)) {
          e = errors.InternalServerError.fromError(e);
        }

        expect(e.name).toBe("InternalServerError");
        expect(e.status).toBe(500);
      }
    });
  });
});
