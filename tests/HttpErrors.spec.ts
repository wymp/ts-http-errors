import "mocha";
import { assert } from "chai";
import * as errors from "../src/index";

// This is a test typing for errors with specific obstructions
declare interface ObOne extends errors.ObstructionInterface<{ country: string; }> {
  code: "ObOne";
}
declare interface ObTwo extends errors.ObstructionInterface<{
  cashRequired: number;
  cashOnHand: number;
}> {
  code: "ObTwo";
}
declare interface ObThree extends errors.ObstructionInterface<{
  ourName: string;
  theirName: string;
}> {
  code: "ObThree";
}
declare type SpecificObstructions = ObOne|ObTwo|ObThree;
class MySpecificError extends errors.BadRequest {
  public readonly name: string = "MySpecificError";
  public obstructions: Array<SpecificObstructions> = [];
}






// Tests
describe("General", () => {
  it("should have correct data", function() {
    const msg = "Something happened!";
    const e = new errors.InternalServerError(msg);
    assert.equal("InternalServerError", e.name);
    assert.equal(msg, e.message);
    assert.equal(500, e.status);
    assert.equal("HTTP_INTERNAL_SERVER_ERROR", e.code);
  });

  it("should accept a subcode that is publicly accessible", function() {
    const e = new errors.InternalServerError("Test error!", "test");
    assert.equal("test", e.subcode);
  });

  it("should allow us to attach and access obstructions", function() {
    const e = new errors.InternalServerError("Test error!", "test");
    assert.equal("test", e.subcode);

    e.obstructions.push({
      code: "SomeObstruction",
      text: "There's something wrong with this thing."
    });

    assert.equal(e.obstructions.length, 1);
    assert.equal(e.obstructions[0].code, "SomeObstruction");

    const o = [
      { code: "SomeObstruction", text: "Someting's wrong." },
      { code: "SomethingElse", text: "Other things are wrong." },
    ];
    e.obstructions = o;

    assert.equal(e.obstructions.length, 2);
    assert.equal(e.obstructions[1].code, "SomethingElse");
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
        country: "US"
      }
    });
    e.obstructions.push({
      code: "ObTwo",
      text: "Second thing is wrong",
      params: {
        cashRequired: 10,
        cashOnHand: 1
      }
    });
    e.obstructions.push({
      code: "ObThree",
      text: "Third thing is wrong",
      params: {
        ourName: "us",
        theirName: "them",
      }
    });

    assert.equal("test", e.subcode);

    assert.equal(e.obstructions.length, 3);
    assert.equal(e.obstructions[0].code, "ObOne");

    // Type guard should work for diff-union
    const ob = e.obstructions[0];
    if (ob.code === "ObOne") {
      assert.ok(ob.params);
      assert.equal(ob.params!.country, "US");
    }
  });
});

describe("fromError static method", () => {
  const msg = "Test error";
  const error = new Error(msg);
  it("should instantiate whatever class it's used on", function() {
    let e: errors.HttpError = errors.InternalServerError.fromError(error);
    assert.equal("InternalServerError", e.name);
    assert.equal(msg, e.message);
    assert.equal(500, e.status);
    assert.equal("HTTP_INTERNAL_SERVER_ERROR", e.code);

    e = errors.BadGateway.fromError(error);
    assert.equal("BadGateway", e.name);
    assert.equal(msg, e.message);
    assert.equal(502, e.status);
    assert.equal("HTTP_BAD_GATEWAY", e.code);
  });
});

describe("isHttpError", () => {
  it("should typeguard correctly", function() {
    [ new errors.InternalServerError("Test error"), new Error("Test error") ].forEach(function(error) {
      try {
        throw error;
      } catch (e) {
        if (!errors.isHttpError(e)) {
          e = errors.InternalServerError.fromError(e);
        }

        assert.equal("InternalServerError", e.name);
        assert.equal(500, e.status);
      }
    });
  });
});

